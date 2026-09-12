import { NextRequest, NextResponse } from "next/server";

// Fully public (no auth, never rewritten).
const PUBLIC_PREFIXES = [
    "/login",
  
    "/shop",
    "/menu",
    "/qrmenu",
    "/followus",
    "/payment",

    "/public-tracker",
    "/display",
    "/showcase",
];

// Any request hitting these requires a valid session cookie.
const PROTECTED_PREFIXES = [
    "/ntx",          // catches ntxadminpos / ntxcashierpos / ntxkitchenpos / ntxdineinpos / any future ntx* route
    "/system",
    "/app",
    "/admin",
    "/cashier",
    "/kitchen",
    "/bar",
    "/staff",
     "/tracker",
    "/takeaway",
    // /ntx prefix catches /ntxtakeawaypos via special matcher below
    "/orders",
    "/tables",
    "/mobile",
];

// Optional soft obfuscation key for /system/<key>/... — enable by setting env.
const SYSTEM_KEY = process.env.NEXT_PUBLIC_SYSTEM_KEY;

function hasSession(req: NextRequest): boolean {
    const token = req.cookies.get("auth_token")?.value;
    return !!token && token.length > 0;
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
    return prefixes.some((p) => {
        if (p === "/ntx") return pathname.startsWith("/ntx"); // any ntx* route
        return pathname === p || pathname.startsWith(p + "/");
    });
}

function isValidNtxPosRoute(pathname: string): boolean {
    return /^\/ntx.*pos(\/.*)?$/.test(pathname);
}

function renderNotFound(req: NextRequest): NextResponse {
    const url = req.nextUrl.clone();
    url.pathname = "/__middleware_not_found";
    url.search = "";
    return NextResponse.rewrite(url, { status: 404 });
}

function redirectToLogin(req: NextRequest, keepPath: boolean): NextResponse {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (keepPath) {
        loginUrl.searchParams.set("next", req.nextUrl.pathname + (req.nextUrl.search || ""));
    }
    return NextResponse.redirect(loginUrl);
}

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const authed = hasSession(req);

    // 1) Root is the retail storefront. Rewritten, not redirected, so the URL stays "/"
    //    and the change is a one-line revert. The legacy marketing site is still served
    //    at /website until the dead-code phase removes it.
    if (pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = "/shop";
        return NextResponse.rewrite(url);
    }

    // 2) Always-public paths
    if (matchesPrefix(pathname, PUBLIC_PREFIXES)) {
        return NextResponse.next();
    }

    // 3) /system/* optional obfuscation key
    if (SYSTEM_KEY && pathname.startsWith("/system/")) {
        const segments = pathname.split("/").filter(Boolean); // ["system", ...]
        if (segments[1] !== SYSTEM_KEY) {
            return renderNotFound(req);
        }
        // Strip the key segment so Next rewrites still resolve.
        const url = req.nextUrl.clone();
        url.pathname = "/system/" + segments.slice(2).join("/");
        if (!authed) return redirectToLogin(req, true);
        return NextResponse.rewrite(url);
    }

    // 4) Protected areas
    if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
        if (!isValidNtxPosRoute(pathname)) {
            return renderNotFound(req);
        }
        if (!authed) return redirectToLogin(req, true);
        return NextResponse.next();
    }

    // 5) Everything else — pass through
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|fonts|sandologo.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff|woff2|ttf)).*)",
    ],
};
