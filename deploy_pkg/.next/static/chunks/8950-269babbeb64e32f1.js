"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[8950],{13628:(e,t,r)=>{r.d(t,{C:()=>d,z:()=>o});var a=r(95155),s=r(19749);r(12115);var l=r(53500),i=r(64701),n=r(37570);function o(e){let t,r,i,o,d=(0,s.c)(8);return d[0]!==e?({className:t,...r}=e,d[0]=e,d[1]=t,d[2]=r):(t=d[1],r=d[2]),d[3]!==t?(i=(0,n.cn)("grid gap-3",t),d[3]=t,d[4]=i):i=d[4],d[5]!==r||d[6]!==i?(o=(0,a.jsx)(l.bL,{"data-slot":"radio-group",className:i,...r}),d[5]=r,d[6]=i,d[7]=o):o=d[7],o}function d(e){let t,r,o,d,c,m=(0,s.c)(9);return m[0]!==e?({className:t,...r}=e,m[0]=e,m[1]=t,m[2]=r):(t=m[1],r=m[2]),m[3]!==t?(o=(0,n.cn)("border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",t),m[3]=t,m[4]=o):o=m[4],m[5]===Symbol.for("react.memo_cache_sentinel")?(d=(0,a.jsx)(l.C1,{"data-slot":"radio-group-indicator",className:"relative flex items-center justify-center",children:(0,a.jsx)(i.A,{className:"fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"})}),m[5]=d):d=m[5],m[6]!==r||m[7]!==o?(c=(0,a.jsx)(l.q7,{"data-slot":"radio-group-item",className:o,...r,children:d}),m[6]=r,m[7]=o,m[8]=c):c=m[8],c}},26221:(e,t,r)=>{r.d(t,{A:()=>p});var a=r(95155),s=r(19749),l=r(94077),i=r(1016),n=r(58652);let o={description:"Description",noDescription:"No description available",calories:"Calories",calorieUnit:"kcal",noCalories:"Not specified",ingredients:"Ingredients",noIngredients:"No ingredients listed"},d={description:"الوصف",noDescription:"لا يوجد وصف",calories:"السعرات الحرارية",calorieUnit:"سعرة",noCalories:"غير محدد",ingredients:"المكونات",noIngredients:"لا توجد مكونات مسجلة"},c=e=>!1!==e.showInMenu;function m(e){let t,r,l,i,o=(0,s.c)(8),{calories:d,copy:c}=e;o[0]===Symbol.for("react.memo_cache_sentinel")?(t=(0,a.jsx)(n.A,{className:"h-4 w-4"}),o[0]=t):t=o[0],o[1]!==c.calories?(r=(0,a.jsxs)("div",{className:"mb-1 flex items-center gap-2 font-semibold",children:[t,c.calories]}),o[1]=c.calories,o[2]=r):r=o[2];let m=null!=d?`${d} ${c.calorieUnit}`:c.noCalories;return o[3]!==m?(l=(0,a.jsx)("div",{children:m}),o[3]=m,o[4]=l):l=o[4],o[5]!==r||o[6]!==l?(i=(0,a.jsxs)("div",{className:"rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800",children:[r,l]}),o[5]=r,o[6]=l,o[7]=i):i=o[7],i}function u(e){let t,r,l,i=(0,s.c)(9),{ingredients:n,locale:o,copy:d}=e;return i[0]!==d.ingredients?(t=(0,a.jsx)("h3",{className:"mb-2 text-sm font-semibold text-slate-800",children:d.ingredients}),i[0]=d.ingredients,i[1]=t):t=i[1],i[2]!==d.noIngredients||i[3]!==n||i[4]!==o?(r=n.length>0?(0,a.jsx)("div",{className:"flex flex-wrap gap-1.5",children:n.map(e=>(0,a.jsx)("span",{className:"rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700",children:"ar"===o&&e.rawMaterialNameAr?e.rawMaterialNameAr:e.rawMaterialName},e.id))}):(0,a.jsx)("p",{className:"text-sm text-slate-500",children:d.noIngredients}),i[2]=d.noIngredients,i[3]=n,i[4]=o,i[5]=r):r=i[5],i[6]!==t||i[7]!==r?(l=(0,a.jsxs)("div",{children:[t,r]}),i[6]=t,i[7]=r,i[8]=l):l=i[8],l}function p(e){let t,r,n,p,x,f,h=(0,s.c)(19),{product:b,open:g,onOpenChange:v}=e,{locale:y}=(0,i.Y)(),w="ar"===y?d:o;if(h[0]!==y||h[1]!==b)t=b?"ar"===y&&b.descriptionAr?b.descriptionAr:b.description:"",h[0]=y,h[1]=b,h[2]=t;else t=h[2];let N=t;h[3]!==b?.recipeItems?(r=b?.recipeItems??[],h[3]=b?.recipeItems,h[4]=r):r=h[4],h[5]!==r?(n=r.filter(c),h[5]=r,h[6]=n):n=h[6];let j=n;if(h[7]!==w||h[8]!==N||h[9]!==j||h[10]!==y||h[11]!==b)p=b&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(l.c7,{children:[(0,a.jsx)(l.L3,{className:"pe-8 text-xl leading-snug",children:"ar"===y&&b.nameAr?b.nameAr:b.displayName||b.name}),(0,a.jsx)(l.rr,{children:w.description})]}),(0,a.jsxs)("div",{className:"space-y-4",children:[(0,a.jsx)("p",{className:"text-sm leading-6 text-slate-600",children:N||w.noDescription}),(0,a.jsx)(m,{calories:b.calories,copy:w}),(0,a.jsx)(u,{ingredients:j,locale:y,copy:w})]})]}),h[7]=w,h[8]=N,h[9]=j,h[10]=y,h[11]=b,h[12]=p;else p=h[12];return h[13]!==p?(x=(0,a.jsx)(l.Cf,{className:"sm:max-w-md",children:p}),h[13]=p,h[14]=x):x=h[14],h[15]!==v||h[16]!==g||h[17]!==x?(f=(0,a.jsx)(l.lG,{open:g,onOpenChange:v,children:x}),h[15]=v,h[16]=g,h[17]=x,h[18]=f):f=h[18],f}},32976:(e,t,r)=>{function a(e){return"ar"===e?"ar-EG":"en-US"}function s(e){return e?e.slice(0,10):""}function l(e){return e?e.slice(0,5):""}function i(e,t){let[r,s]=e.split(":").map(Number);if(Number.isNaN(r)||Number.isNaN(s))return e;let l=new Date(2e3,0,1,r,s,0,0);return new Intl.DateTimeFormat(a(t),{hour:"numeric",minute:"2-digit"}).format(l)}function n(e,t){let[r,s,l]=e.split("-").map(Number);if(Number.isNaN(r)||Number.isNaN(s)||Number.isNaN(l))return e;let i=new Date(r,s-1,l);return new Intl.DateTimeFormat(a(t),{year:"numeric",month:"short",day:"numeric"}).format(i)}function o(e,t){let r=l(e.availableFrom),a=l(e.availableTo);if(r&&a){let e=i(r,t),s=i(a,t);return"ar"===t?`يوميًا ${e} - ${s}`:`Daily ${e} - ${s}`}if(r){let e=i(r,t);return"ar"===t?`يبدأ من ${e}`:`From ${e}`}if(a){let e=i(a,t);return"ar"===t?`حتى ${e}`:`Until ${e}`}return null}function d(e,t){let r=s(e.availableStartDate),a=s(e.availableEndDate);if(r&&a){let e=n(r,t),s=n(a,t);return`${e} - ${s}`}if(r){let e=n(r,t);return"ar"===t?`ابتداءً من ${e}`:`From ${e}`}if(a){let e=n(a,t);return"ar"===t?`حتى ${e}`:`Until ${e}`}return null}r.d(t,{XV:()=>d,mB:()=>o})},36392:(e,t,r)=>{function a(e){return e?.trim().toLowerCase()??""}function s(e,t){let r=a(t);if(!r)return{kind:"none",matches:[]};let s=e.filter(e=>a(e.retail?.barcode)===r),l=s.length>0?s:e.filter(e=>a(e.retail?.sku)===r);return 0===l.length?{kind:"none",matches:[]}:1===l.length?{kind:"single",matches:l}:{kind:"ambiguous",matches:l}}function l(e){let t=(e.options??[]).some(e=>e.isActive),r=(e.modifierGroups??[]).length>0,a=(e.recipeItems??[]).some(e=>(e.alternatives??[]).some(e=>e.isActive));return t||r||a}function i(e){return e.retail?e.retail.stockOnHand:null}r.d(t,{D2:()=>l,K8:()=>i,OF:()=>s})},40154:(e,t,r)=>{r.r(t),r.d(t,{buildReceiptBodyHtml:()=>w,getReceiptCss:()=>N,openReceiptPrintWindow:()=>y,printReceipt:()=>v});var a=r(44737),s=r(38221);function l(e){return e?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}r(80842);var i=r(82019),n=r(29094),o=r(74727),d=r(53937);function c(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function m(e,t){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:t||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(e)}catch{return`${t} ${e.toFixed(2)}`}}let u="pos:printed-receipts:v1";function p(e){return e.publicOrderNumber||e.orderNumber||e.id}function x(e){return`receipt:${p(e)}:paid:${(0,a.Rh)(e).toFixed(2)}`}function f(){let e=window.localStorage.getItem(u);if(!e)return{};try{return JSON.parse(e)}catch{return window.localStorage.removeItem(u),{}}}function h(e){let t=f();delete t[e],window.localStorage.setItem(u,JSON.stringify(t))}let b=`
:root {
  --receipt-paper-width: 80mm;
  --receipt-content-width: 64mm;
  --receipt-left-safe: 3mm;
  --receipt-amount-safe: 2mm;
}

* { margin: 0; padding: 0; box-sizing: border-box; word-break: break-word; }

