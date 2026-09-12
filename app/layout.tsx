import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/components/locale-provider";
import { RTLProvider } from "@/components/rtl-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { NotificationProvider } from "@/components/notification-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SyncStatusBanner } from "@/components/sync-status-banner";

export const metadata: Metadata = {
  title: {
    default: "Retail POS",
    template: "%s | Retail POS",
  },
  description: "Responsive bilingual retail POS and management platform for tills, stock control, online orders, and back-office operations.",
  // PWA manifest — makes the app installable (Add to Home Screen on iOS/Android,
  // "Install" button on desktop Chrome/Edge) and pairs with the service worker
  // that precaches the route shells for offline navigation.
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/sandologo.jpg", type: "image/jpeg" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/sandologo.jpg",
    apple: "/sandologo.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches manifest.json theme_color so installed PWA chrome (Android status
  // bar, iOS notch background) blends with the POS brand.
  themeColor: "#E8651A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/jpeg" href="/sandologo.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/sandologo.jpg" />
        <link rel="apple-touch-icon" href="/sandologo.jpg" />
        <link
          rel="preload"
          href="/fonts/Biscuit Glitch.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/NotoSansArabic-VariableFont_wdth,wght.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Geist + Geist Mono — drives the dashboard design system typography.
            Display=swap so initial render uses system fallback until Geist arrives. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;550;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
        />
        {/* Apply persisted language/direction on first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var lang = localStorage.getItem('app_language') || 'en';
                  var rtl = ['ar','he','fa','ur'].includes(lang);
                  var dir = rtl ? 'rtl' : 'ltr';
                  document.documentElement.lang = lang;
                  document.documentElement.dir = dir;
                  document.documentElement.setAttribute('data-dir', dir);
                  /* Mirror to body once it exists so Radix portals
                     (rendered outside the React tree) inherit direction. */
                  if (document.body) { document.body.dir = dir; }
                } catch(e){}
              })();
            `,
          }}
        />
        {/* Anti-FOUC: generate full theme from cached primary color before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var raw = localStorage.getItem('pos-branding');
                  if (!raw) return;
                  var b = JSON.parse(raw);
                  var s = b && b.state ? b.state : b;
                  if (!s || !s.primaryColor) return;
                  var hex = s.primaryColor;
                  // Mini HSL conversion for full theme generation
                  function hexToRgb(h){var c=h.replace('#','');if(c.length===3)c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];var n=parseInt(c,16);return[(n>>16)&255,(n>>8)&255,n&255]}
                  function rgbToHex(r,g,b){return'#'+[r,g,b].map(function(v){return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')}).join('')}
                  function hexToHsl(h){var rgb=hexToRgb(h).map(function(v){return v/255});var mx=Math.max.apply(null,rgb),mn=Math.min.apply(null,rgb);var l=(mx+mn)/2;if(mx===mn)return[0,0,l*100];var d=mx-mn;var sat=l>0.5?d/(2-mx-mn):d/(mx+mn);var hu=0;if(mx===rgb[0])hu=((rgb[1]-rgb[2])/d+(rgb[1]<rgb[2]?6:0))/6;else if(mx===rgb[1])hu=((rgb[2]-rgb[0])/d+2)/6;else hu=((rgb[0]-rgb[1])/d+4)/6;return[Math.round(hu*360),Math.round(sat*100),Math.round(l*100)]}
                  function hslToHex(h,sat,l){var sn=sat/100,ln=l/100;var a=sn*Math.min(ln,1-ln);function f(n){var k=(n+h/30)%12;var c=ln-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(c*255)}return rgbToHex(f(0),f(8),f(4))}
                  function lum(h){var rgb=hexToRgb(h).map(function(c){var v=c/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]}
                  var hsl=hexToHsl(hex),h=hsl[0],sat=hsl[1];
                  var fg=lum(hex)<0.179?'#ffffff':'#000000';
                  var r=document.documentElement;
                  r.style.setProperty('--primary',hex);
                  r.style.setProperty('--primary-foreground',fg);
                  r.style.setProperty('--background',hslToHex(h,Math.min(sat,8),99));
                  r.style.setProperty('--foreground',hslToHex(h,5,10));
                  r.style.setProperty('--card',hslToHex(h,Math.min(sat,5),100));
                  r.style.setProperty('--card-foreground',hslToHex(h,5,10));
                  r.style.setProperty('--popover',hslToHex(h,Math.min(sat,5),100));
                  r.style.setProperty('--popover-foreground',hslToHex(h,5,10));
                  r.style.setProperty('--secondary',hslToHex(h,Math.min(sat,12),96));
                  r.style.setProperty('--secondary-foreground',hslToHex(h,5,18));
                  r.style.setProperty('--muted',hslToHex(h,Math.min(sat,12),96));
                  r.style.setProperty('--muted-foreground',hslToHex(h,5,45));
                  r.style.setProperty('--accent',hslToHex(h,Math.min(sat,15),95));
                  r.style.setProperty('--accent-foreground',hslToHex(h,5,18));
                  r.style.setProperty('--border',hslToHex(h,Math.min(sat,10),90));
                  r.style.setProperty('--input',hslToHex(h,Math.min(sat,10),90));
                  r.style.setProperty('--ring',hslToHex(h,Math.min(sat,40),50));
                  r.style.setProperty('--sidebar',hslToHex(h,Math.min(sat,8),98));
                  r.style.setProperty('--sidebar-foreground',hslToHex(h,5,10));
                  r.style.setProperty('--sidebar-primary',hex);
                  r.style.setProperty('--sidebar-primary-foreground',fg);
                  r.style.setProperty('--sidebar-accent',hslToHex(h,Math.min(sat,15),95));
                  r.style.setProperty('--sidebar-accent-foreground',hslToHex(h,5,18));
                  r.style.setProperty('--sidebar-border',hslToHex(h,Math.min(sat,10),90));
                  r.style.setProperty('--sidebar-ring',hslToHex(h,Math.min(sat,40),50));
                  r.style.setProperty('--chart-1',hex);
                  r.style.setProperty('--chart-2',hslToHex((h+72)%360,Math.min(sat,60),50));
                  r.style.setProperty('--chart-3',hslToHex((h+144)%360,Math.min(sat,55),55));
                  r.style.setProperty('--chart-4',hslToHex((h+216)%360,Math.min(sat,65),50));
                  r.style.setProperty('--chart-5',hslToHex((h+288)%360,Math.min(sat,60),55));
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-background text-foreground antialiased"
      >
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <LocaleProvider>
          <RTLProvider>
            <BrandingProvider>
              <SettingsProvider>
              <NotificationProvider>
              {children}
              {/* Global connectivity + offline-queue indicator. Hidden
                  when online and the queue is empty — zero noise during
                  normal service, clear signal when it matters. */}
              <SyncStatusBanner />
              <Toaster />
              </NotificationProvider>
              </SettingsProvider>
            </BrandingProvider>
          </RTLProvider>
        </LocaleProvider>
        {/* Registers /sw.js on mount (prod only). Rendering at the bottom of
            body ensures hydration is never blocked by SW install work. */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
