import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";
import { Readable } from "stream";
import { config } from "@/lib/config";

export const runtime = "nodejs";
// Ensure the route is always evaluated on-demand — responses are proxied,
// never statically optimized.
export const dynamic = "force-dynamic";

const BACKEND = (process.env.BACKEND_URL ?? config.backendUrl).replace(/\/+$/, "");
const TENANT_HEADER = "X-Tenant-ID";
const BRANCH_HEADER = "X-Branch-ID";
const IDEMPOTENCY_HEADER = "X-Idempotency-Key";
const PUBLIC_APP_ORIGIN_HEADER = "X-Public-App-Origin";
const DEFAULT_UPSTREAM_TIMEOUT_MS = 60_000;
const configuredTimeoutMs = Number.parseInt(process.env.PROXY_UPSTREAM_TIMEOUT_MS ?? "", 10);
const UPSTREAM_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_UPSTREAM_TIMEOUT_MS;
const BUFFER_UPSTREAM_RESPONSES = process.env.PROXY_BUFFER_RESPONSES === "true";

// Reusable https agent that ignores self-signed certs in dev.
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

// Headers we pass through from upstream to the browser. Lower-case because
// Node exposes incoming header names in lower-case.
const FORWARDED_RESPONSE_HEADERS = [
    "content-type",
    "cache-control",
    "vary",
    "etag",
    "last-modified",
];
const NO_STORE_CACHE_CONTROL = "no-store, max-age=0, must-revalidate";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const target = new URL(`${BACKEND}/api/${path.join("/")}${req.nextUrl.search}`);
    const isHttps = target.protocol === "https:";
    const lib = isHttps ? https : http;
    const acceptedEncoding = req.headers.get("accept-encoding") || "identity";

    const headers: Record<string, string> = {
        "Accept-Encoding": BUFFER_UPSTREAM_RESPONSES ? "identity" : acceptedEncoding,
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const lang = req.headers.get("accept-language");
    if (lang) headers["Accept-Language"] = lang;
    const contentType = req.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const host = req.headers.get("host") || req.nextUrl.host;
    headers["X-Forwarded-Host"] = host;
    headers["X-Forwarded-Proto"] = req.nextUrl.protocol.replace(":", "");
    headers[PUBLIC_APP_ORIGIN_HEADER] = `${req.nextUrl.protocol}//${host}`;
    const tenantId = req.headers.get(TENANT_HEADER) || config.tenantId;
    if (tenantId) headers[TENANT_HEADER] = tenantId;
    const branchId = req.headers.get(BRANCH_HEADER);
    if (branchId) headers[BRANCH_HEADER] = branchId;
    const idempotencyKey = req.headers.get(IDEMPOTENCY_HEADER);
    if (idempotencyKey) headers[IDEMPOTENCY_HEADER] = idempotencyKey;

    const body = req.method !== "GET" && req.method !== "HEAD"
        ? Buffer.from(await req.arrayBuffer())
        : undefined;
    if (body) headers["Content-Length"] = String(body.length);

    return new Promise<NextResponse>((resolve) => {
        let settled = false;
        const finish = (response: NextResponse) => {
            if (settled) return;
            settled = true;
            resolve(response);
        };

        const options: http.RequestOptions = {
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: target.pathname + target.search,
            method: req.method,
            headers,
            agent: isHttps ? httpsAgent : httpAgent,
        };

        const upstream = lib.request(options, (upstreamRes) => {
            const status = upstreamRes.statusCode ?? 502;
            const outHeaders = new Headers();
            for (const name of FORWARDED_RESPONSE_HEADERS) {
                const value = upstreamRes.headers[name];
                if (typeof value === "string") outHeaders.set(name, value);
                else if (Array.isArray(value)) outHeaders.set(name, value.join(", "));
            }
            if (!BUFFER_UPSTREAM_RESPONSES) {
                const contentEncoding = upstreamRes.headers["content-encoding"];
                if (typeof contentEncoding === "string") {
                    outHeaders.set("content-encoding", contentEncoding);
                }
            }
            if (!outHeaders.has("content-type")) outHeaders.set("content-type", "application/json");
            outHeaders.set("cache-control", NO_STORE_CACHE_CONTROL);

            const isBodylessResponse =
                req.method === "HEAD"
                || status === 204
                || status === 205
                || status === 304;
            if (isBodylessResponse) {
                upstreamRes.resume();
                outHeaders.delete("content-encoding");
                outHeaders.delete("content-type");
                finish(new NextResponse(null, { status, headers: outHeaders }));
                return;
            }

            if (!BUFFER_UPSTREAM_RESPONSES) {
                const webStream = Readable.toWeb(upstreamRes) as unknown as ReadableStream<Uint8Array>;
                finish(new NextResponse(webStream, {
                    status,
                    headers: outHeaders,
                }));
                return;
            }

            const chunks: Buffer[] = [];
            upstreamRes.on("data", (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            upstreamRes.on("end", () => {
                const buffer = Buffer.concat(chunks);

                outHeaders.delete("content-encoding");
                outHeaders.delete("content-length");
                outHeaders.delete("transfer-encoding");

                finish(new NextResponse(buffer, {
                    status,
                    headers: outHeaders,
                }));
            });
        });

        upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
            upstream.destroy(new Error("Upstream request timed out"));
        });

        upstream.on("error", (err) => {
            finish(NextResponse.json(
                { error: "Upstream request failed", detail: err.message },
                { status: err.message === "Upstream request timed out" ? 504 : 502 },
            ));
        });

        if (body) upstream.write(body);
        upstream.end();
    });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