body {
  font-family: Arial, Helvetica, 'Liberation Sans', sans-serif;
  font-size: 13px;
  font-weight: bold;
  background: #fff;
  color: #000;
  width: var(--receipt-paper-width);
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Force every element to print pure black, no grey antialiasing halos. */
* { color: #000 !important; }

.page-break { page-break-after: always; }

.receipt {
  width: var(--receipt-content-width);
  max-width: var(--receipt-content-width);
  margin-left: var(--receipt-left-safe);
  margin-right: auto;
  padding: 6px 2px 10px;
  box-sizing: border-box;
}

/* ── Header ── */
.header { text-align: center; margin-bottom: 6px; }
.logo { width: 140px; height: 140px; object-fit: contain; display: block; margin: 0 auto 6px; }
.rest-name {
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 0.5px;
  margin: 2px 0;
}
.rest-info { font-size: 10px; margin: 1px 0; }

/* ── Dividers ── */
.div-eq  { border: none; border-top: 1px solid #000; margin: 5px 0; }
.div-dash { border: none; border-top: 1px dashed #555; margin: 4px 0; }

/* ── Order meta ── */
.meta-table { width: 100%; border-collapse: collapse; margin: 3px 0; }
.meta-table td { font-size: 11px; padding: 1px 0; vertical-align: top; }
.meta-label { width: 38%; font-weight: bold; }
.meta-value {
  width: 62%;
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  font-size: 10px;
  direction: ltr;
  unicode-bidi: isolate;
}
.meta-value-address { white-space: pre-wrap; }

/* ── Items ── */
.items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.items-table th {
  font-size: 10px;
  text-transform: uppercase;
  border-bottom: 1px solid #000;
  padding: 2px 1px;
}
.th-name  { text-align: left;   width: 52%; }
.th-qty   { text-align: center; width: 9%; }
.th-price { text-align: right;  width: 39%; padding-right: var(--receipt-amount-safe); white-space: nowrap; }

.items-table td { padding: 2px 1px; vertical-align: top; }
.td-name  { width: 52%; }
.td-qty   { width: 9%; text-align: center; }
.td-price {
  width: 39%;
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  font-size: 12px;
  direction: ltr;
  unicode-bidi: isolate;
}

/* Item names */
.name-en { font-weight: bold; font-size: 12px; }
.name-ar {
  font-family: 'Arial', 'Tahoma', sans-serif;
  font-size: 13px;
  font-weight: bold;
  direction: rtl;
  display: block;
  text-align: right;
  color: #000;
}
.comp-badge { font-size: 9px; color: #555; font-style: italic; }

/* Modifiers */
.mod-row td { font-size: 11px; font-weight: bold; color: #000; }
.mod-name { padding-left: 10px; }
.mod-name-ar {
  font-family: 'Arial', 'Tahoma', sans-serif;
  font-size: 12px;
  font-weight: bold;
  direction: rtl;
  display: block;
  text-align: right;
  padding-right: 10px;
  color: #000;
}

/* Notes */
.notes-row td { font-size: 11px; font-weight: bold; font-style: italic; color: #000; padding-left: 10px; }

/* Offer block */
.offer-box {
  border: 1px dashed #555;
  padding: 5px 6px;
  margin: 5px 0;
}
.offer-title {
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.offer-subtitle {
  font-size: 9px;
  color: #333;
  margin-bottom: 4px;
}
.offer-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
}
.offer-item-copy {
  flex: 1;
  min-width: 0;
}
.offer-item-qty {
  white-space: nowrap;
  font-size: 10px;
  font-weight: bold;
}
.offer-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 2px 0 5px;
  margin-bottom: 4px;
  border-bottom: 1px dashed #777;
}
.offer-price-label {
  font-size: 10px;
  font-weight: bold;
}
.offer-price-value {
  font-size: 11px;
  font-weight: bold;
}

/* Summary rows */
.sum-row td { font-size: 11px; padding: 1px 0; }
.sum-label { text-align: left; }
.sum-value {
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
}
.discount-row td { color: #333; }

/* Total row */
.total-row td {
  font-size: 13px;
  font-weight: bold;
  border-top: 2px solid #000;
  padding-top: 3px;
  padding-bottom: 2px;
}
.total-label { text-align: left; }
.total-value {
  text-align: right;
  padding-right: var(--receipt-amount-safe);
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
}

/* Payment row */
.pay-row td { font-size: 11px; color: #222; padding: 1px 0; }

/* Footer */
.footer {
  text-align: center;
  font-family: 'Tahoma', Arial, sans-serif;
  font-size: 11px;
  margin-top: 8px;
  line-height: 1.4;
}

/* QR Menu */
.qr-section {
  text-align: center;
  margin-top: 8px;
  page-break-inside: avoid;
}
.qr-title {
  font-size: 11px;
  font-weight: bold;
  margin: 4px 0 2px;
}
.qr-image {
  width: 140px;
  height: 140px;
  display: block;
  margin: 4px auto;
}
.qr-url {
  font-size: 9px;
  color: #333;
  margin-top: 2px;
  word-break: break-all;
}

@media print {
  html, body { width: var(--receipt-paper-width); }
  @page { size: 80mm auto; margin: 0; }
  .page-break { page-break-after: always; }
}
`;function g(e,t,r,n,o,u,p=0,x=0,f,h,b,v){var y;let w,N="Takeaway"===e.orderType,j="Delivery"===e.orderType||"DELIVERY"===e.tableName,A="Talabat"===e.orderSource,$="DeliveryPartner"===e.orderSource,k=e.deliveryAddress??"",S=k.trim().length>0&&(j||A||$),C=e.deliveryPartnerName||e.deliveryPartnerCode||"Delivery Partner",P=$?"Delivery Partner / شريك توصيل":A?"Talabat / طلبات":j?e.deliveryZoneName||"Delivery / توصيل":N?"Takeaway / طلب خارجي":e.tableName||"—",I=(0,a.go)(e),q=(0,a.PX)(e),T=e.paymentMethod||q||"",O=q&&T&&q!==T?q:"",M=Array.from(new Set((e.payments??[]).map(e=>e.referenceNumber?.trim()).filter(e=>!!e))).join(" + "),D=A&&e.talabatPaymentMethod?`${"Cash"===e.talabatPaymentMethod?"Cash":"Prepaid"} / ${e.talabatPaymentMethod}`:"",_=$&&e.partnerPaymentMethod?e.partnerPaymentMethod:"",R=A?D||q:$?_||q:T,F=I.length?(0,a.Rh)(e):0,z=h?.trim()||e.customerName?.trim()||e.customerNameAr?.trim()||e.partnerCustomerName?.trim()||e.talabatCustomerName?.trim()||"",L=f?.trim()||e.customerPhone?.trim()||e.partnerCustomerPhone?.trim()||e.talabatCustomerPhone?.trim()||"",E=function(e,t){if(!e)return"";let r=new Date(e);return Number.isNaN(r.getTime())?"":(0,d.So)(r,t,"en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(e.talabatPickupTime,t.timeZoneId),U=(e.items??[]).reduce((e,t)=>e+(t.quantity??0),0),B=t.showLogoOnReceipt&&r?`<img src="${c(r)}" alt="logo" class="logo" />`:"",V=`
        <div class="header">
            ${B}
            ${t.restaurantAddress?`<div class="rest-info">${c(t.restaurantAddress)}</div>`:""}
            ${t.restaurantPhone?`<div class="rest-info">Tel: ${c(t.restaurantPhone)}</div>`:""}
            ${t.taxNumber?`<div class="rest-info">Tax No: ${c(t.taxNumber)}</div>`:""}
        </div>
    `,G=(0,i.v)(e),Q=`
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order</td>
                <td class="meta-value">${c(G??`#${e.orderNumber.slice(-4)}`)}</td>
            </tr>
            ${G?`
            <tr>
                <td class="meta-label">System ID</td>
                <td class="meta-value">${c(e.orderNumber)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">${$||A?"Source / المصدر":j?"Delivery Area / منطقة التوصيل":N?"Type":"Table"}</td>
                <td class="meta-value">${c(P)}</td>
            </tr>
            ${S?`
            <tr>
                <td class="meta-label">Address / العنوان</td>
                <td class="meta-value meta-value-address">${c(k)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${(y=t.timeZoneId,(0,d.UD)(new Date,y,"en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0}))}</td>
            </tr>
            ${A&&e.talabatOrderNumber?`
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${c(e.talabatOrderNumber)}</td>
            </tr>`:""}
            ${$?`
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${c(C)}</td>
            </tr>`:""}
            ${$&&e.partnerOrderNumber?`
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${c(e.partnerOrderNumber)}</td>
            </tr>`:""}
            ${A&&E?`
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${c(E)}</td>
            </tr>`:""}
            ${A&&U>0?`
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${U}</td>
            </tr>`:""}
            ${R?`
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${c(R)}</td>
            </tr>`:""}
            ${O&&!A&&!$?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${c(O)}</td>
            </tr>`:""}
            ${M?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${c(M)}</td>
            </tr>`:""}
            ${z?`
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${c(z)}</td>
            </tr>`:""}
            ${L?`
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${c(L)}</td>
            </tr>`:""}
        </table>
    `,{offerCoveredTotal:J,visibleItems:K}=function(e){let t=e.items?.find(e=>e.isOfferBundle);if(t)return{offerCoveredTotal:t.lineTotalAmount??0,visibleItems:e.items?.filter(e=>!e.isOfferBundle)??[]};let r=new Map;for(let t of e.offerProducts||[])r.set(t.productId,(r.get(t.productId)??0)+t.quantity);let a=0,s=[];for(let t of e.items||[]){let e=t.quantity??0,l=t.lineTotalAmount??0,i=e>0?l/e:0,n=!!t.notes||(t.modifiers?.length??0)>0,o=t.productId??"",d=0;if(!n&&o){let t=r.get(o)??0;t>0&&(d=Math.min(t,e),r.set(o,t-d))}d>0&&(a+=i*d);let c=e-d;c>0&&s.push({...t,quantity:c,lineTotalAmount:t.isComplimentary?0:Number((i*c).toFixed(2))})}return{offerCoveredTotal:Number(a.toFixed(2)),visibleItems:s}}(e),Y=e.offerId&&(e.offerName||e.offerNameAr||(e.offerProducts?.length??0)>0)?`
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${e.offerName?`<span class="name-en">${c(e.offerName)}</span>`:""}
            ${e.offerNameAr?`<span class="name-ar">${c(e.offerNameAr)}</span>`:""}
            ${J>0?`
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${m(J,u)}</span>
                </div>
            `:""}
            ${(e.offerProducts||[]).map(e=>`
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${e.name?`<span class="name-en">${c(e.name)}</span>`:""}
                        ${e.nameAr?`<span class="name-ar">${c(e.nameAr)}</span>`:""}
                    </div>
                    <div class="offer-item-qty">x${e.quantity}</div>
                </div>
            `).join("")}
        </div>
    `:"",H="";for(let e of K){let t=e.productName||"",r=o.find(t=>t.id===e.productId)?.nameAr??"",a=e.quantity??1,s=e.isComplimentary?0:e.lineTotalAmount??0;for(let l of(H+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${c(t)}</span>
                    ${r?`<span class="name-ar">${c(r)}</span>`:""}
                    ${e.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${a}</td>
                <td class="td-price">${e.isComplimentary?"—":m(s,u)}</td>
            </tr>
        `,e.selectedOptionName&&(H+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${c(e.selectedOptionName)}
                        ${e.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${c(e.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),e.modifiers||[])){if(!l.modifierName)continue;let e=(l.price??0)*(l.quantity??1);H+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${c(l.modifierName)}
                        ${l.modifierNameAr?`<span class="mod-name-ar">+ ${c(l.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${e>0?m(e,u):""}</td>
                </tr>
            `}for(let t of e.recipeSnapshot||[]){if(!t.sourceAlternativeId)continue;let e=t.sourceAlternativeName||t.rawMaterialName||"",r=t.sourceAlternativeNameAr||t.rawMaterialNameAr||"";(e||r)&&(H+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${c(e)}
                        ${r?`<span class="mod-name-ar">↪ ${c(r)}</span>`:""}
                    </td>
                </tr>
            `)}e.notes&&(H+=`
                <tr class="notes-row">
                    <td colspan="3">Note: ${c(e.notes)}</td>
                </tr>
            `)}let X=e.subtotal&&e.subtotal>0?e.subtotal:(e.items||[]).reduce((e,t)=>e+(t.lineTotalAmount??0),0),Z=e.discountAmount&&e.discountAmount>0?e.discountAmount:X*((e.discountPercentage??0)/100),W=Math.round(100*Z)/100,ee=(e.serviceChargeRate??0)>0?e.serviceChargeRate:p,et=(e.taxRate??0)>0?e.taxRate:x,er=e.discountType??(e.discountPercentage>0?"Percentage":null),ea=e.discountValue??e.discountPercentage??0,es=e.discountGroupType??0,el=e.discountGroupValue??0,ei=(0,s.rb)(X,er,ea,ee,et,el,es),en=e.discountGroupAmount&&e.discountGroupAmount>0?Math.round(100*e.discountGroupAmount)/100:ei.discountGroupAmount,eo=X-W-en,ed=e.serviceChargeAmount&&e.serviceChargeAmount>0?e.serviceChargeAmount:ei.serviceChargeAmount,ec=e.taxAmount&&e.taxAmount>0?e.taxAmount:ei.taxAmount,em=Math.max(0,Math.round((e.deliveryFee??0)*100)/100),eu=Math.max(0,Math.round((e.talabatDeliveryFee??0)*100)/100),ep=Math.max(0,Math.round((e.talabatServiceFee??0)*100)/100),ex=Math.max(0,Math.round((e.partnerDeliveryFee??0)*100)/100),ef=Math.max(0,Math.round((e.partnerServiceFee??0)*100)/100),eh=Math.round((eo+ed+ec+em+eu+ep+ex+ef)*100)/100,eb=!0===e.isVoucherApplied?Math.max(0,Math.round((e.voucherDiscountAmount??0)*100)/100):0,eg=Math.round(100*Math.max(0,eh-eb))/100,ev=`
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${m(X,u)}</td>
        </tr>
    `;if(Z>0&&(ev+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${"Percentage"===er?`${ea}%`:m(ea,u)})</td>
                <td class="sum-value">-${m(Z,u)}</td>
            </tr>
        `),en>0){let t=0===es?` (${el}%)`:"",r=e.discountGroupName?`${e.discountGroupName}${t}`:`Group Discount / خصم الفئة${t}`;ev+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">${r}</td>
                <td class="sum-value">-${m(en,u)}</td>
            </tr>
        `}ed>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${ee}%)</td>
                <td class="sum-value">${m(ed,u)}</td>
            </tr>
        `),!1!==t.showTaxOnReceipt&&ec>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${et}%)</td>
                <td class="sum-value">${m(ec,u)}</td>
            </tr>
        `),em>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${m(em,u)}</td>
            </tr>
        `),eu>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${m(eu,u)}</td>
            </tr>
        `),ep>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${m(ep,u)}</td>
            </tr>
        `),ex>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${m(ex,u)}</td>
            </tr>
        `),ef>0&&(ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${m(ef,u)}</td>
            </tr>
        `),eb>0&&(ev+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${m(eb,u)}</td>
            </tr>
        `),ev+=`
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${m(eg,u)}</td>
        </tr>
    `,I.length>0&&(ev+=I.map(e=>`
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${c(e.method)}</td>
                <td class="sum-value">${m(e.amount,u)}</td>
            </tr>
        `).join(""),ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${m(F,u)}</td>
            </tr>
        `);let ey=b??e.amountTendered,ew=v??e.changeAmount;if(null!=ey&&ey>0){ev+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${m(ey,u)}</td>
            </tr>
        `;let e=ew??Math.max(0,ey-eg);ev+=`
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${m(e,u)}</td>
            </tr>
        `}let eN=t.receiptFooterNote?`<hr class="div-eq" /><div class="footer">${c(t.receiptFooterNote)}</div>`:"",ej=function(e){let t=l(e.googleReviewUrl);if(t)return{url:t,title:"Scan to Review / امسح للتقييم",alt:"Review QR"};let r=l(e.qrMenuUrl);return r?{url:r,title:"Scan for Menu / امسح للقائمة",alt:"Menu QR"}:null}(t),eA=ej?`
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${c(ej.title)}</div>
                    <img class="qr-image"
                         src="${c((w=new URLSearchParams({size:"512x512",data:ej.url,ecc:"M",qzone:"4",format:"png"}),`https://api.qrserver.com/v1/create-qr-code/?${w.toString()}`))}"
                         alt="${c(ej.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `:"";return`
        <div class="receipt">
            ${V}
            <hr class="div-eq" />
            ${Q}
            <hr class="div-eq" />
            ${Y}
            ${Y?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${H}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${ev}
                </tbody>
            </table>

            ${eN}
            ${eA}
            <div style="height: 30px"></div>
        </div>
    `}function v(e){var t,a;let{order:s,settings:l,logoUrl:d,businessName:m,products:b=[],currency:v=l.currency||"USD",storeServiceChargeRate:y=0,storeTaxRate:w=0,customerPhone:N,customerName:j,amountTendered:A,changeAmount:$,targetWindow:k,forceReprint:S}=e,C=function(e,t){let r=t?`${x(e)}:reprint:${Date.now()}`:x(e);if(t)return{reserved:!0,id:r};let a=f();return a[r]?{reserved:!1,id:r}:(a[r]=Date.now(),window.localStorage.setItem(u,JSON.stringify(a)),{reserved:!0,id:r})}(s,S);if(!C.reserved){if(k&&!k.closed)try{k.close()}catch{}return}let P={...e,receiptTransactionId:C.id};if(k&&!k.closed)try{k.close()}catch{}let I=Math.max(1,Math.min(l.receiptCopies??1,5)),q=[];for(let e=0;e<I;e++){let t=e===I-1;q.push(g(s,l,d,m,b,v,y,w,N,j,A,$)+(t?"":'<div class="page-break"></div>'))}t=q,a=s,c((0,i.v)(a)??`#${a.orderNumber.slice(-4)}`),t.join("\n"),(async()=>{try{let{printReceiptViaHtml:e}=await r.e(7247).then(r.bind(r,97247));if(!await e(P)){h(C.id),n.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,o.iv)({id:C.id,orderId:s.id,publicOrderNumber:p(s),transactionId:C.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(e){h(C.id),console.error("printReceipt html path failed:",e),n.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function y(){return window.open("","_blank","width=460,height=700,scrollbars=yes,resizable=yes")}function w(e){let{order:t,settings:r,logoUrl:a,businessName:s,products:l=[],currency:i=r.currency||"USD",storeServiceChargeRate:n=0,storeTaxRate:o=0,customerPhone:d,customerName:c,amountTendered:m,changeAmount:u}=e,p=Math.max(1,Math.min(r.receiptCopies??1,5)),x=[];for(let e=0;e<p;e++){let f=e===p-1;x.push(g(t,r,a,s,l,i,n,o,d,c,m,u)+(f?"":'<div class="page-break"></div>'))}return x.join("\n")}function N(){return b}},45827:(e,t,r)=>{r.d(t,{T:()=>i});var a=r(95155),s=r(19749);r(12115);var l=r(37570);function i(e){let t,r,i,n,o=(0,s.c)(8);return o[0]!==e?({className:t,...r}=e,o[0]=e,o[1]=t,o[2]=r):(t=o[1],r=o[2]),o[3]!==t?(i=(0,l.cn)("border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-24 w-full rounded-md border bg-transparent px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",t),o[3]=t,o[4]=i):i=o[4],o[5]!==r||o[6]!==i?(n=(0,a.jsx)("textarea",{"data-slot":"textarea",className:i,...r}),o[5]=r,o[6]=i,o[7]=n):n=o[7],n}},49035:(e,t,r)=>{function a(e){let t=new Set;for(let r of e)null!=r.offerLineOfferId&&t.add(r.offerLineOfferId);let r=[];for(let a of t){let t=e.filter(e=>e.offerLineOfferId===a),s=Number(t.reduce((e,t)=>e+(t.isComplimentary?0:t.totalPrice),0).toFixed(2));r.push({offerId:a,items:t,offerTotal:s})}return{offerGroups:r,regularItems:e.filter(e=>null==e.offerLineOfferId)}}function s(e){let t=(e.items??[]).filter(e=>e.isOfferBundle);if(t.length>0){let r=t.reduce((e,t)=>e+(t.lineTotalAmount??0),0);return{offerBundles:t,offerCoveredTotal:Number(r.toFixed(2)),regularItems:e.items?.filter(e=>!e.isOfferBundle)??[]}}if(!e.offerId)return{offerBundles:[],offerCoveredTotal:0,regularItems:e.items??[]};let r=new Map;for(let t of e.offerProducts||[])r.set(t.productId,(r.get(t.productId)??0)+t.quantity);let a=0,s=[];for(let t of e.items||[]){let e=t.quantity??0,l=t.lineTotalAmount??0,i=e>0?l/e:0,n=!!t.notes||(t.modifiers?.length??0)>0,o=t.productId??"",d=0;if(!n&&o){let t=r.get(o)??0;t>0&&(d=Math.min(t,e),r.set(o,t-d))}d>0&&(a+=i*d);let c=e-d;c>0&&s.push({...t,quantity:c,lineTotalAmount:t.isComplimentary?0:Number((i*c).toFixed(2))})}return 0===a&&s.length>0&&(e.items?.length??0)>0?{offerBundles:[],offerCoveredTotal:Number((e.items??[]).reduce((e,t)=>e+(t.lineTotalAmount??0),0).toFixed(2)),regularItems:[]}:{offerBundles:[],offerCoveredTotal:Number(a.toFixed(2)),regularItems:s}}function l(e,t){return e.map(e=>{let r="ar"===t?e.nameAr||e.name:e.name||e.nameAr;return`${e.quantity}\xd7 ${r}`}).join(" • ")}r.d(t,{L4:()=>l,gW:()=>s,mh:()=>a})},53964:(e,t,r)=>{r.d(t,{A:()=>f});var a=r(95155),s=r(12115),l=r(1016),i=r(80842),n=r(52014),o=r(58079),d=r(42601),c=r(29094),m=r(82019),u=r(59564),p=r(6056),x=r(42630);function f({order:e,cancelItemId:t,cancelItemName:r,onClose:f,onSuccess:h,currency:b="JOD"}){let{t:g,locale:v}=(0,l.Y)(),y=!!t,[w,N]=(0,s.useState)([]),[j,A]=(0,s.useState)(""),[$,k]=(0,s.useState)(""),[S,C]=(0,s.useState)(!1),[P,I]=(0,s.useState)(null),[q,T]=(0,s.useState)(!0),O=(0,s.useRef)(null),M=(0,s.useRef)(null),D=(0,s.useRef)(null);(0,s.useEffect)(()=>{(0,i.Eik)().then(e=>{N(e),T(!1)})},[]),(0,s.useEffect)(()=>{M.current?.focus()},[q]),(0,s.useEffect)(()=>{let e=e=>{"Escape"===e.key&&f()};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[f]);let _=w.find(e=>e.code===j)?.requiresNote??!1,R=async()=>{if(!j)return void I(g("cancelOrderErrorReasonRequired"));if(_&&$.trim().length<5)return void I(g("cancelOrderErrorNoteRequired"));I(null),C(!0);let r=!1,a=!1,s=null;try{let l={cancelReason:j,cancelReasonNote:_?$.trim():void 0,mode:"KITCHEN"},n=JSON.stringify({orderId:e.id,itemId:t??null,...l});D.current?.fingerprint!==n&&(D.current={fingerprint:n,key:await (0,u.ls)()});let o=D.current.key;y||"online"===(0,x.bt)()?s=y?await (0,i.OJb)(e.id,t,l,o):await (0,i.N4m)(e.id,l,o):(await (0,p.A5)(e.id,{cancelReason:j,cancelReasonNote:_?$.trim():void 0,mode:"KITCHEN"}),s={cancelLogId:o,requiresKitchenApproval:!0,approvalStatus:"Pending",orderCancelled:!0}),a=!1===s.requiresKitchenApproval,r=!0}catch(e){I(function(e,t){if(!e||"object"!=typeof e)return t;let r=e.response?.data;if(r&&"object"==typeof r&&"message"in r){let e=r.message;if("string"==typeof e)return e}return"string"==typeof r?r:"string"==typeof e.message?e.message:t}(e,g("cancelOrderErrorGeneric")))}finally{C(!1)}r&&s&&(a?c.toast.success("ar"===v?"تم الإلغاء وتسجيله كهدر (الطلب جاهز)":"Cancelled and logged as waste (order Ready)"):c.toast.success("ar"===v?"تم إرسال طلب الإلغاء لموافقة الإدارة":"Cancellation request sent for admin approval"),await h(s),f())};return(0,a.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4","aria-modal":"true",role:"dialog","aria-labelledby":"cancel-modal-title",children:(0,a.jsxs)("div",{ref:O,className:"w-full max-w-lg rounded-2xl bg-white shadow-2xl",dir:"ar"===v?"rtl":"ltr",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between border-b border-slate-200 px-6 py-4",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)(n.A,{className:"h-5 w-5 text-red-500"}),(0,a.jsxs)("h2",{id:"cancel-modal-title",className:"text-lg font-semibold text-slate-900",children:[g("cancelOrderModalTitle")," — ",(0,m.v)(e)??`#${e.orderNumber}`]})]}),(0,a.jsx)("button",{onClick:f,"aria-label":"Close",className:"rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",disabled:S,children:(0,a.jsx)(o.A,{className:"h-5 w-5"})})]}),(0,a.jsx)("div",{className:"border-b border-slate-100 bg-slate-50 px-6 py-3",children:y?(0,a.jsxs)("p",{className:"text-sm text-slate-600",children:[g("cancelOrderButtonItem"),": ",(0,a.jsx)("span",{className:"font-medium text-slate-800",children:r})]}):(0,a.jsxs)("div",{className:"space-y-1",children:[e.tableName&&(0,a.jsx)("p",{className:"text-xs text-slate-500",children:e.tableName}),(0,a.jsx)("div",{className:"max-h-28 overflow-y-auto",children:e.items.map(e=>(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-700",children:[(0,a.jsxs)("span",{children:[e.productName," \xd7 ",e.quantity]}),(0,a.jsxs)("span",{children:[(e.price*e.quantity).toFixed(2)," ",b]})]},e.id))}),(0,a.jsxs)("div",{className:"flex justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-800",children:[(0,a.jsx)("span",{children:"Total"}),(0,a.jsxs)("span",{children:[e.totalAmount.toFixed(2)," ",b]})]})]})}),(0,a.jsxs)("div",{className:"space-y-4 px-6 py-5",children:[y&&(0,a.jsx)("div",{className:"rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900",children:"ar"===v?"سيتم إرسال طلب إلغاء الصنف إلى الإدارة للموافقة قبل تغيير الطلب.":"This item cancellation will be sent to Admin for approval before the order is changed."}),(0,a.jsxs)("div",{children:[(0,a.jsxs)("label",{className:"mb-1.5 block text-sm font-medium text-slate-700",children:[g("cancelOrderReasonLabel")," ",(0,a.jsx)("span",{className:"text-red-500",children:"*"})]}),q?(0,a.jsxs)("div",{className:"flex h-10 items-center gap-2 text-slate-400 text-sm",children:[(0,a.jsx)(d.A,{className:"h-4 w-4 animate-spin"}),g("loadingText")]}):(0,a.jsxs)("select",{ref:M,value:j,onChange:e=>{A(e.target.value),k(""),I(null)},disabled:S,"aria-label":g("cancelOrderReasonLabel"),className:"w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60",children:[(0,a.jsx)("option",{value:"",children:g("cancelOrderReasonPlaceholder")}),w.map(e=>(0,a.jsx)("option",{value:e.code,children:"ar"===v?e.nameAr:e.name},e.id))]})]}),_&&(0,a.jsxs)("div",{children:[(0,a.jsxs)("label",{className:"mb-1.5 block text-sm font-medium text-slate-700",children:[g("cancelOrderNoteLabel")," ",(0,a.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,a.jsx)("textarea",{value:$,onChange:e=>{k(e.target.value),I(null)},disabled:S,placeholder:g("cancelOrderNotePlaceholder"),maxLength:500,rows:3,"aria-label":g("cancelOrderNoteLabel"),className:"w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"}),(0,a.jsxs)("p",{className:`mt-1 text-xs ${$.trim().length<5?"text-amber-600":"text-slate-400"}`,children:[$.trim().length,"/500"]})]}),P&&(0,a.jsx)("div",{className:"rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700",role:"alert",children:P})]}),(0,a.jsxs)("div",{className:"flex gap-3 border-t border-slate-200 px-6 py-4",children:[(0,a.jsxs)("button",{onClick:R,disabled:S||!j||q,"aria-busy":S,className:"flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60",children:[S&&(0,a.jsx)(d.A,{className:"h-4 w-4 animate-spin"}),"ar"===v?"إرسال للموافقة":"Send for Approval"]}),(0,a.jsx)("button",{onClick:f,disabled:S,className:"rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60",children:g("cancelOrderGoBack")})]})]})})}},58577:(e,t,r)=>{function a(e){return e?e.slice(0,10):""}function s(e){return e?e.slice(0,5):""}function l(e){return e&&5===e.length?`${e}:00`:e}function i(e){return`${s(e.startTime)} - ${s(e.endTime)}`}function n(e){return e.discountedPrice??e.basePrice}function o(e,t){let r=e.products.map(e=>{let r=t.find(t=>t.id===e.productId);return r?{product:r,quantity:e.quantity}:null}).filter(e=>!!e),a=r.reduce((e,t)=>e+n(t.product)*t.quantity,0),s=0;return r.map((t,l)=>{let i=n(t.product)*t.quantity,o=l===r.length-1?e.finalPrice-s:Number((i/Math.max(a,1)*e.finalPrice).toFixed(2));return s+=o,{product:{...t.product,discountedPrice:t.quantity>0?o/t.quantity:o},quantity:t.quantity}})}function d(e,t,r){let a=e.reduce((e,t)=>e+t.price*t.quantity,0),s=Number(Math.max(0===t?r:a*(1-r/100),0).toFixed(2)),l=Number(Math.max(a-s,0).toFixed(2));return{originalTotal:Number(a.toFixed(2)),finalPrice:s,savings:l}}r.d(t,{$s:()=>s,Hc:()=>o,YP:()=>n,gU:()=>a,h4:()=>d,iI:()=>i,ll:()=>l}),r(32226)},60276:(e,t,r)=>{r.d(t,{Dl:()=>o,Fx:()=>n,No:()=>i});var a=r(50775);function s(e){return"https:"===window.location.protocol&&"localhost"!==e&&"127.0.0.1"!==e&&"::1"!==e}function l(e){return function(e){let t=e?.trim();if(!t)return null;let r=(0,a.R)(t);try{let e=new URL(r);return"http:"===e.protocol&&s(e.hostname)&&(e.protocol="https:"),`${e.origin}${e.pathname.slice(0,e.pathname.lastIndexOf("/"))}`}catch{let e=r.lastIndexOf("/");return e>0?r.slice(0,e):null}}(e)??"/uploads/images"}function i(e,t,r="medium"){if(e&&e.length>0)return`${l(t)}/${e}-${r}.webp`;if(t&&t.length>0){let e=(0,a.R)(t);try{let t=new URL(e);return"http:"===t.protocol&&s(t.hostname)&&(t.protocol="https:"),t.toString()}catch{return e}}return null}function n(e,t){if(!e||0===e.length)return;let r=`${l(t)}/${e}`;return`${r}-thumb.webp 200w, ${r}-medium.webp 600w, ${r}-full.webp 1600w`}function o(e,t,r="medium"){let a=i(e,t,r);return a?{src:a,srcSet:n(e,t)}:null}},69817:(e,t,r)=>{r.d(t,{c:()=>L});var a=r(95155),s=r(19749),l=r(12115),i=r(1016);let n="__all__",o=e=>e?.trim().toLowerCase()??"";function d(e,t,r){let a=o(t);return e.filter(e=>(r===n||(e.categoryId??"__uncategorized__")===r)&&(!a||[e.name,e.nameAr,e.displayName,e.description,e.descriptionAr,e.categoryName,e.categoryNameAr,e.categoryDisplayName,e.retail?.sku,e.retail?.barcode,e.retail?.brand].some(e=>o(e).includes(a))))}var c=r(99483),m=r(73981),u=r(54371),p=r(1737),x=r(47606),f=r(32226),h=r(58577);let b=(0,l.memo)(function(e){let t,r,l,i,n,o,d,c,x,b,g,v,y,w,N,j,A,$,k,S,C,P,I,q,T,O=(0,s.c)(76),{currency:M,disabled:D,isAr:_,offer:R,onSelectOffer:F}=e,z=Math.max(0,R.originalTotal-R.finalPrice),L=R.imageUrl||"/offer-placeholder.svg",E=D||!R.isAvailableNow;if(O[0]!==_||O[1]!==R)t=_?R.nameAr||R.name:R.name||R.nameAr,O[0]=_,O[1]=R,O[2]=t;else t=O[2];let U=t;if(O[3]!==_||O[4]!==R)r=_?R.descriptionAr||R.description:R.description||R.descriptionAr,O[3]=_,O[4]=R,O[5]=r;else r=O[5];let B=r,V=_?"غير متاح الآن":"Not available now";O[6]!==E||O[7]!==R||O[8]!==F?(l=()=>{E||F(R)},O[6]=E,O[7]=R,O[8]=F,O[9]=l):l=O[9];let G=l,Q=`group relative flex min-h-36 overflow-hidden rounded-lg border bg-white text-start shadow-xs transition ${E?"cursor-not-allowed border-slate-200":"border-amber-200 hover:border-amber-300 hover:shadow-md active:scale-[0.99]"}`;if(O[10]!==L||O[11]!==U?(i=(0,a.jsx)("div",{className:"relative w-32 shrink-0 bg-slate-100 sm:w-36",children:(0,a.jsx)(m.default,{src:L,alt:U,fill:!0,unoptimized:!0,sizes:"9rem",className:"object-cover transition duration-300 group-hover:scale-105"})}),O[10]=L,O[11]=U,O[12]=i):i=O[12],O[13]!==U?(n=(0,a.jsx)("div",{className:"line-clamp-1 text-sm font-bold text-slate-900",children:U}),O[13]=U,O[14]=n):n=O[14],O[15]!==B?(o=B&&(0,a.jsx)("div",{className:"mt-1 line-clamp-1 text-xs text-slate-500",children:B}),O[15]=B,O[16]=o):o=O[16],O[17]!==n||O[18]!==o?(d=(0,a.jsxs)("div",{className:"min-w-0",children:[n,o]}),O[17]=n,O[18]=o,O[19]=d):d=O[19],O[20]===Symbol.for("react.memo_cache_sentinel")?(c=(0,a.jsx)(u.A,{className:"h-4 w-4 shrink-0 text-amber-600"}),O[20]=c):c=O[20],O[21]!==d?(x=(0,a.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[d,c]}),O[21]=d,O[22]=x):x=O[22],O[23]!==_||O[24]!==R.id||O[25]!==R.products){let e;O[27]!==_||O[28]!==R.id?(e=e=>(0,a.jsxs)("span",{className:"rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700",children:[_?e.nameAr||e.name:e.name||e.nameAr," \xd7 ",e.quantity]},`${R.id}-${e.productId}`),O[27]=_,O[28]=R.id,O[29]=e):e=O[29],b=R.products.slice(0,2).map(e),O[23]=_,O[24]=R.id,O[25]=R.products,O[26]=b}else b=O[26];return O[30]!==R.products.length?(g=R.products.length>2&&(0,a.jsxs)("span",{className:"rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500",children:["+",R.products.length-2]}),O[30]=R.products.length,O[31]=g):g=O[31],O[32]!==b||O[33]!==g?(v=(0,a.jsxs)("div",{className:"mt-2 flex flex-wrap gap-1.5",children:[b,g]}),O[32]=b,O[33]=g,O[34]=v):v=O[34],O[35]!==M||O[36]!==R.finalPrice||O[37]!==R.originalTotal?(y=R.originalTotal>R.finalPrice&&(0,a.jsx)("div",{className:"text-[11px] font-medium text-slate-400 line-through",children:(0,f.vv)(R.originalTotal,M)}),O[35]=M,O[36]=R.finalPrice,O[37]=R.originalTotal,O[38]=y):y=O[38],O[39]!==M||O[40]!==R.finalPrice?(w=(0,f.vv)(R.finalPrice,M),O[39]=M,O[40]=R.finalPrice,O[41]=w):w=O[41],O[42]!==w?(N=(0,a.jsx)("div",{className:"text-lg font-bold text-success",children:w}),O[42]=w,O[43]=N):N=O[43],O[44]!==y||O[45]!==N?(j=(0,a.jsxs)("div",{children:[y,N]}),O[44]=y,O[45]=N,O[46]=j):j=O[46],O[47]!==M||O[48]!==_||O[49]!==z?(A=z>0&&(0,a.jsxs)("div",{className:"mb-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700",children:[_?"وفر":"Save"," ",(0,f.vv)(z,M)]}),O[47]=M,O[48]=_,O[49]=z,O[50]=A):A=O[50],O[51]===Symbol.for("react.memo_cache_sentinel")?($=(0,a.jsx)(p.A,{className:"h-3 w-3"}),O[51]=$):$=O[51],O[52]!==R?(k=(0,h.iI)(R),O[52]=R,O[53]=k):k=O[53],O[54]!==k?(S=(0,a.jsxs)("div",{className:"inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-amber-200",children:[$,k]}),O[54]=k,O[55]=S):S=O[55],O[56]!==A||O[57]!==S?(C=(0,a.jsxs)("div",{className:"text-end",children:[A,S]}),O[56]=A,O[57]=S,O[58]=C):C=O[58],O[59]!==j||O[60]!==C?(P=(0,a.jsxs)("div",{className:"mt-auto flex items-end justify-between gap-3 pt-3",children:[j,C]}),O[59]=j,O[60]=C,O[61]=P):P=O[61],O[62]!==x||O[63]!==v||O[64]!==P?(I=(0,a.jsxs)("div",{className:"flex min-w-0 flex-1 flex-col p-3",children:[x,v,P]}),O[62]=x,O[63]=v,O[64]=P,O[65]=I):I=O[65],O[66]!==R.isAvailableNow||O[67]!==V?(q=!R.isAvailableNow&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("div",{className:"absolute inset-0 bg-white/25","aria-hidden":"true"}),(0,a.jsx)("div",{className:"absolute end-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm",children:V})]}),O[66]=R.isAvailableNow,O[67]=V,O[68]=q):q=O[68],O[69]!==G||O[70]!==E||O[71]!==I||O[72]!==q||O[73]!==Q||O[74]!==i?(T=(0,a.jsxs)("button",{type:"button",disabled:E,onClick:G,className:Q,children:[i,I,q]}),O[69]=G,O[70]=E,O[71]=I,O[72]=q,O[73]=Q,O[74]=i,O[75]=T):T=O[75],T});function g(e){let t,r,l,n,o,d,c,m=(0,s.c)(25),{currency:p,offers:f,onSelectOffer:h,disabled:g}=e,v=void 0!==g&&g,{locale:y}=(0,i.Y)(),w="ar"===y;if(0===f.length)return null;m[0]===Symbol.for("react.memo_cache_sentinel")?(t=(0,a.jsx)(u.A,{className:"h-4 w-4 text-amber-600"}),m[0]=t):t=m[0];let N=w?"العروض":"Offers";m[1]!==N?(r=(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[t,(0,a.jsx)("h2",{className:"text-base font-bold text-slate-900",children:N})]}),m[1]=N,m[2]=r):r=m[2];let j=w?"عرض":`offer${1===f.length?"":"s"}`;if(m[3]!==f.length||m[4]!==j?(l=(0,a.jsxs)(x.E,{className:"bg-emerald-100 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100",children:[f.length," ",j]}),m[3]=f.length,m[4]=j,m[5]=l):l=m[5],m[6]!==r||m[7]!==l?(n=(0,a.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[r,l]}),m[6]=r,m[7]=l,m[8]=n):n=m[8],m[9]!==p||m[10]!==v||m[11]!==w||m[12]!==f||m[13]!==h){let e;m[15]!==p||m[16]!==v||m[17]!==w||m[18]!==h?(e=e=>(0,a.jsx)(b,{offer:e,currency:p,disabled:v,isAr:w,onSelectOffer:h},e.id),m[15]=p,m[16]=v,m[17]=w,m[18]=h,m[19]=e):e=m[19],o=f.map(e),m[9]=p,m[10]=v,m[11]=w,m[12]=f,m[13]=h,m[14]=o}else o=m[14];return m[20]!==o?(d=(0,a.jsx)("div",{className:"grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3",children:o}),m[20]=o,m[21]=d):d=m[21],m[22]!==n||m[23]!==d?(c=(0,a.jsxs)("section",{className:"mb-4 space-y-3",children:[n,d]}),m[22]=n,m[23]=d,m[24]=c):c=m[24],c}var v=r(36392),y=r(37570);function w(e){let t,r,l,i,n,o=(0,s.c)(16),{count:d,id:c,label:m,selected:u,variant:p}=e,x=void 0===p?"default":p;o[0]!==u||o[1]!==x?(t=((e,t="default")=>(0,y.cn)("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",e&&"offer"===t?"border-amber-500 bg-amber-500 text-white shadow-sm":e?"border-primary bg-primary text-primary-foreground shadow-sm":"offer"===t?"border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100":"border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5"))(u,x),o[0]=u,o[1]=x,o[2]=t):t=o[2],o[3]!==m?(r=(0,a.jsx)("span",{className:"max-w-36 truncate",children:m}),o[3]=m,o[4]=r):r=o[4];let f=u?"bg-white/20 text-primary-foreground":"bg-slate-100 text-slate-500";return o[5]!==f?(l=(0,y.cn)("rounded-full px-1.5 py-0.5 text-[11px] leading-none",f),o[5]=f,o[6]=l):l=o[6],o[7]!==d||o[8]!==l?(i=(0,a.jsx)("span",{className:l,children:d}),o[7]=d,o[8]=l,o[9]=i):i=o[9],o[10]!==c||o[11]!==u||o[12]!==t||o[13]!==r||o[14]!==i?(n=(0,a.jsxs)("button",{type:"button",role:"tab","aria-selected":u,"data-category-id":c,className:t,children:[r,i]}),o[10]=c,o[11]=u,o[12]=t,o[13]=r,o[14]=i,o[15]=n):n=o[15],n}let N=(0,l.memo)(function(e){let t,r,l,i,o=(0,s.c)(15),{allLabel:d,categories:c,selectedCategory:m,totalCount:u,onCategoryChange:p}=e;o[0]!==p?(t=e=>{let t=e.target.closest("button[data-category-id]"),r=t?.dataset.categoryId;r&&p(r)},o[0]=p,o[1]=t):t=o[1];let x=t,f=m===n;if(o[2]!==d||o[3]!==f||o[4]!==u?(r=(0,a.jsx)(w,{id:n,label:d,count:u,selected:f}),o[2]=d,o[3]=f,o[4]=u,o[5]=r):r=o[5],o[6]!==c||o[7]!==m){let e;o[9]!==m?(e=e=>(0,a.jsx)(w,{id:e.id,label:e.label,count:e.count,selected:m===e.id,variant:e.variant},e.id),o[9]=m,o[10]=e):e=o[10],l=c.map(e),o[6]=c,o[7]=m,o[8]=l}else l=o[8];return o[11]!==x||o[12]!==r||o[13]!==l?(i=(0,a.jsxs)("div",{role:"tablist","aria-label":"Product categories",onClick:x,className:"flex min-w-0 gap-2 overflow-x-auto pb-1",children:[r,l]}),o[11]=x,o[12]=r,o[13]=l,o[14]=i):i=o[14],i});var j=r(81705),A=r(36399),$=r(58652),k=r(99487),S=r(32976),C=r(60276);function P(e){return e.isActive}let I=(0,l.memo)(function(e){let t,r,l,i,n,o,d,c,m,u,p,x,h,b,g,w,N,I,q,T,O,M,D,_,R,F=(0,s.c)(92),{currency:z,disabled:L,index:E,labels:U,locale:B,product:V,onProductSelect:G,onProductQuickView:Q}=e,J="ar"===B,K=V.displayPrice??V.discountedPrice??V.basePrice,Y=null==V.displayPrice&&!!V.discountedPrice&&V.discountedPrice<V.basePrice,H=!!(V.allergens&&V.allergens>0);F[0]!==V.options?(t=V.options?.filter(P).length??0,F[0]=V.options,F[1]=t):t=F[1];let X=t,Z=L||!V.isAvailableNow,W=E<12,ee=J&&V.nameAr?V.nameAr:V.displayName||V.name;F[2]!==J||F[3]!==V?(r=(0,S.mB)(V,J?"ar":"en")||(0,S.XV)(V,J?"ar":"en"),F[2]=J,F[3]=V,F[4]=r):r=F[4];let et=r;F[5]!==V.imageKey||F[6]!==V.imageUrl?(l=(0,C.Dl)(V.imageKey,V.imageUrl,"medium"),F[5]=V.imageKey,F[6]=V.imageUrl,F[7]=l):l=F[7];let er=l,ea=(0,v.K8)(V),es=null!==ea,el=es&&ea<=0,ei=es&&!el&&"Ok"!==V.retail.stockStatus,en=V.retail?.sku;F[8]!==Z||F[9]!==G||F[10]!==V?(i=()=>{Z||G(V)},F[8]=Z,F[9]=G,F[10]=V,F[11]=i):i=F[11];let eo=i;F[12]!==eo?(n=e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),eo())},F[12]=eo,F[13]=n):n=F[13];let ed=n;F[14]!==Q||F[15]!==V?(o=e=>{e.stopPropagation(),Q(V)},F[14]=Q,F[15]=V,F[16]=o):o=F[16];let ec=o,em=Z?-1:0,eu=Z?"cursor-not-allowed opacity-50":"cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.98]",ep=!Z&&el&&"opacity-60";F[17]!==eu||F[18]!==ep?(d=(0,y.cn)("group relative min-h-[13rem] overflow-hidden border-slate-200 py-0 transition duration-100",eu,ep),F[17]=eu,F[18]=ep,F[19]=d):d=F[19],F[20]!==Y?(c=Y&&(0,a.jsx)("div",{className:"absolute start-2 top-2 z-10 rounded-md bg-destructive px-2 py-1 text-[11px] font-bold text-white shadow",children:"SALE"}),F[20]=Y,F[21]=c):c=F[21],F[22]!==H?(m=H&&(0,a.jsx)("div",{className:"absolute end-2 top-2 z-10 rounded-full bg-warning px-2 py-1 text-[11px] font-bold text-warning-foreground shadow",children:"!"}),F[22]=H,F[23]=m):m=F[23];let ex=U.quickView,ef=U.quickView,eh=H?"top-11":"top-2";F[24]!==eh?(u=(0,y.cn)("absolute end-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white hover:text-primary",eh),F[24]=eh,F[25]=u):u=F[25],F[26]===Symbol.for("react.memo_cache_sentinel")?(p=(0,a.jsx)(j.A,{className:"h-4 w-4"}),F[26]=p):p=F[26],F[27]!==ec||F[28]!==U.quickView||F[29]!==u?(x=(0,a.jsx)("button",{type:"button","aria-label":ex,title:ef,onClick:ec,className:u,children:p}),F[27]=ec,F[28]=U.quickView,F[29]=u,F[30]=x):x=F[30],F[31]!==U.unavailable||F[32]!==V.isAvailableNow?(h=!V.isAvailableNow&&(0,a.jsx)("div",{className:"absolute start-2 top-11 z-10 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow",children:U.unavailable}),F[31]=U.unavailable,F[32]=V.isAvailableNow,F[33]=h):h=F[33],F[34]!==el||F[35]!==U.outOfStock?(b=el&&(0,a.jsx)("div",{className:"absolute start-2 bottom-2 z-10 rounded-md bg-slate-800/90 px-2 py-1 text-[10px] font-bold text-white shadow",children:U.outOfStock}),F[34]=el,F[35]=U.outOfStock,F[36]=b):b=F[36],F[37]!==ee||F[38]!==er||F[39]!==W?(g=er?(0,a.jsx)("div",{className:"h-32 w-full overflow-hidden bg-slate-100",children:(0,a.jsx)("img",{src:er.src,srcSet:er.srcSet,sizes:"(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 17vw",alt:ee,className:"h-full w-full object-cover transition duration-300 group-hover:scale-105",loading:W?"eager":"lazy",decoding:"async",fetchPriority:W?"high":"low"})}):(0,a.jsx)("div",{className:"flex h-32 w-full items-center justify-center bg-slate-100 text-slate-300",children:(0,a.jsx)(A.A,{className:"h-10 w-10"})}),F[37]=ee,F[38]=er,F[39]=W,F[40]=g):g=F[40],F[41]!==ee?(w=(0,a.jsx)(k.ZB,{className:"line-clamp-2 min-h-10 text-center text-sm font-bold leading-5 text-slate-800",children:ee}),F[41]=ee,F[42]=w):w=F[42],F[43]!==en?(N=en&&(0,a.jsx)("div",{className:"text-center font-mono text-[10px] leading-4 text-slate-400",title:en,children:en}),F[43]=en,F[44]=N):N=F[44],F[45]!==w||F[46]!==N?(I=(0,a.jsxs)(k.aR,{className:"p-3 pb-1",children:[w,N]}),F[45]=w,F[46]=N,F[47]=I):I=F[47],F[48]!==z||F[49]!==Y||F[50]!==V.basePrice?(q=Y&&(0,a.jsx)("div",{className:"text-xs font-medium text-slate-400 line-through",children:(0,f.vv)(V.basePrice,z)}),F[48]=z,F[49]=Y,F[50]=V.basePrice,F[51]=q):q=F[51];let eb=Y?"text-destructive":"text-success";return F[52]!==eb?(T=(0,y.cn)("text-lg font-bold",eb),F[52]=eb,F[53]=T):T=F[53],F[54]!==z||F[55]!==K?(O=(0,f.vv)(K,z),F[54]=z,F[55]=K,F[56]=O):O=F[56],F[57]!==T||F[58]!==O?(M=(0,a.jsx)("div",{className:T,children:O}),F[57]=T,F[58]=O,F[59]=M):M=F[59],F[60]!==X||F[61]!==et||F[62]!==H||F[63]!==ei||F[64]!==el||F[65]!==es||F[66]!==U.containsAllergens||F[67]!==U.inStock||F[68]!==U.lowStock||F[69]!==U.options||F[70]!==V.calories||F[71]!==V.isAvailableNow||F[72]!==ea?(D=(es||null!=V.calories||X>0||H||!V.isAvailableNow&&et)&&(0,a.jsxs)("div",{className:"flex min-h-5 flex-wrap justify-center gap-1",children:[es&&!el&&(0,a.jsxs)("span",{className:(0,y.cn)("rounded-full px-1.5 py-0.5 text-[10px] font-semibold",ei?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"),children:[ei?U.lowStock:U.inStock," \xb7 ",ea]}),null!=V.calories&&(0,a.jsxs)("span",{className:"inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700",children:[(0,a.jsx)($.A,{className:"h-3 w-3"}),V.calories]}),X>0&&(0,a.jsx)("span",{className:"rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary",children:U.options}),H&&(0,a.jsx)("span",{className:"rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning",children:U.containsAllergens}),!V.isAvailableNow&&et&&(0,a.jsx)("span",{className:"line-clamp-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700",children:et})]}),F[60]=X,F[61]=et,F[62]=H,F[63]=ei,F[64]=el,F[65]=es,F[66]=U.containsAllergens,F[67]=U.inStock,F[68]=U.lowStock,F[69]=U.options,F[70]=V.calories,F[71]=V.isAvailableNow,F[72]=ea,F[73]=D):D=F[73],F[74]!==q||F[75]!==M||F[76]!==D?(_=(0,a.jsxs)(k.Wu,{className:"space-y-1 px-3 pb-3 pt-0 text-center",children:[q,M,D]}),F[74]=q,F[75]=M,F[76]=D,F[77]=_):_=F[77],F[78]!==ed||F[79]!==eo||F[80]!==Z||F[81]!==d||F[82]!==c||F[83]!==m||F[84]!==x||F[85]!==h||F[86]!==b||F[87]!==g||F[88]!==I||F[89]!==_||F[90]!==em?(R=(0,a.jsxs)(k.Zp,{role:"button",tabIndex:em,"aria-disabled":Z,onClick:eo,onKeyDown:ed,className:d,children:[c,m,x,h,b,g,I,_]}),F[78]=ed,F[79]=eo,F[80]=Z,F[81]=d,F[82]=c,F[83]=m,F[84]=x,F[85]=h,F[86]=b,F[87]=g,F[88]=I,F[89]=_,F[90]=em,F[91]=R):R=F[91],R}),q=(0,l.memo)(function(e){let t,r,l=(0,s.c)(19),{currency:i,disabled:n,emptyLabel:o,labels:d,locale:c,products:m,onProductSelect:u,onProductQuickView:p}=e;if(0===m.length){let e;return l[0]!==o?(e=(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:o}),l[0]=o,l[1]=e):e=l[1],e}if(l[2]!==i||l[3]!==n||l[4]!==d||l[5]!==c||l[6]!==p||l[7]!==u||l[8]!==m){let e;l[10]!==i||l[11]!==n||l[12]!==d||l[13]!==c||l[14]!==p||l[15]!==u?(e=(e,t)=>(0,a.jsx)(I,{product:e,index:t,currency:i,locale:c,labels:d,disabled:n,onProductSelect:u,onProductQuickView:p},e.id),l[10]=i,l[11]=n,l[12]=d,l[13]=c,l[14]=p,l[15]=u,l[16]=e):e=l[16],t=m.map(e),l[2]=i,l[3]=n,l[4]=d,l[5]=c,l[6]=p,l[7]=u,l[8]=m,l[9]=t}else t=l[9];return l[17]!==t?(r=(0,a.jsx)("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 [@media(min-width:1800px)]:grid-cols-6",children:t}),l[17]=t,l[18]=r):r=l[18],r});var T=r(40757),O=r(58079),M=r(34819);let D=(0,l.memo)(function(e){let t,r,i,n,o,d,c,m,u,p=(0,s.c)(22),{value:x,placeholder:f,onChange:h,onSubmit:b,autoFocus:g}=e,v=(0,l.useRef)(null);p[0]!==g?(t=()=>{g&&v.current?.focus()},r=[g],p[0]=g,p[1]=t,p[2]=r):(t=p[1],r=p[2]),(0,l.useEffect)(t,r),p[3]!==h?(i=e=>{h(e.target.value)},p[3]=h,p[4]=i):i=p[4];let y=i;p[5]!==h?(n=()=>{h(""),v.current?.focus()},p[5]=h,p[6]=n):n=p[6];let w=n;p[7]!==h||p[8]!==b?(o=e=>{if("Escape"===e.key){e.preventDefault(),h("");return}if("Enter"!==e.key||!b)return;e.preventDefault();let t=e.currentTarget.value.trim();t&&b(t)},p[7]=h,p[8]=b,p[9]=o):o=p[9];let N=o;return p[10]===Symbol.for("react.memo_cache_sentinel")?(d=(0,a.jsx)(T.A,{className:"pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"}),p[10]=d):d=p[10],p[11]!==y||p[12]!==N||p[13]!==f||p[14]!==x?(c=(0,a.jsx)(M.p,{ref:v,type:"text",value:x,onChange:y,onKeyDown:N,placeholder:f,autoComplete:"off",className:"h-11 min-h-11 rounded-lg bg-white px-10 py-2.5 text-sm"}),p[11]=y,p[12]=N,p[13]=f,p[14]=x,p[15]=c):c=p[15],p[16]!==w||p[17]!==x?(m=x&&(0,a.jsx)("button",{type:"button","aria-label":"Clear search",onClick:w,className:"absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",children:(0,a.jsx)(O.A,{className:"h-4 w-4"})}),p[16]=w,p[17]=x,p[18]=m):m=p[18],p[19]!==c||p[20]!==m?(u=(0,a.jsxs)("div",{className:"relative min-w-0 flex-1",children:[d,c,m]}),p[19]=c,p[20]=m,p[21]=u):u=p[21],u}),_="__offers__",R="__other_subcategory__",F=e=>"ar"===e?"أخرى":"Other",z=e=>e.isActive&&(null==e.status||e.status===c.ry.ACTIVE);function L(e){let t,r,o,c,m,u,p,x,f,h,b,y,w,j,A,$,k,S,C,P,I,T,O,M,L,B,V,G=(0,s.c)(102),{currency:Q,disabled:J,offers:K,onSelectOffer:Y,products:H,onProductSelect:X,onProductQuickView:Z,onCodeSubmit:W,autoFocusSearch:ee}=e,et=void 0!==J&&J;G[0]!==K?(t=void 0===K?[]:K,G[0]=K,G[1]=t):t=G[1];let er=t,ea=void 0!==ee&&ee,{locale:es,t:el}=(0,i.Y)(),ei=(0,l.useRef)(null),[en,eo]=(0,l.useState)(""),[ed,ec]=(0,l.useState)(n),[em,eu]=(0,l.useState)(n),ep=function(e,t){let r,a,i=(0,s.c)(4),[n,o]=(0,l.useState)(e);return 300!==i[0]||i[1]!==e?(r=()=>{let t=window.setTimeout(()=>{o(e)},300);return()=>window.clearTimeout(t)},a=[e,300],i[0]=300,i[1]=e,i[2]=r,i[3]=a):(r=i[2],a=i[3]),(0,l.useEffect)(r,a),n}(en,0),ex=er.length>0&&!!Y;G[2]!==H?(r=H.filter(z),G[2]=H,G[3]=r):r=G[3];let ef=r;if(G[4]!==ef||G[5]!==ex||G[6]!==es||G[7]!==er.length){e:{let e,t,r=(t=new Map,ef.forEach(e=>{let r=e.categoryId??"__uncategorized__",a=t.get(r);if(a){a.count+=1;return}t.set(r,{id:r,label:"ar"===es?e.categoryNameAr||e.categoryDisplayName||e.categoryName||F(es):e.categoryDisplayName||e.categoryName||e.categoryNameAr||F(es),count:1})}),Array.from(t.values()));if(!ex){o=r;break e}let a="ar"===es?"العروض":"Offers";G[9]!==er.length||G[10]!==a?(e={id:_,label:a,count:er.length,variant:"offer"},G[9]=er.length,G[10]=a,G[11]=e):e=G[11],o=[e,...r]}G[4]=ef,G[5]=ex,G[6]=es,G[7]=er.length,G[8]=o}else o=G[8];let eh=o;t:{let e;if(ed===n){c=ed;break t}G[12]!==eh||G[13]!==ed?(e=eh.some(e=>e.id===ed)?ed:n,G[12]=eh,G[13]=ed,G[14]=e):e=G[14],c=e}let eb=c,eg=((V=(0,s.c)(4))[0]!==eb||V[1]!==ef||V[2]!==ep?(B=d(ef,ep,eb),V[0]=eb,V[1]=ef,V[2]=ep,V[3]=B):B=V[3],B);r:{let e;if(eb===n||eb===_){let e;G[15]===Symbol.for("react.memo_cache_sentinel")?(e=[],G[15]=e):e=G[15],m=e;break r}if(G[16]!==eg||G[17]!==es){let t;t=new Map,eg.forEach(e=>{let r=e.subcategoryId??R,a=t.get(r);if(a){a.count+=1;return}t.set(r,{id:r,label:e.subcategoryId?"ar"===es?e.subcategoryNameAr||e.subcategoryDisplayName||e.subcategoryName||F(es):e.subcategoryDisplayName||e.subcategoryName||e.subcategoryNameAr||F(es):F(es),count:1})}),e=Array.from(t.values()),G[16]=eg,G[17]=es,G[18]=e}else e=G[18];m=e}let ev=m;a:{let e;if(em===n){u=em;break a}G[19]!==em||G[20]!==ev?(e=ev.some(e=>e.id===em)?em:n,G[19]=em,G[20]=ev,G[21]=e):e=G[21],u=e}let ey=u;s:{let e;if(ey===n){p=eg;break s}if(ey===R){let e;G[22]!==eg?(e=eg.filter(U),G[22]=eg,G[23]=e):e=G[23],p=e;break s}if(G[24]!==ey||G[25]!==eg){let t;G[27]!==ey?(t=e=>e.subcategoryId===ey,G[27]=ey,G[28]=t):t=G[28],e=eg.filter(t),G[24]=ey,G[25]=eg,G[26]=e}else e=G[26];p=e}let ew=p;if(G[29]!==ep||G[30]!==es||G[31]!==er){let e;G[33]!==ep||G[34]!==es?(e=e=>{var t,r,a;let s;return t=e,r=ep,a=es,!(s=r.trim().toLowerCase())||[..."ar"===a?[t.nameAr,t.name,t.descriptionAr,t.description]:[t.name,t.nameAr,t.description,t.descriptionAr],...t.products.flatMap(e=>"ar"===a?[e.nameAr,e.name,e.descriptionAr,e.description]:[e.name,e.nameAr,e.description,e.descriptionAr])].some(e=>e?.trim().toLowerCase().includes(s))},G[33]=ep,G[34]=es,G[35]=e):e=G[35],x=er.filter(e),G[29]=ep,G[30]=es,G[31]=er,G[32]=x}else x=G[32];let eN=x,ej=eb===n,eA=eb===_&&!!Y,e$=ef.length+(ex?er.length:0);(G[36]!==el?(f=el("allCategories"),G[36]=el,G[37]=f):f=G[37],G[38]!==el?(h=el("containsAllergens"),G[38]=el,G[39]=h):h=G[39],G[40]!==es)?(b="ar"===es?"لا توجد منتجات مطابقة":"No matching products",G[40]=es,G[41]=b):b=G[41],G[42]!==es?(y="ar"===es?"خيارات":"Options",G[42]=es,G[43]=y):y=G[43];let ek="ar"===es?"عرض التفاصيل":"Quick view";(G[44]!==el?(w=el("searchProducts"),G[44]=el,G[45]=w):w=G[45],G[46]!==es)?(j="ar"===es?"غير متاح":"Unavailable",G[46]=es,G[47]=j):j=G[47];let eS="ar"===es?"متوفر":"In stock",eC="ar"===es?"مخزون منخفض":"Low stock",eP="ar"===es?"غير متوفر":"Out of stock";G[48]!==f||G[49]!==h||G[50]!==b||G[51]!==y||G[52]!==ek||G[53]!==w||G[54]!==j||G[55]!==eS||G[56]!==eC||G[57]!==eP?(A={allCategories:f,containsAllergens:h,noProducts:b,options:y,quickView:ek,searchPlaceholder:w,unavailable:j,inStock:eS,lowStock:eC,outOfStock:eP},G[48]=f,G[49]=h,G[50]=b,G[51]=y,G[52]=ek,G[53]=w,G[54]=j,G[55]=eS,G[56]=eC,G[57]=eP,G[58]=A):A=G[58];let eI=A;G[59]===Symbol.for("react.memo_cache_sentinel")?($=e=>{eo(e)},G[59]=$):$=G[59];let eq=$;G[60]!==ef||G[61]!==W?(k=e=>{if(!W)return;let t=(0,v.OF)(ef,e);if("none"!==t.kind)return void W(t,e);let r=d(ef,e,n);W(1===r.length?{kind:"single",matches:r}:{kind:0===r.length?"none":"ambiguous",matches:r},e)},G[60]=ef,G[61]=W,G[62]=k):k=G[62];let eT=k;G[63]===Symbol.for("react.memo_cache_sentinel")?(S=e=>{ec(e),eu(n),ei.current?.scrollIntoView({block:"start"})},G[63]=S):S=G[63];let eO=S;G[64]===Symbol.for("react.memo_cache_sentinel")?(C=e=>{eu(e),ei.current?.scrollIntoView({block:"start"})},G[64]=C):C=G[64];let eM=C,eD=W?eT:void 0;return(G[65]!==ea||G[66]!==eI.searchPlaceholder||G[67]!==en||G[68]!==eD?(P=(0,a.jsx)(D,{value:en,placeholder:eI.searchPlaceholder,onChange:eq,onSubmit:eD,autoFocus:ea}),G[65]=ea,G[66]=eI.searchPlaceholder,G[67]=en,G[68]=eD,G[69]=P):P=G[69],G[70]!==eb||G[71]!==eh||G[72]!==eI.allCategories||G[73]!==e$?(I=(0,a.jsx)(N,{allLabel:eI.allCategories,categories:eh,selectedCategory:eb,totalCount:e$,onCategoryChange:eO}),G[70]=eb,G[71]=eh,G[72]=eI.allCategories,G[73]=e$,G[74]=I):I=G[74],G[75]!==ey||G[76]!==eg||G[77]!==es||G[78]!==ej||G[79]!==eA||G[80]!==ev)?(T=ev.some(E)&&!ej&&!eA&&(0,a.jsx)(N,{allLabel:"ar"===es?"الكل":"All",categories:ev,selectedCategory:ey,totalCount:eg.length,onCategoryChange:eM}),G[75]=ey,G[76]=eg,G[77]=es,G[78]=ej,G[79]=eA,G[80]=ev,G[81]=T):T=G[81],(G[82]!==P||G[83]!==I||G[84]!==T?(O=(0,a.jsxs)("div",{className:"sticky top-0 z-30 space-y-3 border-b border-slate-200 bg-slate-50/95 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85",children:[P,I,T]}),G[82]=P,G[83]=I,G[84]=T,G[85]=O):O=G[85],G[86]!==Q||G[87]!==et||G[88]!==eN||G[89]!==eg||G[90]!==eI||G[91]!==es||G[92]!==Z||G[93]!==X||G[94]!==Y||G[95]!==ej||G[96]!==eA||G[97]!==ew)?(M=eA?eN.length>0?(0,a.jsx)(g,{offers:eN,currency:Q,disabled:et,onSelectOffer:Y}):(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:"ar"===es?"لا توجد عروض مطابقة":"No matching offers"}):ej?eN.length>0||eg.length>0?(0,a.jsxs)(a.Fragment,{children:[Y&&eN.length>0&&(0,a.jsx)(g,{offers:eN,currency:Q,disabled:et,onSelectOffer:Y}),eg.length>0&&(0,a.jsx)(q,{products:eg,currency:Q,locale:es,labels:eI,emptyLabel:eI.noProducts,disabled:et,onProductSelect:X,onProductQuickView:Z})]}):(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:"ar"===es?"لا توجد عناصر مطابقة":"No matching items"}):(0,a.jsx)(q,{products:ew,currency:Q,locale:es,labels:eI,emptyLabel:eI.noProducts,disabled:et,onProductSelect:X,onProductQuickView:Z}),G[86]=Q,G[87]=et,G[88]=eN,G[89]=eg,G[90]=eI,G[91]=es,G[92]=Z,G[93]=X,G[94]=Y,G[95]=ej,G[96]=eA,G[97]=ew,G[98]=M):M=G[98],G[99]!==O||G[100]!==M?(L=(0,a.jsxs)("section",{ref:ei,className:"space-y-4",children:[O,M]}),G[99]=O,G[100]=M,G[101]=L):L=G[101],L}function E(e){return e.id!==R}function U(e){return!e.subcategoryId}},76820:(e,t,r)=>{r.d(t,{C:()=>u});var a=r(95155),s=r(19749);r(12115);var l=r(94995),i=r(50277),n=r(97511),o=r(17397),d=r(97012),c=r(40154),m=r(1016);function u(e){let t,r,u,y,w,N,j=(0,s.c)(30),{order:A,variant:$,size:k,className:S,label:C,iconOnly:P}=e,I=void 0===$?"outline":$,q=void 0===k?"default":k,T=void 0!==P&&P,{t:O}=(0,m.Y)(),M=(0,n.useSettingsStore)(v),D=(0,o.useBrandingStore)(g),_=(0,o.useBrandingStore)(b),R=(0,d.usePosStore)(h),F=(0,d.usePosStore)(f),z=(0,d.usePosStore)(x),L=(0,d.usePosStore)(p);j[0]!==_||j[1]!==F||j[2]!==D||j[3]!==A||j[4]!==R||j[5]!==M||j[6]!==z||j[7]!==L?(t=()=>{A&&(0,c.printReceipt)({order:A,settings:M,logoUrl:D,businessName:_,products:R,currency:F,storeServiceChargeRate:z,storeTaxRate:L,customerPhone:A.customerPhone,amountTendered:A.amountTendered,changeAmount:A.changeAmount,forceReprint:!0})},j[0]=_,j[1]=F,j[2]=D,j[3]=A,j[4]=R,j[5]=M,j[6]=z,j[7]=L,j[8]=t):t=j[8];let E=t;if(!A)return null;j[9]!==C||j[10]!==O?(r=C??O("printReceiptBtn"),j[9]=C,j[10]=O,j[11]=r):r=j[11],j[12]!==C||j[13]!==O?(u=C??O("printReceiptBtn"),j[12]=C,j[13]=O,j[14]=u):u=j[14];let U=T?"":"me-2 h-4 w-4";return j[15]!==U?(y=(0,a.jsx)(l.A,{className:U}),j[15]=U,j[16]=y):y=j[16],j[17]!==T||j[18]!==C||j[19]!==O?(w=!T&&(C??O("printReceiptBtn")),j[17]=T,j[18]=C,j[19]=O,j[20]=w):w=j[20],j[21]!==S||j[22]!==E||j[23]!==q||j[24]!==r||j[25]!==u||j[26]!==y||j[27]!==w||j[28]!==I?(N=(0,a.jsxs)(i.$,{variant:I,size:q,className:S,onClick:E,"aria-label":r,title:u,children:[y,w]}),j[21]=S,j[22]=E,j[23]=q,j[24]=r,j[25]=u,j[26]=y,j[27]=w,j[28]=I,j[29]=N):N=j[29],N}function p(e){return e.taxRate}function x(e){return e.serviceChargeRate}function f(e){return e.currency}function h(e){return e.products}function b(e){return e.businessName}function g(e){return e.logoUrl}function v(e){return e.settings}},81769:(e,t,r)=>{r.d(t,{J:()=>n});var a=r(95155),s=r(19749);r(12115);var l=r(86228),i=r(37570);function n(e){let t,r,n,o,d=(0,s.c)(8);return d[0]!==e?({className:t,...r}=e,d[0]=e,d[1]=t,d[2]=r):(t=d[1],r=d[2]),d[3]!==t?(n=(0,i.cn)("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",t),d[3]=t,d[4]=n):n=d[4],d[5]!==r||d[6]!==n?(o=(0,a.jsx)(l.b,{"data-slot":"label",className:n,...r}),d[5]=r,d[6]=n,d[7]=o):o=d[7],o}},98256:(e,t,r)=>{r.d(t,{A:()=>N});var a=r(95155),s=r(19749),l=r(12115),i=r(97012),n=r(32226),o=r(94077),d=r(50277),c=r(34819),m=r(45827),u=r(13628),p=r(81769),x=r(37570),f=r(32976),h=r(366),b=r(77274),g=r(14547),v=r(15823),y=r(74593),w=r(1016);function N(e){let t,r,N,R,B,J,K,Y,H,X,Z,W,ee,et,er,ea,es,el,ei,en,eo,ed,ec,em,eu,ep,ex,ef,eh,eb,eg,ev,ey,ew,eN,ej=(0,s.c)(156),{product:eA,isOpen:e$,onClose:ek,onAddToCart:eS,initialQuantity:eC,initialNotes:eP,initialModifierIds:eI,initialModifierQuantities:eq,actionLabel:eT,orderType:eO}=e;ej[0]===Symbol.for("react.memo_cache_sentinel")?(t=[],ej[0]=t):t=ej[0];let[eM,eD]=(0,l.useState)(t),[e_,eR]=(0,l.useState)(null);ej[1]===Symbol.for("react.memo_cache_sentinel")?(r={},ej[1]=r):r=ej[1];let[eF,ez]=(0,l.useState)(r),[eL,eE]=(0,l.useState)(1),[eU,eB]=(0,l.useState)("");ej[2]===Symbol.for("react.memo_cache_sentinel")?(N=[],ej[2]=N):N=ej[2];let[eV,eG]=(0,l.useState)(N),eQ=(0,i.usePosStore)(Q),{t:eJ,locale:eK}=(0,w.Y)(),eY=eA?.isActive&&eA?.isAvailableNow;ej[3]!==eK||ej[4]!==eA?(R=eA?(0,f.mB)(eA,"ar"===eK?"ar":"en"):null,ej[3]=eK,ej[4]=eA,ej[5]=R):R=ej[5];let eH=R;ej[6]!==eK||ej[7]!==eA?(B=eA?(0,f.XV)(eA,"ar"===eK?"ar":"en"):null,ej[6]=eK,ej[7]=eA,ej[8]=B):B=ej[8];let eX=B,eZ=G;if(ej[9]!==eI||ej[10]!==eq||ej[11]!==eP||ej[12]!==eC||ej[13]!==e$||ej[14]!==eA?(J=()=>{if(e$&&eA){eE(Math.max(1,eC??1)),eB(eP??""),eG([]),eI&&eI.length>0?eD(eA.modifierGroups.flatMap(V).filter(e=>eI.includes(e.id)).map(e=>eZ(e,eq?.[e.id]??1))):eD(eA.modifierGroups.flatMap(U).map(e=>eZ(e,1)));let e=eA.options?.filter(E)??[];eR(e.find(L)??e[0]??null);let t={};for(let e of eA.recipeItems??[]){if(!e.alternatives?.length)continue;let r=e.alternatives.find(z);t[e.id]=r?.id??""}ez(t)}else eA||(eD([]),eR(null),ez({}))},K=[e$,eA,eC,eP,eI,eq,eZ],ej[9]=eI,ej[10]=eq,ej[11]=eP,ej[12]=eC,ej[13]=e$,ej[14]=eA,ej[15]=J,ej[16]=K):(J=ej[15],K=ej[16]),(0,l.useEffect)(J,K),!eA)return null;let eW=eA.displayPrice??eA.discountedPrice??eA.basePrice;ej[17]!==eM?(Y=e=>eM.filter(t=>e.modifiers.some(e=>e.id===t.id)).length,ej[17]=eM,ej[18]=Y):Y=ej[18];let e0=Y;ej[19]===Symbol.for("react.memo_cache_sentinel")?(H=(e,t)=>{let r=e.modifiers.find(e=>e.id===t);r&&(eD(t=>[...t.filter(t=>!e.modifiers.some(e=>e.id===t.id)),eZ(r,1)]),eG([]))},ej[19]=H):H=ej[19];let e1=H;ej[20]===Symbol.for("react.memo_cache_sentinel")?(X=(e,t,r)=>{eD(a=>{if(!e)return a.filter(e=>e.id!==r.id);{let e=a.filter(e=>t.modifiers.some(t=>t.id===e.id)).length;return t.maxSelection>0&&e>=t.maxSelection?a:[...a,eZ(r,1)]}}),eG([])},ej[20]=X):X=ej[20];let e2=X;ej[21]===Symbol.for("react.memo_cache_sentinel")?(Z=(e,t)=>{eD(r=>r.map(r=>{if(r.id!==e)return r;let a=Math.max(1,(r.quantity||1)+t);return{...r,quantity:a}}))},ej[21]=Z):Z=ej[21];let e5=Z;if(ej[22]!==eF||ej[23]!==eX||ej[24]!==eH||ej[25]!==eW||ej[26]!==eQ||ej[27]!==e0||ej[28]!==e$||ej[29]!==eY||ej[30]!==eK||ej[31]!==eU||ej[32]!==eS||ej[33]!==ek||ej[34]!==eO||ej[35]!==eA||ej[36]!==eL||ej[37]!==eM||ej[38]!==e_||ej[39]!==eJ){let e,t,r,s,l,i,d,c,m,f=eA?.modifierGroups?.filter(e=>void 0===eO||(e.availableForOrderTypes&eO)!=0)??[];ej[56]!==eW||ej[57]!==eA?(e=(e,t)=>{let r=e.freeQuantityLimit??0;if(e.isFree&&r>0&&(void 0===t?1:t)<=r||e.isFree&&0===r)return 0;let a=e.pricingType??0;return 2===a?0:1===a&&eA?eW*e.priceAdjustment/100:e.priceAdjustment},ej[56]=eW,ej[57]=eA,ej[58]=e):e=ej[58],ea=e;let w=(eA.recipeItems??[]).filter(_);ej[59]!==eF||ej[60]!==eA||ej[61]!==e_?(t=()=>{if(e_)return 0;let e=Object.entries(eF).filter(D).map(M);return(0,h.XY)(eA,e)},ej[59]=eF,ej[60]=eA,ej[61]=e_,ej[62]=t):t=ej[62];let N=t;ej[63]!==eF||ej[64]!==e_?(r=()=>{if(e_)return[];let e=[];for(let[t,r]of Object.entries(eF))r&&e.push({recipeItemId:t,alternativeId:r});return e},ej[63]=eF,ej[64]=e_,ej[65]=r):r=ej[65];let j=r;ej[66]!==N||ej[67]!==eW||ej[68]!==ea||ej[69]!==eL||ej[70]!==eM||ej[71]!==e_?(s=()=>{if(e_)return e_.price*eL;let e=eM.filter(O).reduce((e,t)=>e+ea(t,1),0);return((e>0?e:eW)+eM.filter(T).reduce((e,t)=>e+ea(t,t.quantity||1)*(t.quantity||1),0)+N())*eL},ej[66]=N,ej[67]=eW,ej[68]=ea,ej[69]=eL,ej[70]=eM,ej[71]=e_,ej[72]=s):s=ej[72],et=s,ej[73]!==N||ej[74]!==eW||ej[75]!==ea||ej[76]!==eM||ej[77]!==e_?(l=()=>{if(e_)return e_.price;let e=eM.filter(q).reduce((e,t)=>e+ea(t,1),0);return(e>0?e:eW)+eM.filter(I).reduce((e,t)=>e+ea(t,t.quantity||1)*(t.quantity||1),0)+N()},ej[73]=N,ej[74]=eW,ej[75]=ea,ej[76]=eM,ej[77]=e_,ej[78]=l):l=ej[78],er=l,es=()=>{eA.isActive&&eA.isAvailableNow?(()=>{let e=[];for(let t of f){if(0===t.modifiers.filter(F).length)continue;let r=e0(t),a=t.displayName||t.name;t.isRequired&&t.minSelection>0&&r<t.minSelection&&e.push(`${a}: select at least ${t.minSelection}`),t.maxSelection>0&&r>t.maxSelection&&e.push(`${a}: max ${t.maxSelection} allowed`)}return eG(e),0===e.length})()&&(eS(eA,eM,eL,eU.trim(),e_,j()),ek()):eG(["ar"===eK?"هذا المنتج غير متاح حاليًا":"This product is not available right now"])},ee=o.lG,ep=e$,ej[79]!==ek?(ex=e=>!e&&ek(),ej[79]=ek,ej[80]=ex):ex=ej[80],W=o.Cf,ec="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex flex-col p-0 gap-0 overflow-hidden bg-white sm:max-w-[600px] sm:max-h-[85vh]",em="ar"===eK?"rtl":"ltr";let A="ar"===eK&&eA.nameAr?eA.nameAr:eA.displayName||eA.name;ej[81]!==A?(i=(0,a.jsx)(o.L3,{className:"text-2xl font-bold text-slate-800 text-start",children:A}),ej[81]=A,ej[82]=i):i=ej[82];let R="ar"===eK?"rtl":"ltr",z="ar"===eK?"right":"left";ej[83]!==R||ej[84]!==z?(d={direction:R,textAlign:z},ej[83]=R,ej[84]=z,ej[85]=d):d=ej[85];let L=e_?e_.price:eW;ej[86]!==eQ||ej[87]!==L?(c=(0,n.vv)(L,eQ),ej[86]=eQ,ej[87]=L,ej[88]=c):c=ej[88],ej[89]!==d||ej[90]!==c?(m=(0,a.jsx)("p",{className:"text-lg text-primary font-semibold text-start",style:d,children:c}),ej[89]=d,ej[90]=c,ej[91]=m):m=ej[91],ej[92]!==i||ej[93]!==m?(eu=(0,a.jsxs)(o.c7,{className:"border-b border-slate-100 p-4 pb-4 sm:p-6 text-start",children:[i,m]}),ej[92]=i,ej[93]=m,ej[94]=eu):eu=ej[94],el="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6",ej[95]!==eX||ej[96]!==eH||ej[97]!==eY||ej[98]!==eK?(ei=!eY&&(0,a.jsxs)("div",{className:"flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700",children:[(0,a.jsx)(b.A,{className:"mt-0.5 h-4 w-4 shrink-0"}),(0,a.jsxs)("div",{children:[(0,a.jsx)("div",{children:"ar"===eK?"هذا المنتج غير متاح حاليًا ولا يمكن إضافته إلى الطلب":"This product is currently unavailable and cannot be added to the order."}),eH&&(0,a.jsx)("div",{className:"mt-1 text-xs text-amber-600",children:eH}),eX&&(0,a.jsx)("div",{className:"mt-1 text-xs text-amber-600",children:eX})]})]}),ej[95]=eX,ej[96]=eH,ej[97]=eY,ej[98]=eK,ej[99]=ei):ei=ej[99],ej[100]!==eQ||ej[101]!==eK||ej[102]!==eA.options||ej[103]!==e_?.id||ej[104]!==eJ?(en=(eA.options?.filter(P).length??0)>0&&(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eK?"اختر النوع":"Choose Variant"}),(0,a.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100",children:eJ("required")})]}),(0,a.jsx)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:eA.options.filter(C).map(e=>{let t=e_?.id===e.id,r="ar"===eK&&e.nameAr?e.nameAr:e.name;return(0,a.jsxs)("button",{type:"button",onClick:()=>eR(e),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                ${t?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[t&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:r}),(0,a.jsx)("span",{className:"text-[11px] font-bold mt-0.5 text-primary",children:(0,n.vv)(e.price,eQ)})]},e.id)})})]}),ej[100]=eQ,ej[101]=eK,ej[102]=eA.options,ej[103]=e_?.id,ej[104]=eJ,ej[105]=en):en=ej[105],eo=w.length>0&&!e_&&(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eK?"البدائل":"Ingredient Swaps"}),(0,a.jsx)("span",{className:"text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100",children:eJ("optional")})]}),w.map(e=>{let t="ar"===eK&&e.rawMaterialNameAr?e.rawMaterialNameAr:e.rawMaterialName,r=(e.alternatives??[]).filter(S),s=eF[e.id]??"",l=(0,x.D)(e.unit,eK),i=`${t} (${e.amount} ${l})`;return(0,a.jsxs)("div",{className:"space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-3",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700",children:t}),(0,a.jsx)("span",{className:"text-[11px] text-slate-400",children:"ar"===eK?"اختر بديلاً":"Pick an alternative"})]}),(0,a.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,a.jsxs)("button",{type:"button",onClick:()=>ez(t=>({...t,[e.id]:""})),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                    ${""===s?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[""===s&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:i}),(0,a.jsx)("span",{className:"text-[11px] text-slate-400 mt-0.5",children:"ar"===eK?"افتراضي":"Default"})]}),r.map(t=>{let r=s===t.id,l="ar"===eK&&(t.nameAr||t.rawMaterialNameAr)?t.nameAr||t.rawMaterialNameAr:t.name||t.rawMaterialName,i=(0,x.D)(t.unit,eK),o=`${l} (${t.amount} ${i})`,d=(0,h.CX)(eA,e,t),c=(0,h.R_)(d,e=>(0,n.vv)(e,eQ)),m=d<0?"text-emerald-600":"text-primary";return(0,a.jsxs)("button",{type:"button",onClick:()=>ez(r=>({...r,[e.id]:t.id})),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                            ${r?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[r&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:o}),c&&(0,a.jsx)("span",{className:`text-[11px] font-bold mt-0.5 ${m}`,children:c})]},t.id)})]})]},e.id)})]}),ed=f.length>0?f.map(e=>{let t=e.modifiers.filter(k);if(0===t.length)return null;let r=0===e.selectionType,s=e.isRequired,l=e0(e),i=e.maxSelection>0&&l>=e.maxSelection,o=e.displayType??+!r;return(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eK&&e.nameAr?e.nameAr:e.displayName||e.name}),s?(0,a.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100",children:eJ("required")}):(0,a.jsx)("span",{className:"text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100",children:eJ("optional")})]}),(0,a.jsx)("span",{className:"text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md text-start",children:r?eJ("chooseOne"):e.maxSelection>0?`${l}/${e.maxSelection}`:l>0?`${l} ${eJ("selectedLabel")}`:eJ("anyOption")})]}),r?(0,a.jsx)(u.z,{value:eM.find(t=>e.modifiers.some(e=>e.id===t.id))?.id,onValueChange:t=>e1(e,t),className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:t.map(t=>{let r=eM.some(e=>e.id===t.id),s=`radio-${e.id}-${t.id}`,l=ea(t,1),i=1===t.pricingType?"%":2===t.pricingType?"incl.":"";return(0,a.jsxs)("div",{className:`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-center min-h-[72px]
                                                        ${r?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,onClick:()=>e1(e,t.id),children:[r&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)(u.C,{value:t.id,id:s,className:"sr-only"}),(0,a.jsx)(p.J,{htmlFor:s,className:"cursor-pointer font-semibold text-sm text-slate-700",children:"ar"===eK&&t.nameAr?t.nameAr:t.displayName||t.name}),t.isFree||0===l?(0,a.jsx)("span",{className:"text-[10px] text-slate-400 mt-1",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:`text-xs font-bold mt-1 ${l>0?"text-primary":"text-blue-600"}`,children:[l>0?"+":"",(0,n.vv)(l,eQ)," ",i]})]},t.id)})}):2===o?(0,a.jsx)("div",{className:"flex flex-col gap-2",children:t.map(e=>{let t=eM.find(t=>t.id===e.id),r=t?.quantity||0,s=ea(e,r),l=e.maxQuantity>0?e.maxQuantity:99;return(0,a.jsxs)("div",{className:`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${r>0?"border-primary bg-primary/5 shadow-sm":"border-slate-200 hover:border-slate-300"}`,children:[(0,a.jsx)("div",{className:"flex items-center gap-3",children:(0,a.jsx)("span",{className:"font-medium text-sm text-slate-700",children:"ar"===eK&&e.nameAr?e.nameAr:e.displayName||e.name})}),(0,a.jsxs)("div",{className:"flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start",children:[(0,a.jsxs)("div",{className:"flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5",children:[(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>{r<=1?eD(t=>t.filter(t=>t.id!==e.id)):r>0&&e5(e.id,-1)},children:(0,a.jsx)(v.A,{className:"w-3 h-3"})}),(0,a.jsx)("span",{className:"w-7 text-center text-sm font-bold text-slate-700",children:r}),(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>{0===r?eD(t=>[...t,eZ(e,1)]):r<l&&e5(e.id,1)},children:(0,a.jsx)(y.A,{className:"w-3 h-3"})})]}),e.isFree||0===s?(0,a.jsx)("span",{className:"text-xs text-slate-400 min-w-[40px] text-end",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:"text-sm font-bold min-w-[60px] text-end text-primary",children:["+",(0,n.vv)(s*r,eQ)]})]})]},e.id)})}):(0,a.jsx)("div",{className:"flex flex-col gap-2",children:t.map(t=>{let r=eM.find(e=>e.id===t.id),s=!!r,l=!s&&i,o=`check-${e.id}-${t.id}`,d=ea(t,r?.quantity||1);return(0,a.jsxs)("div",{className:`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${s?"border-primary bg-primary/5 shadow-sm":l?"border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed":"border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"}`,onClick:()=>!l&&e2(!s,e,t),children:[(0,a.jsxs)("div",{className:"flex items-center gap-3",children:[(0,a.jsx)("div",{className:`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${s?"bg-primary border-primary":"border-slate-300"}`,children:s&&(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)(p.J,{htmlFor:o,className:`font-medium text-sm ${l?"text-slate-400":"text-slate-700 cursor-pointer"}`,children:"ar"===eK&&t.nameAr?t.nameAr:t.displayName||t.name})]}),(0,a.jsxs)("div",{className:"flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start",children:[s&&(0,a.jsxs)("div",{className:"flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5",onClick:$,children:[(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>e5(t.id,-1),children:(0,a.jsx)(v.A,{className:"w-3 h-3"})}),(0,a.jsx)("span",{className:"w-7 text-center text-sm font-bold text-slate-700",children:r?.quantity||1}),(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>e5(t.id,1),children:(0,a.jsx)(y.A,{className:"w-3 h-3"})})]}),t.isFree||0===d?(0,a.jsx)("span",{className:"text-xs text-slate-400 min-w-[40px] text-end",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:`text-sm font-bold min-w-[60px] text-end ${d>0?"text-primary":"text-blue-600"}`,children:[d>0?"+":"",(0,n.vv)(d*(r?.quantity||1),eQ)]})]})]},t.id)})})]},e.id)}):(0,a.jsxs)("div",{className:"flex flex-col items-center justify-center py-10 text-slate-400",children:[(0,a.jsx)("span",{className:"text-4xl mb-2",children:"\uD83C\uDF7D️"}),(0,a.jsx)("p",{children:eJ("noExtraOptions")})]}),ej[22]=eF,ej[23]=eX,ej[24]=eH,ej[25]=eW,ej[26]=eQ,ej[27]=e0,ej[28]=e$,ej[29]=eY,ej[30]=eK,ej[31]=eU,ej[32]=eS,ej[33]=ek,ej[34]=eO,ej[35]=eA,ej[36]=eL,ej[37]=eM,ej[38]=e_,ej[39]=eJ,ej[40]=W,ej[41]=ee,ej[42]=et,ej[43]=er,ej[44]=ea,ej[45]=es,ej[46]=el,ej[47]=ei,ej[48]=en,ej[49]=eo,ej[50]=ed,ej[51]=ec,ej[52]=em,ej[53]=eu,ej[54]=ep,ej[55]=ex}else W=ej[40],ee=ej[41],et=ej[42],er=ej[43],ea=ej[44],es=ej[45],el=ej[46],ei=ej[47],en=ej[48],eo=ej[49],ed=ej[50],ec=ej[51],em=ej[52],eu=ej[53],ep=ej[54],ex=ej[55];return ej[106]!==eW||ej[107]!==er||ej[108]!==eQ||ej[109]!==ea||ej[110]!==eK||ej[111]!==eA.displayName||ej[112]!==eA.name||ej[113]!==eA.nameAr||ej[114]!==eM||ej[115]!==eJ?(ef=eM.length>0&&eM.some(e=>ea(e,e.quantity||1)>0)&&(0,a.jsxs)("div",{className:"bg-slate-50 rounded-xl p-4 border border-slate-100",children:[(0,a.jsx)("h4",{className:"text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",children:eJ("priceBreakdown")}),(0,a.jsxs)("div",{className:"space-y-1.5",children:[(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-600",children:[(0,a.jsx)("span",{children:"ar"===eK&&eA.nameAr?eA.nameAr:eA.displayName||eA.name}),(0,a.jsx)("span",{className:"font-medium",children:(0,n.vv)(eW,eQ)})]}),eM.filter(e=>0!==ea(e,e.quantity||1)).map((e,t)=>(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-500",children:[(0,a.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,a.jsx)("span",{className:"w-1 h-1 rounded-full bg-primary"}),"ar"===eK&&e.nameAr?e.nameAr:e.displayName||e.name,(e.quantity||1)>1&&(0,a.jsxs)("span",{className:"text-slate-400",children:["\xd7",e.quantity]})]}),(0,a.jsxs)("span",{className:"font-medium text-primary",children:["+",(0,n.vv)(ea(e,e.quantity||1)*(e.quantity||1),eQ)]})]},t)),(0,a.jsxs)("div",{className:"flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200",children:[(0,a.jsx)("span",{children:eJ("unitPrice")}),(0,a.jsx)("span",{children:(0,n.vv)(er(),eQ)})]})]})]}),ej[106]=eW,ej[107]=er,ej[108]=eQ,ej[109]=ea,ej[110]=eK,ej[111]=eA.displayName,ej[112]=eA.name,ej[113]=eA.nameAr,ej[114]=eM,ej[115]=eJ,ej[116]=ef):ef=ej[116],ej[117]!==eY||ej[118]!==eU||ej[119]!==eL||ej[120]!==eJ?(eh=eY&&(0,a.jsxs)("div",{className:"space-y-4 border-t border-slate-100 pt-6",children:[(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(p.J,{htmlFor:"qty",className:"text-sm font-semibold text-slate-700",children:eJ("qty")}),(0,a.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,a.jsx)(d.$,{type:"button",variant:"outline",className:"h-10 w-10 p-0",onClick:()=>eE(A),children:"-"}),(0,a.jsx)(c.p,{id:"qty",type:"number",min:"1",step:"1",value:eL,onChange:e=>{let t=parseInt(e.target.value||"1",10);eE(Number.isNaN(t)?1:Math.max(1,t))},className:"w-full text-center sm:w-24"}),(0,a.jsx)(d.$,{type:"button",variant:"outline",className:"h-10 w-10 p-0",onClick:()=>eE(j),children:"+"})]})]}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(p.J,{htmlFor:"notes",className:"text-sm font-semibold text-slate-700",children:eJ("specialNote")}),(0,a.jsx)(m.T,{id:"notes",value:eU,onChange:e=>eB(e.target.value),placeholder:"e.g. No onions, extra spicy",className:"min-h-20"})]})]}),ej[117]=eY,ej[118]=eU,ej[119]=eL,ej[120]=eJ,ej[121]=eh):eh=ej[121],ej[122]!==el||ej[123]!==ei||ej[124]!==en||ej[125]!==eo||ej[126]!==ed||ej[127]!==ef||ej[128]!==eh?(eb=(0,a.jsxs)("div",{className:el,children:[ei,en,eo,ed,ef,eh]}),ej[122]=el,ej[123]=ei,ej[124]=en,ej[125]=eo,ej[126]=ed,ej[127]=ef,ej[128]=eh,ej[129]=eb):eb=ej[129],ej[130]!==eV?(eg=eV.length>0&&(0,a.jsxs)("div",{className:"flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm",children:[(0,a.jsx)(b.A,{className:"w-4 h-4 mt-0.5 shrink-0"}),(0,a.jsx)("div",{children:eV.join(" \xb7 ")})]}),ej[130]=eV,ej[131]=eg):eg=ej[131],ej[132]!==eT||ej[133]!==et||ej[134]!==er||ej[135]!==eQ||ej[136]!==es||ej[137]!==eY||ej[138]!==eL||ej[139]!==eJ?(ev=eY&&(0,a.jsxs)(d.$,{className:"flex h-auto min-h-14 w-full flex-col items-start gap-1 rounded-xl bg-primary px-4 py-3 text-start text-base text-white shadow-lg shadow-primary/20 hover:bg-primary/90 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6",onClick:es,children:[(0,a.jsx)("span",{className:"font-semibold",children:eT||eJ("addToCartBtn")}),(0,a.jsxs)("span",{className:"flex items-center gap-2",children:[(0,a.jsxs)("span",{className:"text-xs opacity-80",children:[eL," \xd7 ",(0,n.vv)(er(),eQ)]}),(0,a.jsx)("span",{className:"font-bold text-lg",children:(0,n.vv)(et(),eQ)})]})]}),ej[132]=eT,ej[133]=et,ej[134]=er,ej[135]=eQ,ej[136]=es,ej[137]=eY,ej[138]=eL,ej[139]=eJ,ej[140]=ev):ev=ej[140],ej[141]!==eg||ej[142]!==ev?(ey=(0,a.jsx)(o.Es,{className:"mt-auto border-t border-slate-100 bg-white p-4 sm:p-5",children:(0,a.jsxs)("div",{className:"flex flex-col w-full gap-3",children:[eg,ev]})}),ej[141]=eg,ej[142]=ev,ej[143]=ey):ey=ej[143],ej[144]!==W||ej[145]!==ec||ej[146]!==em||ej[147]!==eu||ej[148]!==eb||ej[149]!==ey?(ew=(0,a.jsxs)(W,{className:ec,dir:em,children:[eu,eb,ey]}),ej[144]=W,ej[145]=ec,ej[146]=em,ej[147]=eu,ej[148]=eb,ej[149]=ey,ej[150]=ew):ew=ej[150],ej[151]!==ee||ej[152]!==ep||ej[153]!==ex||ej[154]!==ew?(eN=(0,a.jsx)(ee,{open:ep,onOpenChange:ex,children:ew}),ej[151]=ee,ej[152]=ep,ej[153]=ex,ej[154]=ew,ej[155]=eN):eN=ej[155],eN}function j(e){return e+1}function A(e){return Math.max(1,e-1)}function $(e){return e.stopPropagation()}function k(e){return!1!==e.isActive}function S(e){return e.isActive}function C(e){return e.isActive}function P(e){return e.isActive}function I(e){return(e.recipeItems?.length??0)===0}function q(e){return(e.recipeItems?.length??0)>0}function T(e){return(e.recipeItems?.length??0)===0}function O(e){return(e.recipeItems?.length??0)>0}function M(e){let[t,r]=e;return{recipeItemId:t,alternativeId:r}}function D(e){let[,t]=e;return t}function _(e){return(e.alternatives?.length??0)>0&&e.alternatives.some(R)}function R(e){return e.isActive}function F(e){return!1!==e.isActive}function z(e){return e.isDefault&&e.isActive}function L(e){return e.isDefault}function E(e){return e.isActive}function U(e){return e.modifiers.filter(B)}function B(e){return e.isDefault&&!1!==e.isActive}function V(e){return e.modifiers}function G(e,t){return{id:e.id,name:e.name,nameAr:e.nameAr,displayName:e.displayName,priceAdjustment:e.priceAdjustment,pricingType:e.pricingType,isFree:e.isFree,freeQuantityLimit:e.freeQuantityLimit,maxQuantity:e.maxQuantity,isDefault:e.isDefault,isActive:e.isActive,quantity:void 0===t?1:t,recipeItems:e.recipeItems}}function Q(e){return e.currency}}}]);