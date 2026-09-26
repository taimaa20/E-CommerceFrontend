import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { bffTrustHeaders, forwardedClientIp, isUpstreamForwardedForTrusted } from "@/lib/server/forwarded-client-ip";

/**
 * Web session layer for storefront customers.
 *
 * The backend customer auth API is token-based so native apps can use it directly. In a browser
 * the long-lived refresh token must not be readable by page scripts, so this route holds it in
 * an httpOnly cookie scoped to this path and hands the page only the short-lived access token.
 * The page keeps that access token in memory and calls `refresh` to get a new one.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_URL ?? config.backendUrl).replace(/\/+$/, "");
const REFRESH_COOKIE = "sf_customer_rt";
const COOKIE_PATH = "/api/customer-session";
const TENANT_HEADER = "X-Tenant-ID";
const FORWARDED_FOR_HEADER = "X-Forwarded-For";
// Opt-in per deployment: only where a reverse proxy in front of Next appends the client IP.
const TRUST_UPSTREAM_FORWARDED_FOR = isUpstreamForwardedForTrusted(process.env);

const BACKEND_ROUTES = {
    login: "/api/mobile/auth/sign-in",
    register: "/api/mobile/auth/sign-up",
    "verify-email": "/api/mobile/auth/verify-email",
    "resend-email-code": "/api/mobile/auth/resend-email-code",
    refresh: "/api/mobile/auth/refresh-token",
    logout: "/api/mobile/auth/sign-out",
} as const;
type SessionAction = keyof typeof BACKEND_ROUTES;

interface BackendSession {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
    customer: unknown;
    /** Sign-up only: the account exists but is waiting on an emailed code, so no session yet. */
    requiresEmailVerification?: boolean;
}

function isSessionAction(value: string): value is SessionAction {
    return Object.hasOwn(BACKEND_ROUTES, value);
}

/**
 * The refresh cookie is SameSite=Strict, and every action additionally requires a same-origin
 * `Origin` header, so another site cannot drive sign-in, refresh or sign-out on a shopper's behalf.
 */
function isSameOrigin(req: NextRequest): boolean {
    const origin = req.headers.get("origin");
    if (!origin) return false;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
        return !!host && new URL(origin).host === host;
    } catch {
        return false;
    }
}

function backendHeaders(req: NextRequest): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const tenantId = req.headers.get(TENANT_HEADER) || config.tenantId;
    if (tenantId) headers[TENANT_HEADER] = tenantId;
    const language = req.headers.get("accept-language");
    if (language) headers["Accept-Language"] = language;
    // Sign-in and refresh are rate-limited per client IP; forward the browser's, not ours.
    const clientIp = forwardedClientIp(req.headers.get(FORWARDED_FOR_HEADER), TRUST_UPSTREAM_FORWARDED_FOR);
    if (clientIp) headers[FORWARDED_FOR_HEADER] = clientIp;
    // Verified shopper IP for the backend's rate limiter (server-to-server proof; see helper).
    Object.assign(headers, bffTrustHeaders(req.headers.get(FORWARDED_FOR_HEADER), process.env));
    return headers;
}

async function callBackend(req: NextRequest, action: SessionAction, body: unknown): Promise<Response> {
    return fetch(`${BACKEND}${BACKEND_ROUTES[action]}`, {
        method: "POST",
        headers: backendHeaders(req),
        body: JSON.stringify(body),
        cache: "no-store",
    });
}

function setRefreshCookie(req: NextRequest, response: NextResponse, session: BackendSession) {
    const expires = new Date(session.refreshTokenExpiresAt);
    response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
        sameSite: "strict",
        path: COOKIE_PATH,
        expires: Number.isNaN(expires.getTime()) ? undefined : expires,
    });
}

function clearRefreshCookie(response: NextResponse) {
    response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "strict", path: COOKIE_PATH, maxAge: 0 });
}

/** Everything but the refresh token, which never leaves the server side of this route. */
function sessionResponse(req: NextRequest, session: BackendSession): NextResponse {
    const response = NextResponse.json({
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        customer: session.customer,
    });
    setRefreshCookie(req, response, session);
    return response;
}

async function passThroughError(upstream: Response): Promise<NextResponse> {
    const body = await upstream.json().catch(() => ({ message: "Request failed." }));
    return NextResponse.json(body, { status: upstream.status });
}

/**
 * Sign-in, sign-up and email verification all post credentials-shaped bodies and may come
 * back with a session. Sign-up is the one that may instead come back saying the account is
 * waiting on an emailed code — that answer carries no tokens, so no cookie is set and the
 * verification details are handed to the page as-is.
 */
async function handleCredentials(req: NextRequest, action: "login" | "register" | "verify-email"): Promise<NextResponse> {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    const upstream = await callBackend(req, action, body);
    if (!upstream.ok) return passThroughError(upstream);

    const session = await upstream.json() as BackendSession & Record<string, unknown>;
    if (session.requiresEmailVerification) return NextResponse.json(session);
    return sessionResponse(req, session);
}

/** No session involved — the backend answers with masked-email and timing details only. */
async function handlePassThrough(req: NextRequest, action: SessionAction): Promise<NextResponse> {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    const upstream = await callBackend(req, action, body);
    return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}

async function handleRefresh(req: NextRequest): Promise<NextResponse> {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return NextResponse.json({ message: "No session." }, { status: 401 });

    const upstream = await callBackend(req, "refresh", { refreshToken });
    if (upstream.ok) return sessionResponse(req, await upstream.json() as BackendSession);

    // Only a definitive rejection ends the session. A rate limit or an outage leaves the cookie
    // in place so the shopper is not signed out by a transient failure.
    const response = await passThroughError(upstream);
    if (upstream.status === 401) clearRefreshCookie(response);
    return response;
}

async function handleLogout(req: NextRequest): Promise<NextResponse> {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
        // Revocation is best effort: the cookie is removed regardless, so this browser is
        // signed out even when the backend cannot be reached.
        await callBackend(req, "logout", { refreshToken }).catch(() => undefined);
    }
    const response = new NextResponse(null, { status: 204 });
    clearRefreshCookie(response);
    return response;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
    const { action } = await params;
    if (!isSessionAction(action)) return NextResponse.json({ message: "Not found." }, { status: 404 });
    if (!isSameOrigin(req)) return NextResponse.json({ message: "Forbidden." }, { status: 403 });

    try {
        switch (action) {
            case "login":
            case "register":
            case "verify-email":
                return await handleCredentials(req, action);
            case "resend-email-code":
                return await handlePassThrough(req, action);
            case "refresh":
                return await handleRefresh(req);
            case "logout":
                return await handleLogout(req);
        }
    } catch {
        return NextResponse.json({ message: "Service unavailable." }, { status: 502 });
    }
}
