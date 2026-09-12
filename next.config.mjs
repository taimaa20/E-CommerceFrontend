import withSerwistInit from "@serwist/next";

// -----------------------------------------------------------------
// PWA build pipeline (Serwist)
// -----------------------------------------------------------------
// Serwist wraps the Next build to:
//   1) compile app/sw.ts → public/sw.js with the content-hashed asset
//      manifest (so every hashed chunk is precached, not just warmed
//      on first visit),
//   2) inject route shells so cross-route navigation survives a dead
//      backend,
//   3) leave dev alone — HMR + SW caching is a debugging nightmare.
//
// ⚠️  Bundler coupling:
// `@serwist/next` only plugs into webpack today. Next.js 16 defaults
// to Turbopack for builds, so `package.json`'s build script passes
// `--webpack` to force the supported path. Migration path when
// Serwist's Turbopack support lands GA:
//
//   1) swap `@serwist/next` → `@serwist/turbopack`
//   2) drop `--webpack` from package.json
//   3) remove this note
//
// Track: https://github.com/serwist/serwist/issues/54
// -----------------------------------------------------------------
const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    // Dev mode: skip SW generation entirely. In prod: on.
    disable: process.env.NODE_ENV === "development",
    // Reload any open tabs when a new SW activates — a redeploy shouldn't
    // leave cashiers running week-old code.
    reloadOnOnline: true,
});

const noStoreHeaders = [
    { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
];

const stationRoutes = [
    "/admin",
    "/cashier",
    "/dinein",
    "/kitchen",
    "/login",
    "/ntxadminpos",
    "/ntxcashierpos",
    "/ntxdineinpos",
    "/ntxkitchenpos",
    "/ntxtakeawaypos",
    "/takeaway",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    reactCompiler: true,
    async headers() {
        return [
            { source: "/sw.js", headers: noStoreHeaders },
            ...stationRoutes.flatMap((source) => [
                { source, headers: noStoreHeaders },
                { source: `${source}/:path*`, headers: noStoreHeaders },
            ]),
        ];
    },
    // The public storefront moved from /menu to /shop. Old links keep working: every route
    // the store used to own is redirected permanently to its /shop equivalent.
    //
    // /menu is NOT retired — /menu/[tableId] is the dine-in QR menu and stays there. These
    // sources are therefore listed one by one rather than as a /menu/:path* wildcard, and
    // they are matched here (before filesystem routing) so /shop/all can never be mistaken
    // for a table id.
    async redirects() {
        const storefrontPaths = ["all", "categories", "offers", "orders", "checkout"];
        return [
            { source: "/menu", destination: "/shop", permanent: true },
            { source: "/menu/order", destination: "/shop", permanent: true },
            ...storefrontPaths.map((path) => ({
                source: `/menu/${path}`,
                destination: `/shop/${path}`,
                permanent: true,
            })),
            { source: "/menu/orders/:orderId", destination: "/shop/orders/:orderId", permanent: true },
            { source: "/menu/category/:categoryId", destination: "/shop/category/:categoryId", permanent: true },
            { source: "/menu/product/:productId", destination: "/shop/product/:productId", permanent: true },
        ];
    },
    async rewrites() {
        return [
            // Canonical "ntx*" POS URLs — rewrite to existing routes (non-breaking).
            { source: "/ntxadminpos", destination: "/admin" },
            { source: "/ntxadminpos/:path*", destination: "/admin/:path*" },
            { source: "/ntxcashierpos", destination: "/cashier" },
            { source: "/ntxcashierpos/:path*", destination: "/cashier/:path*" },
            { source: "/ntxkitchenpos", destination: "/kitchen" },
            { source: "/ntxkitchenpos/:path*", destination: "/kitchen/:path*" },
            { source: "/ntxtakeawaypos", destination: "/takeaway" },
            { source: "/ntxtakeawaypos/:path*", destination: "/takeaway/:path*" },
            { source: "/ntxdineinpos", destination: "/dinein" },
            { source: "/ntxdineinpos/:path*", destination: "/dinein/:path*" },

            // /system/* kept — alternate POS prefix.
            { source: "/system", destination: "/" },
            { source: "/system/:path*", destination: "/:path*" },
            // /app/* legacy alias.
            { source: "/app", destination: "/" },
            { source: "/app/:path*", destination: "/:path*" },
        ];
    },
};

export default withSerwist(nextConfig);
