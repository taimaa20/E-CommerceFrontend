1:"$Sreact.fragment"
9:I[65704,[],""]
:HL["/_next/static/css/06460d7c9d557d7a.css","style"]
:HL["/fonts/Biscuit Glitch.woff2","font",{"crossOrigin":"anonymous","type":"font/woff2"}]
:HL["/fonts/NotoSansArabic-VariableFont_wdth,wght.woff2","font",{"crossOrigin":"anonymous","type":"font/woff2"}]
:HL["https://fonts.googleapis.com/css2?family=Geist:wght@400;500;550;600;700&family=Geist+Mono:wght@400;500;600&display=swap","style"]
2:T10be,
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
            0:{"P":null,"b":"I4mkMXLJN_Z3eEcncZyeq","c":["","admin","assets"],"q":"","i":false,"f":[[["",{"children":["admin",{"children":["assets",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",true],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/css/06460d7c9d557d7a.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]],["$","html",null,{"lang":"en","suppressHydrationWarning":true,"children":[["$","head",null,{"children":[["$","link",null,{"rel":"icon","type":"image/jpeg","href":"/sandologo.jpg"}],["$","link",null,{"rel":"shortcut icon","type":"image/jpeg","href":"/sandologo.jpg"}],["$","link",null,{"rel":"apple-touch-icon","href":"/sandologo.jpg"}],["$","link",null,{"rel":"preload","href":"/fonts/Biscuit Glitch.woff2","as":"font","type":"font/woff2","crossOrigin":"anonymous"}],["$","link",null,{"rel":"preload","href":"/fonts/NotoSansArabic-VariableFont_wdth,wght.woff2","as":"font","type":"font/woff2","crossOrigin":"anonymous"}],["$","link",null,{"rel":"preconnect","href":"https://fonts.googleapis.com"}],["$","link",null,{"rel":"preconnect","href":"https://fonts.gstatic.com","crossOrigin":"anonymous"}],["$","link",null,{"rel":"stylesheet","href":"https://fonts.googleapis.com/css2?family=Geist:wght@400;500;550;600;700&family=Geist+Mono:wght@400;500;600&display=swap"}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"\n              (function(){\n                try {\n                  var lang = localStorage.getItem('app_language') || 'en';\n                  var rtl = ['ar','he','fa','ur'].includes(lang);\n                  var dir = rtl ? 'rtl' : 'ltr';\n                  document.documentElement.lang = lang;\n                  document.documentElement.dir = dir;\n                  document.documentElement.setAttribute('data-dir', dir);\n                  /* Mirror to body once it exists so Radix portals\n                     (rendered outside the React tree) inherit direction. */\n                  if (document.body) { document.body.dir = dir; }\n                } catch(e){}\n              })();\n            "}}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$2"}}]]}],"$L3"]}]]}],{"children":["$L4",{"children":["$L5",{"children":["$L6",{},null,false,false]},null,false,false]},null,false,false]},["$L7",[],[]],false,false],"$L8",false]],"m":"$undefined","G":["$9",[]],"S":true}
a:"$Sreact.suspense"
b:I[32190,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"GoogleAnalytics"]
c:I[1016,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"LocaleProvider"]
d:I[69636,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"RTLProvider"]
e:I[97937,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"BrandingProvider"]
f:I[10159,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"SettingsProvider"]
10:I[29089,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"NotificationProvider"]
11:I[68172,[],""]
12:I[75909,["1713","static/chunks/1713-2ef6abcd84b84df6.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","8039","static/chunks/app/error-be3aeb2f41bcceb0.js"],"default"]
13:I[97210,[],""]
14:I[25927,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"SyncStatusBanner"]
15:I[92122,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"Toaster"]
16:I[87650,["9094","static/chunks/9094-c733b4c51c602454.js","452","static/chunks/452-3c3363ddfcd29b63.js","1566","static/chunks/1566-6921e47a8aae51fa.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","6285","static/chunks/6285-829e44653cdd758b.js","7012","static/chunks/7012-608251f4230f2f01.js","6967","static/chunks/6967-9d0f8f23aa03c841.js","7177","static/chunks/app/layout-49845d2880e0bd0d.js"],"ServiceWorkerRegister"]
17:I[47795,[],"ClientSegmentRoot"]
18:I[4241,["1713","static/chunks/1713-2ef6abcd84b84df6.js","5089","static/chunks/5089-8ee54c46b06be425.js","8495","static/chunks/8495-cf359bc003808440.js","3549","static/chunks/3549-3fb7154b9dab2e08.js","4393","static/chunks/4393-8b8c329b15288b83.js","3981","static/chunks/3981-dd4c36916bf3a02c.js","7282","static/chunks/7282-22f285f464936acd.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","3576","static/chunks/3576-3be35a030b0d9c03.js","7581","static/chunks/app/admin/layout-fa9124816024d6c3.js"],"default"]
1a:I[91113,[],"ClientPageRoot"]
1b:I[95356,["1713","static/chunks/1713-2ef6abcd84b84df6.js","3549","static/chunks/3549-3fb7154b9dab2e08.js","5444","static/chunks/5444-ff30d5958e7a00f9.js","8534","static/chunks/8534-bf9900064f4c9dd5.js","6017","static/chunks/6017-9346d71d5b1d17b7.js","5340","static/chunks/5340-db46a2aa2ba2c890.js","2073","static/chunks/2073-b9e7c18aa129a94d.js","6930","static/chunks/app/admin/assets/page-c3803a603aa03447.js"],"default"]
1e:I[78937,[],"OutletBoundary"]
20:I[78937,[],"ViewportBoundary"]
22:I[78937,[],"MetadataBoundary"]
3:["$","body",null,{"suppressHydrationWarning":true,"className":"bg-background text-foreground antialiased","children":[["$","$a",null,{"fallback":null,"children":["$","$Lb",null,{}]}],["$","$Lc",null,{"children":["$","$Ld",null,{"children":["$","$Le",null,{"children":["$","$Lf",null,{"children":["$","$L10",null,{"children":[["$","$L11",null,{"parallelRouterKey":"children","error":"$12","errorStyles":[],"errorScripts":[],"template":["$","$L13",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]],"forbidden":"$undefined","unauthorized":"$undefined"}],["$","$L14",null,{}],["$","$L15",null,{}]]}]}]}]}]}],["$","$L16",null,{}]]}]
4:["$","$1","c",{"children":[null,["$","$L17",null,{"Component":"$18","slots":{"children":["$","$L11",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L13",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]},"serverProvidedParams":{"params":{},"promises":["$@19"]}}]]}]
5:["$","$1","c",{"children":[null,["$","$L11",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L13",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
6:["$","$1","c",{"children":[["$","$L1a",null,{"Component":"$1b","serverProvidedParams":{"searchParams":{},"params":"$4:props:children:1:props:serverProvidedParams:params","promises":["$@1c","$@1d"]}}],null,["$","$L1e",null,{"children":["$","$a",null,{"name":"Next.MetadataOutlet","children":"$@1f"}]}]]}]
7:["$","main","l",{"className":"min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8","children":["$","div",null,{"className":"mx-auto flex max-w-7xl flex-col gap-6","children":[["$","div",null,{"className":"space-y-3","children":[["$","div",null,{"className":"h-8 w-48 animate-pulse rounded-full bg-muted"}],["$","div",null,{"className":"h-4 w-80 max-w-full animate-pulse rounded-full bg-muted/70"}]]}],["$","div",null,{"className":"grid gap-4 sm:grid-cols-2 xl:grid-cols-4","children":[["$","div","0",{"className":"h-32 animate-pulse rounded-2xl border border-border bg-card shadow-sm"}],["$","div","1",{"className":"h-32 animate-pulse rounded-2xl border border-border bg-card shadow-sm"}],["$","div","2",{"className":"h-32 animate-pulse rounded-2xl border border-border bg-card shadow-sm"}],["$","div","3",{"className":"h-32 animate-pulse rounded-2xl border border-border bg-card shadow-sm"}]]}],["$","div",null,{"className":"grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]","children":[["$","div",null,{"className":"h-[28rem] animate-pulse rounded-2xl border border-border bg-card shadow-sm"}],["$","div",null,{"className":"h-[28rem] animate-pulse rounded-2xl border border-border bg-card shadow-sm"}]]}]]}]}]
8:["$","$1","h",{"children":[null,["$","$L20",null,{"children":"$L21"}],["$","div",null,{"hidden":true,"children":["$","$L22",null,{"children":["$","$a",null,{"name":"Next.Metadata","children":"$L23"}]}]}],null]}]
19:"$4:props:children:1:props:serverProvidedParams:params"
1c:{}
1d:"$4:props:children:1:props:serverProvidedParams:params"
21:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, viewport-fit=cover"}],["$","meta","2",{"name":"theme-color","content":"#E8651A"}]]
24:I[20556,[],"IconMark"]
1f:null
23:[["$","title","0",{"children":"Restaurant POS"}],["$","meta","1",{"name":"description","content":"Responsive bilingual restaurant POS for tablets, cashier stations, kitchen screens, and admin operations."}],["$","link","2",{"rel":"manifest","href":"/manifest.json","crossOrigin":"$undefined"}],["$","link","3",{"rel":"shortcut icon","href":"/sandologo.jpg"}],["$","link","4",{"rel":"icon","href":"/sandologo.jpg","type":"image/jpeg"}],["$","link","5",{"rel":"icon","href":"/favicon.ico","sizes":"any"}],["$","link","6",{"rel":"apple-touch-icon","href":"/sandologo.jpg"}],["$","$L24","7",{}]]
