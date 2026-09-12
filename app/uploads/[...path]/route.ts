import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";
import { Readable } from "stream";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same-origin gateway for uploaded images. Image URLs are stored relative
// (/uploads/images/…) so no backend host is ever baked into the database;
// this route makes the frontend origin able to serve them in every
// environment (next dev, IIS behind its rewrite, Azure App Service).
// On IIS the web.config UploadsToBackend rule usually answers first — this
// handler is the fallback for hosts without a reverse-proxy rewrite.
const BACKEND = (process.env.BACKEND_URL ?? config.backendUrl).replace(/\/+$/, "");
const UPSTREAM_TIMEOUT_MS = 30_000;

// Mirrors the api-proxy agents: keep-alive, tolerate self-signed certs in dev.
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

const FORWARDED_RESPONSE_HEADERS = [
    "content-type",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
];

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const target = new URL(`${BACKEND}/uploads/${path.join("/")}`);
    const isHttps = target.protocol === "https:";
    const lib = isHttps ? https : http;

    return new Promise<NextResponse>((resolve) => {
        let settled = false;
        const finish = (response: NextResponse) => {
            if (settled) return;
            settled = true;
            resolve(response);
        };

        const upstream = lib.request(
            {
                hostname: target.hostname,
                port: target.port || (isHttps ? 443 : 80),
                path: target.pathname,
                method: req.method,
                agent: isHttps ? httpsAgent : httpAgent,
                headers: {
                    "Accept-Encoding": "identity",
                },
            },
            (upstreamRes) => {
                const status = upstreamRes.statusCode ?? 502;
                const outHeaders = new Headers();
                for (const name of FORWARDED_RESPONSE_HEADERS) {
                    const value = upstreamRes.headers[name];
                    if (typeof value === "string") outHeaders.set(name, value);
                }
                // Uploaded file names are content-unique (timestamp + GUID) —
                // mirror the backend's aggressive caching when it omits one.
                if (status === 200 && !outHeaders.has("cache-control")) {
                    outHeaders.set("cache-control", "public, max-age=31536000, immutable");
                }
                if (req.method === "HEAD" || status === 304) {
                    upstreamRes.resume();
                    finish(new NextResponse(null, { status, headers: outHeaders }));
                    return;
                }
                const webStream = Readable.toWeb(upstreamRes) as unknown as ReadableStream<Uint8Array>;
                finish(new NextResponse(webStream, { status, headers: outHeaders }));
            },
        );

        upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
            upstream.destroy(new Error("Upstream request timed out"));
        });
        upstream.on("error", () => {
            finish(new NextResponse(null, { status: 502 }));
        });
        upstream.end();
    });
}

export const GET = handler;
export const HEAD = handler;
