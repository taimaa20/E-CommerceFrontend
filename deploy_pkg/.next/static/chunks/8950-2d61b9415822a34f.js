"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[8950],{13628:(e,t,r)=>{r.d(t,{C:()=>d,z:()=>o});var a=r(95155),s=r(19749);r(12115);var l=r(53500),i=r(64701),n=r(37570);function o(e){let t,r,i,o,d=(0,s.c)(8);return d[0]!==e?({className:t,...r}=e,d[0]=e,d[1]=t,d[2]=r):(t=d[1],r=d[2]),d[3]!==t?(i=(0,n.cn)("grid gap-3",t),d[3]=t,d[4]=i):i=d[4],d[5]!==r||d[6]!==i?(o=(0,a.jsx)(l.bL,{"data-slot":"radio-group",className:i,...r}),d[5]=r,d[6]=i,d[7]=o):o=d[7],o}function d(e){let t,r,o,d,c,m=(0,s.c)(9);return m[0]!==e?({className:t,...r}=e,m[0]=e,m[1]=t,m[2]=r):(t=m[1],r=m[2]),m[3]!==t?(o=(0,n.cn)("border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",t),m[3]=t,m[4]=o):o=m[4],m[5]===Symbol.for("react.memo_cache_sentinel")?(d=(0,a.jsx)(l.C1,{"data-slot":"radio-group-indicator",className:"relative flex items-center justify-center",children:(0,a.jsx)(i.A,{className:"fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"})}),m[5]=d):d=m[5],m[6]!==r||m[7]!==o?(c=(0,a.jsx)(l.q7,{"data-slot":"radio-group-item",className:o,...r,children:d}),m[6]=r,m[7]=o,m[8]=c):c=m[8],c}},26221:(e,t,r)=>{r.d(t,{A:()=>p});var a=r(95155),s=r(19749),l=r(94077),i=r(1016),n=r(58652);let o={description:"Description",noDescription:"No description available",calories:"Calories",calorieUnit:"kcal",noCalories:"Not specified",ingredients:"Ingredients",noIngredients:"No ingredients listed"},d={description:"الوصف",noDescription:"لا يوجد وصف",calories:"السعرات الحرارية",calorieUnit:"سعرة",noCalories:"غير محدد",ingredients:"المكونات",noIngredients:"لا توجد مكونات مسجلة"},c=e=>!1!==e.showInMenu;function m(e){let t,r,l,i,o=(0,s.c)(8),{calories:d,copy:c}=e;o[0]===Symbol.for("react.memo_cache_sentinel")?(t=(0,a.jsx)(n.A,{className:"h-4 w-4"}),o[0]=t):t=o[0],o[1]!==c.calories?(r=(0,a.jsxs)("div",{className:"mb-1 flex items-center gap-2 font-semibold",children:[t,c.calories]}),o[1]=c.calories,o[2]=r):r=o[2];let m=null!=d?`${d} ${c.calorieUnit}`:c.noCalories;return o[3]!==m?(l=(0,a.jsx)("div",{children:m}),o[3]=m,o[4]=l):l=o[4],o[5]!==r||o[6]!==l?(i=(0,a.jsxs)("div",{className:"rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800",children:[r,l]}),o[5]=r,o[6]=l,o[7]=i):i=o[7],i}function u(e){let t,r,l,i=(0,s.c)(9),{ingredients:n,locale:o,copy:d}=e;return i[0]!==d.ingredients?(t=(0,a.jsx)("h3",{className:"mb-2 text-sm font-semibold text-slate-800",children:d.ingredients}),i[0]=d.ingredients,i[1]=t):t=i[1],i[2]!==d.noIngredients||i[3]!==n||i[4]!==o?(r=n.length>0?(0,a.jsx)("div",{className:"flex flex-wrap gap-1.5",children:n.map(e=>(0,a.jsx)("span",{className:"rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700",children:"ar"===o&&e.rawMaterialNameAr?e.rawMaterialNameAr:e.rawMaterialName},e.id))}):(0,a.jsx)("p",{className:"text-sm text-slate-500",children:d.noIngredients}),i[2]=d.noIngredients,i[3]=n,i[4]=o,i[5]=r):r=i[5],i[6]!==t||i[7]!==r?(l=(0,a.jsxs)("div",{children:[t,r]}),i[6]=t,i[7]=r,i[8]=l):l=i[8],l}function p(e){let t,r,n,p,x,f,h=(0,s.c)(19),{product:b,open:g,onOpenChange:v}=e,{locale:y}=(0,i.Y)(),w="ar"===y?d:o;if(h[0]!==y||h[1]!==b)t=b?"ar"===y&&b.descriptionAr?b.descriptionAr:b.description:"",h[0]=y,h[1]=b,h[2]=t;else t=h[2];let N=t;h[3]!==b?.recipeItems?(r=b?.recipeItems??[],h[3]=b?.recipeItems,h[4]=r):r=h[4],h[5]!==r?(n=r.filter(c),h[5]=r,h[6]=n):n=h[6];let j=n;if(h[7]!==w||h[8]!==N||h[9]!==j||h[10]!==y||h[11]!==b)p=b&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(l.c7,{children:[(0,a.jsx)(l.L3,{className:"pe-8 text-xl leading-snug",children:"ar"===y&&b.nameAr?b.nameAr:b.displayName||b.name}),(0,a.jsx)(l.rr,{children:w.description})]}),(0,a.jsxs)("div",{className:"space-y-4",children:[(0,a.jsx)("p",{className:"text-sm leading-6 text-slate-600",children:N||w.noDescription}),(0,a.jsx)(m,{calories:b.calories,copy:w}),(0,a.jsx)(u,{ingredients:j,locale:y,copy:w})]})]}),h[7]=w,h[8]=N,h[9]=j,h[10]=y,h[11]=b,h[12]=p;else p=h[12];return h[13]!==p?(x=(0,a.jsx)(l.Cf,{className:"sm:max-w-md",children:p}),h[13]=p,h[14]=x):x=h[14],h[15]!==v||h[16]!==g||h[17]!==x?(f=(0,a.jsx)(l.lG,{open:g,onOpenChange:v,children:x}),h[15]=v,h[16]=g,h[17]=x,h[18]=f):f=h[18],f}},32976:(e,t,r)=>{function a(e){return"ar"===e?"ar-EG":"en-US"}function s(e){return e?e.slice(0,10):""}function l(e){return e?e.slice(0,5):""}function i(e,t){let[r,s]=e.split(":").map(Number);if(Number.isNaN(r)||Number.isNaN(s))return e;let l=new Date(2e3,0,1,r,s,0,0);return new Intl.DateTimeFormat(a(t),{hour:"numeric",minute:"2-digit"}).format(l)}function n(e,t){let[r,s,l]=e.split("-").map(Number);if(Number.isNaN(r)||Number.isNaN(s)||Number.isNaN(l))return e;let i=new Date(r,s-1,l);return new Intl.DateTimeFormat(a(t),{year:"numeric",month:"short",day:"numeric"}).format(i)}function o(e,t){let r=l(e.availableFrom),a=l(e.availableTo);if(r&&a){let e=i(r,t),s=i(a,t);return"ar"===t?`يوميًا ${e} - ${s}`:`Daily ${e} - ${s}`}if(r){let e=i(r,t);return"ar"===t?`يبدأ من ${e}`:`From ${e}`}if(a){let e=i(a,t);return"ar"===t?`حتى ${e}`:`Until ${e}`}return null}function d(e,t){let r=s(e.availableStartDate),a=s(e.availableEndDate);if(r&&a){let e=n(r,t),s=n(a,t);return`${e} - ${s}`}if(r){let e=n(r,t);return"ar"===t?`ابتداءً من ${e}`:`From ${e}`}if(a){let e=n(a,t);return"ar"===t?`حتى ${e}`:`Until ${e}`}return null}r.d(t,{XV:()=>d,mB:()=>o})},40154:(e,t,r)=>{r.r(t),r.d(t,{buildReceiptBodyHtml:()=>w,getReceiptCss:()=>N,openReceiptPrintWindow:()=>y,printReceipt:()=>v});var a=r(44737),s=r(38221);function l(e){return e?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}r(80842);var i=r(82019),n=r(29094),o=r(74727),d=r(53937);function c(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function m(e,t){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:t||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(e)}catch{return`${t} ${e.toFixed(2)}`}}let u="pos:printed-receipts:v1";function p(e){return e.publicOrderNumber||e.orderNumber||e.id}function x(e){return`receipt:${p(e)}:paid:${(0,a.Rh)(e).toFixed(2)}`}function f(){let e=window.localStorage.getItem(u);if(!e)return{};try{return JSON.parse(e)}catch{return window.localStorage.removeItem(u),{}}}function h(e){let t=f();delete t[e],window.localStorage.setItem(u,JSON.stringify(t))}let b=`
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
`;function g(e,t,r,n,o,u,p=0,x=0,f,h,b,v){var y;let w,N="Takeaway"===e.orderType,j="Delivery"===e.orderType||"DELIVERY"===e.tableName,A="Talabat"===e.orderSource,$="DeliveryPartner"===e.orderSource,S=e.deliveryAddress??"",C=S.trim().length>0&&(j||A||$),k=e.deliveryPartnerName||e.deliveryPartnerCode||"Delivery Partner",P=$?"Delivery Partner / شريك توصيل":A?"Talabat / طلبات":j?e.deliveryZoneName||"Delivery / توصيل":N?"Takeaway / طلب خارجي":e.tableName||"—",q=(0,a.go)(e),I=(0,a.PX)(e),T=e.paymentMethod||I||"",M=I&&T&&I!==T?I:"",D=Array.from(new Set((e.payments??[]).map(e=>e.referenceNumber?.trim()).filter(e=>!!e))).join(" + "),O=A&&e.talabatPaymentMethod?`${"Cash"===e.talabatPaymentMethod?"Cash":"Prepaid"} / ${e.talabatPaymentMethod}`:"",_=$&&e.partnerPaymentMethod?e.partnerPaymentMethod:"",R=A?O||I:$?_||I:T,F=q.length?(0,a.Rh)(e):0,z=h?.trim()||e.customerName?.trim()||e.customerNameAr?.trim()||e.partnerCustomerName?.trim()||e.talabatCustomerName?.trim()||"",L=f?.trim()||e.customerPhone?.trim()||e.partnerCustomerPhone?.trim()||e.talabatCustomerPhone?.trim()||"",E=function(e,t){if(!e)return"";let r=new Date(e);return Number.isNaN(r.getTime())?"":(0,d.So)(r,t,"en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(e.talabatPickupTime,t.timeZoneId),U=(e.items??[]).reduce((e,t)=>e+(t.quantity??0),0),B=t.showLogoOnReceipt&&r?`<img src="${c(r)}" alt="logo" class="logo" />`:"",V=`
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
            ${C?`
            <tr>
                <td class="meta-label">Address / العنوان</td>
                <td class="meta-value meta-value-address">${c(S)}</td>
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
                <td class="meta-value">${c(k)}</td>
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
            ${M&&!A&&!$?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${c(M)}</td>
            </tr>`:""}
            ${D?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${c(D)}</td>
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
    `,{offerCoveredTotal:J,visibleItems:Y}=function(e){let t=e.items?.find(e=>e.isOfferBundle);if(t)return{offerCoveredTotal:t.lineTotalAmount??0,visibleItems:e.items?.filter(e=>!e.isOfferBundle)??[]};let r=new Map;for(let t of e.offerProducts||[])r.set(t.productId,(r.get(t.productId)??0)+t.quantity);let a=0,s=[];for(let t of e.items||[]){let e=t.quantity??0,l=t.lineTotalAmount??0,i=e>0?l/e:0,n=!!t.notes||(t.modifiers?.length??0)>0,o=t.productId??"",d=0;if(!n&&o){let t=r.get(o)??0;t>0&&(d=Math.min(t,e),r.set(o,t-d))}d>0&&(a+=i*d);let c=e-d;c>0&&s.push({...t,quantity:c,lineTotalAmount:t.isComplimentary?0:Number((i*c).toFixed(2))})}return{offerCoveredTotal:Number(a.toFixed(2)),visibleItems:s}}(e),H=e.offerId&&(e.offerName||e.offerNameAr||(e.offerProducts?.length??0)>0)?`
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
    `:"",K="";for(let e of Y){let t=e.productName||"",r=o.find(t=>t.id===e.productId)?.nameAr??"",a=e.quantity??1,s=e.isComplimentary?0:e.lineTotalAmount??0;for(let l of(K+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${c(t)}</span>
                    ${r?`<span class="name-ar">${c(r)}</span>`:""}
                    ${e.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${a}</td>
                <td class="td-price">${e.isComplimentary?"—":m(s,u)}</td>
            </tr>
        `,e.selectedOptionName&&(K+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${c(e.selectedOptionName)}
                        ${e.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${c(e.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),e.modifiers||[])){if(!l.modifierName)continue;let e=(l.price??0)*(l.quantity??1);K+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${c(l.modifierName)}
                        ${l.modifierNameAr?`<span class="mod-name-ar">+ ${c(l.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${e>0?m(e,u):""}</td>
                </tr>
            `}for(let t of e.recipeSnapshot||[]){if(!t.sourceAlternativeId)continue;let e=t.sourceAlternativeName||t.rawMaterialName||"",r=t.sourceAlternativeNameAr||t.rawMaterialNameAr||"";(e||r)&&(K+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${c(e)}
                        ${r?`<span class="mod-name-ar">↪ ${c(r)}</span>`:""}
                    </td>
                </tr>
            `)}e.notes&&(K+=`
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
    `,q.length>0&&(ev+=q.map(e=>`
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
            ${H}
            ${H?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${K}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${ev}
                </tbody>
            </table>

            ${eN}
            ${eA}
            <div style="height: 30px"></div>
        </div>
    `}function v(e){var t,a;let{order:s,settings:l,logoUrl:d,businessName:m,products:b=[],currency:v=l.currency||"USD",storeServiceChargeRate:y=0,storeTaxRate:w=0,customerPhone:N,customerName:j,amountTendered:A,changeAmount:$,targetWindow:S,forceReprint:C}=e,k=function(e,t){let r=t?`${x(e)}:reprint:${Date.now()}`:x(e);if(t)return{reserved:!0,id:r};let a=f();return a[r]?{reserved:!1,id:r}:(a[r]=Date.now(),window.localStorage.setItem(u,JSON.stringify(a)),{reserved:!0,id:r})}(s,C);if(!k.reserved){if(S&&!S.closed)try{S.close()}catch{}return}let P={...e,receiptTransactionId:k.id};if(S&&!S.closed)try{S.close()}catch{}let q=Math.max(1,Math.min(l.receiptCopies??1,5)),I=[];for(let e=0;e<q;e++){let t=e===q-1;I.push(g(s,l,d,m,b,v,y,w,N,j,A,$)+(t?"":'<div class="page-break"></div>'))}t=I,a=s,c((0,i.v)(a)??`#${a.orderNumber.slice(-4)}`),t.join("\n"),(async()=>{try{let{printReceiptViaHtml:e}=await r.e(7247).then(r.bind(r,97247));if(!await e(P)){h(k.id),n.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,o.iv)({id:k.id,orderId:s.id,publicOrderNumber:p(s),transactionId:k.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(e){h(k.id),console.error("printReceipt html path failed:",e),n.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function y(){return window.open("","_blank","width=460,height=700,scrollbars=yes,resizable=yes")}function w(e){let{order:t,settings:r,logoUrl:a,businessName:s,products:l=[],currency:i=r.currency||"USD",storeServiceChargeRate:n=0,storeTaxRate:o=0,customerPhone:d,customerName:c,amountTendered:m,changeAmount:u}=e,p=Math.max(1,Math.min(r.receiptCopies??1,5)),x=[];for(let e=0;e<p;e++){let f=e===p-1;x.push(g(t,r,a,s,l,i,n,o,d,c,m,u)+(f?"":'<div class="page-break"></div>'))}return x.join("\n")}function N(){return b}},45827:(e,t,r)=>{r.d(t,{T:()=>i});var a=r(95155),s=r(19749);r(12115);var l=r(37570);function i(e){let t,r,i,n,o=(0,s.c)(8);return o[0]!==e?({className:t,...r}=e,o[0]=e,o[1]=t,o[2]=r):(t=o[1],r=o[2]),o[3]!==t?(i=(0,l.cn)("border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-24 w-full rounded-md border bg-transparent px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",t),o[3]=t,o[4]=i):i=o[4],o[5]!==r||o[6]!==i?(n=(0,a.jsx)("textarea",{"data-slot":"textarea",className:i,...r}),o[5]=r,o[6]=i,o[7]=n):n=o[7],n}},49035:(e,t,r)=>{function a(e){let t=new Set;for(let r of e)null!=r.offerLineOfferId&&t.add(r.offerLineOfferId);let r=[];for(let a of t){let t=e.filter(e=>e.offerLineOfferId===a),s=Number(t.reduce((e,t)=>e+(t.isComplimentary?0:t.totalPrice),0).toFixed(2));r.push({offerId:a,items:t,offerTotal:s})}return{offerGroups:r,regularItems:e.filter(e=>null==e.offerLineOfferId)}}function s(e){let t=(e.items??[]).filter(e=>e.isOfferBundle);if(t.length>0){let r=t.reduce((e,t)=>e+(t.lineTotalAmount??0),0);return{offerBundles:t,offerCoveredTotal:Number(r.toFixed(2)),regularItems:e.items?.filter(e=>!e.isOfferBundle)??[]}}if(!e.offerId)return{offerBundles:[],offerCoveredTotal:0,regularItems:e.items??[]};let r=new Map;for(let t of e.offerProducts||[])r.set(t.productId,(r.get(t.productId)??0)+t.quantity);let a=0,s=[];for(let t of e.items||[]){let e=t.quantity??0,l=t.lineTotalAmount??0,i=e>0?l/e:0,n=!!t.notes||(t.modifiers?.length??0)>0,o=t.productId??"",d=0;if(!n&&o){let t=r.get(o)??0;t>0&&(d=Math.min(t,e),r.set(o,t-d))}d>0&&(a+=i*d);let c=e-d;c>0&&s.push({...t,quantity:c,lineTotalAmount:t.isComplimentary?0:Number((i*c).toFixed(2))})}return 0===a&&s.length>0&&(e.items?.length??0)>0?{offerBundles:[],offerCoveredTotal:Number((e.items??[]).reduce((e,t)=>e+(t.lineTotalAmount??0),0).toFixed(2)),regularItems:[]}:{offerBundles:[],offerCoveredTotal:Number(a.toFixed(2)),regularItems:s}}function l(e,t){return e.map(e=>{let r="ar"===t?e.nameAr||e.name:e.name||e.nameAr;return`${e.quantity}\xd7 ${r}`}).join(" • ")}r.d(t,{L4:()=>l,gW:()=>s,mh:()=>a})},53964:(e,t,r)=>{r.d(t,{A:()=>f});var a=r(95155),s=r(12115),l=r(1016),i=r(80842),n=r(52014),o=r(58079),d=r(42601),c=r(29094),m=r(82019),u=r(59564),p=r(6056),x=r(42630);function f({order:e,cancelItemId:t,cancelItemName:r,onClose:f,onSuccess:h,currency:b="JOD"}){let{t:g,locale:v}=(0,l.Y)(),y=!!t,[w,N]=(0,s.useState)([]),[j,A]=(0,s.useState)(""),[$,S]=(0,s.useState)(""),[C,k]=(0,s.useState)(!1),[P,q]=(0,s.useState)(null),[I,T]=(0,s.useState)(!0),M=(0,s.useRef)(null),D=(0,s.useRef)(null),O=(0,s.useRef)(null);(0,s.useEffect)(()=>{(0,i.Eik)().then(e=>{N(e),T(!1)})},[]),(0,s.useEffect)(()=>{D.current?.focus()},[I]),(0,s.useEffect)(()=>{let e=e=>{"Escape"===e.key&&f()};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[f]);let _=w.find(e=>e.code===j)?.requiresNote??!1,R=async()=>{if(!j)return void q(g("cancelOrderErrorReasonRequired"));if(_&&$.trim().length<5)return void q(g("cancelOrderErrorNoteRequired"));q(null),k(!0);let r=!1,a=!1,s=null;try{let l={cancelReason:j,cancelReasonNote:_?$.trim():void 0,mode:"KITCHEN"},n=JSON.stringify({orderId:e.id,itemId:t??null,...l});O.current?.fingerprint!==n&&(O.current={fingerprint:n,key:await (0,u.ls)()});let o=O.current.key;y||"online"===(0,x.bt)()?s=y?await (0,i.OJb)(e.id,t,l,o):await (0,i.N4m)(e.id,l,o):(await (0,p.A5)(e.id,{cancelReason:j,cancelReasonNote:_?$.trim():void 0,mode:"KITCHEN"}),s={cancelLogId:o,requiresKitchenApproval:!0,approvalStatus:"Pending",orderCancelled:!0}),a=!1===s.requiresKitchenApproval,r=!0}catch(e){q(function(e,t){if(!e||"object"!=typeof e)return t;let r=e.response?.data;if(r&&"object"==typeof r&&"message"in r){let e=r.message;if("string"==typeof e)return e}return"string"==typeof r?r:"string"==typeof e.message?e.message:t}(e,g("cancelOrderErrorGeneric")))}finally{k(!1)}r&&s&&(a?c.toast.success("ar"===v?"تم الإلغاء وتسجيله كهدر (الطلب جاهز)":"Cancelled and logged as waste (order Ready)"):c.toast.success("ar"===v?"تم إرسال طلب الإلغاء لموافقة الإدارة":"Cancellation request sent for admin approval"),await h(s),f())};return(0,a.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4","aria-modal":"true",role:"dialog","aria-labelledby":"cancel-modal-title",children:(0,a.jsxs)("div",{ref:M,className:"w-full max-w-lg rounded-2xl bg-white shadow-2xl",dir:"ar"===v?"rtl":"ltr",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between border-b border-slate-200 px-6 py-4",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)(n.A,{className:"h-5 w-5 text-red-500"}),(0,a.jsxs)("h2",{id:"cancel-modal-title",className:"text-lg font-semibold text-slate-900",children:[g("cancelOrderModalTitle")," — ",(0,m.v)(e)??`#${e.orderNumber}`]})]}),(0,a.jsx)("button",{onClick:f,"aria-label":"Close",className:"rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",disabled:C,children:(0,a.jsx)(o.A,{className:"h-5 w-5"})})]}),(0,a.jsx)("div",{className:"border-b border-slate-100 bg-slate-50 px-6 py-3",children:y?(0,a.jsxs)("p",{className:"text-sm text-slate-600",children:[g("cancelOrderButtonItem"),": ",(0,a.jsx)("span",{className:"font-medium text-slate-800",children:r})]}):(0,a.jsxs)("div",{className:"space-y-1",children:[e.tableName&&(0,a.jsx)("p",{className:"text-xs text-slate-500",children:e.tableName}),(0,a.jsx)("div",{className:"max-h-28 overflow-y-auto",children:e.items.map(e=>(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-700",children:[(0,a.jsxs)("span",{children:[e.productName," \xd7 ",e.quantity]}),(0,a.jsxs)("span",{children:[(e.price*e.quantity).toFixed(2)," ",b]})]},e.id))}),(0,a.jsxs)("div",{className:"flex justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-slate-800",children:[(0,a.jsx)("span",{children:"Total"}),(0,a.jsxs)("span",{children:[e.totalAmount.toFixed(2)," ",b]})]})]})}),(0,a.jsxs)("div",{className:"space-y-4 px-6 py-5",children:[y&&(0,a.jsx)("div",{className:"rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900",children:"ar"===v?"سيتم إرسال طلب إلغاء الصنف إلى الإدارة للموافقة قبل تغيير الطلب.":"This item cancellation will be sent to Admin for approval before the order is changed."}),(0,a.jsxs)("div",{children:[(0,a.jsxs)("label",{className:"mb-1.5 block text-sm font-medium text-slate-700",children:[g("cancelOrderReasonLabel")," ",(0,a.jsx)("span",{className:"text-red-500",children:"*"})]}),I?(0,a.jsxs)("div",{className:"flex h-10 items-center gap-2 text-slate-400 text-sm",children:[(0,a.jsx)(d.A,{className:"h-4 w-4 animate-spin"}),g("loadingText")]}):(0,a.jsxs)("select",{ref:D,value:j,onChange:e=>{A(e.target.value),S(""),q(null)},disabled:C,"aria-label":g("cancelOrderReasonLabel"),className:"w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60",children:[(0,a.jsx)("option",{value:"",children:g("cancelOrderReasonPlaceholder")}),w.map(e=>(0,a.jsx)("option",{value:e.code,children:"ar"===v?e.nameAr:e.name},e.id))]})]}),_&&(0,a.jsxs)("div",{children:[(0,a.jsxs)("label",{className:"mb-1.5 block text-sm font-medium text-slate-700",children:[g("cancelOrderNoteLabel")," ",(0,a.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,a.jsx)("textarea",{value:$,onChange:e=>{S(e.target.value),q(null)},disabled:C,placeholder:g("cancelOrderNotePlaceholder"),maxLength:500,rows:3,"aria-label":g("cancelOrderNoteLabel"),className:"w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"}),(0,a.jsxs)("p",{className:`mt-1 text-xs ${$.trim().length<5?"text-amber-600":"text-slate-400"}`,children:[$.trim().length,"/500"]})]}),P&&(0,a.jsx)("div",{className:"rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700",role:"alert",children:P})]}),(0,a.jsxs)("div",{className:"flex gap-3 border-t border-slate-200 px-6 py-4",children:[(0,a.jsxs)("button",{onClick:R,disabled:C||!j||I,"aria-busy":C,className:"flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60",children:[C&&(0,a.jsx)(d.A,{className:"h-4 w-4 animate-spin"}),"ar"===v?"إرسال للموافقة":"Send for Approval"]}),(0,a.jsx)("button",{onClick:f,disabled:C,className:"rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60",children:g("cancelOrderGoBack")})]})]})})}},58577:(e,t,r)=>{r.d(t,{$s:()=>l,H8:()=>u,Hc:()=>x,WS:()=>c,YP:()=>p,gU:()=>s,h4:()=>f,iI:()=>n,ll:()=>i}),r(32226);var a=r(53937);function s(e){return e?e.slice(0,10):""}function l(e){return e?e.slice(0,5):""}function i(e){return e&&5===e.length?`${e}:00`:e}function n(e){return`${l(e.startTime)} - ${l(e.endTime)}`}function o(e){let[t,r,a]=s(e).split("-").map(Number);return t&&r&&a?1e4*t+100*r+a:null}function d(e){let[t,r]=l(e).split(":").map(Number);return Number.isFinite(t)&&Number.isFinite(r)?60*t+r:null}function c(e,t=a.Hs,r=new Date){var s,l;let i;if(!e.isActive)return!1;let n=Number((0,a.hc)(r,t).replaceAll("-","")),m=o(e.startDate),u=o(e.endDate);if(null!==m&&n<m||null!==u&&n>u)return!1;let p=d(e.startTime),x=d(e.endTime);if(null===p||null===x)return!0;let f=(s=r,l=t,60*Number((i=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:l,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(s).map(e=>[e.type,e.value]))).hour)+Number(i.minute));return p<=x?f>=p&&f<=x:f>=p||f<=x}let m=[{flag:1,en:"Gluten",ar:"جلوتين"},{flag:2,en:"Dairy",ar:"ألبان"},{flag:4,en:"Nuts",ar:"مكسرات"}];function u(e){let t=e.products.reduce((e,t)=>e|(t.allergens||0),0);return m.filter(e=>(t&e.flag)!=0)}function p(e){return e.discountedPrice??e.basePrice}function x(e,t){let r=e.products.map(e=>{let r=t.find(t=>t.id===e.productId);return r?{product:r,quantity:e.quantity}:null}).filter(e=>!!e),a=r.reduce((e,t)=>e+p(t.product)*t.quantity,0),s=0;return r.map((t,l)=>{let i=p(t.product)*t.quantity,n=l===r.length-1?e.finalPrice-s:Number((i/Math.max(a,1)*e.finalPrice).toFixed(2));return s+=n,{product:{...t.product,discountedPrice:t.quantity>0?n/t.quantity:n},quantity:t.quantity}})}function f(e,t,r){let a=e.reduce((e,t)=>e+t.price*t.quantity,0),s=Number(Math.max(0===t?r:a*(1-r/100),0).toFixed(2)),l=Number(Math.max(a-s,0).toFixed(2));return{originalTotal:Number(a.toFixed(2)),finalPrice:s,savings:l}}},60276:(e,t,r)=>{r.d(t,{Dl:()=>o,Fx:()=>n,No:()=>i});var a=r(50775);function s(e){return"https:"===window.location.protocol&&"localhost"!==e&&"127.0.0.1"!==e&&"::1"!==e}function l(e){return function(e){let t=e?.trim();if(!t)return null;let r=(0,a.R)(t);try{let e=new URL(r);return"http:"===e.protocol&&s(e.hostname)&&(e.protocol="https:"),`${e.origin}${e.pathname.slice(0,e.pathname.lastIndexOf("/"))}`}catch{let e=r.lastIndexOf("/");return e>0?r.slice(0,e):null}}(e)??"/uploads/images"}function i(e,t,r="medium"){if(e&&e.length>0)return`${l(t)}/${e}-${r}.webp`;if(t&&t.length>0){let e=(0,a.R)(t);try{let t=new URL(e);return"http:"===t.protocol&&s(t.hostname)&&(t.protocol="https:"),t.toString()}catch{return e}}return null}function n(e,t){if(!e||0===e.length)return;let r=`${l(t)}/${e}`;return`${r}-thumb.webp 200w, ${r}-medium.webp 600w, ${r}-full.webp 1600w`}function o(e,t,r="medium"){let a=i(e,t,r);return a?{src:a,srcSet:n(e,t)}:null}},69817:(e,t,r)=>{r.d(t,{c:()=>F});var a=r(95155),s=r(19749),l=r(12115),i=r(1016);let n="__all__",o=e=>e?.trim().toLowerCase()??"";var d=r(99483),c=r(73981),m=r(54371),u=r(1737),p=r(47606),x=r(32226),f=r(58577);let h=(0,l.memo)(function(e){let t,r,l,i,n,o,d,p,h,b,g,v,y,w,N,j,A,$,S,C,k,P,q,I,T,M=(0,s.c)(76),{currency:D,disabled:O,isAr:_,offer:R,onSelectOffer:F}=e,z=Math.max(0,R.originalTotal-R.finalPrice),L=R.imageUrl||"/offer-placeholder.svg",E=O||!R.isAvailableNow;if(M[0]!==_||M[1]!==R)t=_?R.nameAr||R.name:R.name||R.nameAr,M[0]=_,M[1]=R,M[2]=t;else t=M[2];let U=t;if(M[3]!==_||M[4]!==R)r=_?R.descriptionAr||R.description:R.description||R.descriptionAr,M[3]=_,M[4]=R,M[5]=r;else r=M[5];let B=r,V=_?"غير متاح الآن":"Not available now";M[6]!==E||M[7]!==R||M[8]!==F?(l=()=>{E||F(R)},M[6]=E,M[7]=R,M[8]=F,M[9]=l):l=M[9];let G=l,Q=`group relative flex min-h-36 overflow-hidden rounded-lg border bg-white text-start shadow-xs transition ${E?"cursor-not-allowed border-slate-200":"border-amber-200 hover:border-amber-300 hover:shadow-md active:scale-[0.99]"}`;if(M[10]!==L||M[11]!==U?(i=(0,a.jsx)("div",{className:"relative w-32 shrink-0 bg-slate-100 sm:w-36",children:(0,a.jsx)(c.default,{src:L,alt:U,fill:!0,unoptimized:!0,sizes:"9rem",className:"object-cover transition duration-300 group-hover:scale-105"})}),M[10]=L,M[11]=U,M[12]=i):i=M[12],M[13]!==U?(n=(0,a.jsx)("div",{className:"line-clamp-1 text-sm font-bold text-slate-900",children:U}),M[13]=U,M[14]=n):n=M[14],M[15]!==B?(o=B&&(0,a.jsx)("div",{className:"mt-1 line-clamp-1 text-xs text-slate-500",children:B}),M[15]=B,M[16]=o):o=M[16],M[17]!==n||M[18]!==o?(d=(0,a.jsxs)("div",{className:"min-w-0",children:[n,o]}),M[17]=n,M[18]=o,M[19]=d):d=M[19],M[20]===Symbol.for("react.memo_cache_sentinel")?(p=(0,a.jsx)(m.A,{className:"h-4 w-4 shrink-0 text-amber-600"}),M[20]=p):p=M[20],M[21]!==d?(h=(0,a.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[d,p]}),M[21]=d,M[22]=h):h=M[22],M[23]!==_||M[24]!==R.id||M[25]!==R.products){let e;M[27]!==_||M[28]!==R.id?(e=e=>(0,a.jsxs)("span",{className:"rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700",children:[_?e.nameAr||e.name:e.name||e.nameAr," \xd7 ",e.quantity]},`${R.id}-${e.productId}`),M[27]=_,M[28]=R.id,M[29]=e):e=M[29],b=R.products.slice(0,2).map(e),M[23]=_,M[24]=R.id,M[25]=R.products,M[26]=b}else b=M[26];return M[30]!==R.products.length?(g=R.products.length>2&&(0,a.jsxs)("span",{className:"rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500",children:["+",R.products.length-2]}),M[30]=R.products.length,M[31]=g):g=M[31],M[32]!==b||M[33]!==g?(v=(0,a.jsxs)("div",{className:"mt-2 flex flex-wrap gap-1.5",children:[b,g]}),M[32]=b,M[33]=g,M[34]=v):v=M[34],M[35]!==D||M[36]!==R.finalPrice||M[37]!==R.originalTotal?(y=R.originalTotal>R.finalPrice&&(0,a.jsx)("div",{className:"text-[11px] font-medium text-slate-400 line-through",children:(0,x.vv)(R.originalTotal,D)}),M[35]=D,M[36]=R.finalPrice,M[37]=R.originalTotal,M[38]=y):y=M[38],M[39]!==D||M[40]!==R.finalPrice?(w=(0,x.vv)(R.finalPrice,D),M[39]=D,M[40]=R.finalPrice,M[41]=w):w=M[41],M[42]!==w?(N=(0,a.jsx)("div",{className:"text-lg font-bold text-success",children:w}),M[42]=w,M[43]=N):N=M[43],M[44]!==y||M[45]!==N?(j=(0,a.jsxs)("div",{children:[y,N]}),M[44]=y,M[45]=N,M[46]=j):j=M[46],M[47]!==D||M[48]!==_||M[49]!==z?(A=z>0&&(0,a.jsxs)("div",{className:"mb-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700",children:[_?"وفر":"Save"," ",(0,x.vv)(z,D)]}),M[47]=D,M[48]=_,M[49]=z,M[50]=A):A=M[50],M[51]===Symbol.for("react.memo_cache_sentinel")?($=(0,a.jsx)(u.A,{className:"h-3 w-3"}),M[51]=$):$=M[51],M[52]!==R?(S=(0,f.iI)(R),M[52]=R,M[53]=S):S=M[53],M[54]!==S?(C=(0,a.jsxs)("div",{className:"inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-amber-200",children:[$,S]}),M[54]=S,M[55]=C):C=M[55],M[56]!==A||M[57]!==C?(k=(0,a.jsxs)("div",{className:"text-end",children:[A,C]}),M[56]=A,M[57]=C,M[58]=k):k=M[58],M[59]!==j||M[60]!==k?(P=(0,a.jsxs)("div",{className:"mt-auto flex items-end justify-between gap-3 pt-3",children:[j,k]}),M[59]=j,M[60]=k,M[61]=P):P=M[61],M[62]!==h||M[63]!==v||M[64]!==P?(q=(0,a.jsxs)("div",{className:"flex min-w-0 flex-1 flex-col p-3",children:[h,v,P]}),M[62]=h,M[63]=v,M[64]=P,M[65]=q):q=M[65],M[66]!==R.isAvailableNow||M[67]!==V?(I=!R.isAvailableNow&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("div",{className:"absolute inset-0 bg-white/25","aria-hidden":"true"}),(0,a.jsx)("div",{className:"absolute end-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm",children:V})]}),M[66]=R.isAvailableNow,M[67]=V,M[68]=I):I=M[68],M[69]!==G||M[70]!==E||M[71]!==q||M[72]!==I||M[73]!==Q||M[74]!==i?(T=(0,a.jsxs)("button",{type:"button",disabled:E,onClick:G,className:Q,children:[i,q,I]}),M[69]=G,M[70]=E,M[71]=q,M[72]=I,M[73]=Q,M[74]=i,M[75]=T):T=M[75],T});function b(e){let t,r,l,n,o,d,c,u=(0,s.c)(25),{currency:x,offers:f,onSelectOffer:b,disabled:g}=e,v=void 0!==g&&g,{locale:y}=(0,i.Y)(),w="ar"===y;if(0===f.length)return null;u[0]===Symbol.for("react.memo_cache_sentinel")?(t=(0,a.jsx)(m.A,{className:"h-4 w-4 text-amber-600"}),u[0]=t):t=u[0];let N=w?"العروض":"Offers";u[1]!==N?(r=(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[t,(0,a.jsx)("h2",{className:"text-base font-bold text-slate-900",children:N})]}),u[1]=N,u[2]=r):r=u[2];let j=w?"عرض":`offer${1===f.length?"":"s"}`;if(u[3]!==f.length||u[4]!==j?(l=(0,a.jsxs)(p.E,{className:"bg-emerald-100 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100",children:[f.length," ",j]}),u[3]=f.length,u[4]=j,u[5]=l):l=u[5],u[6]!==r||u[7]!==l?(n=(0,a.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[r,l]}),u[6]=r,u[7]=l,u[8]=n):n=u[8],u[9]!==x||u[10]!==v||u[11]!==w||u[12]!==f||u[13]!==b){let e;u[15]!==x||u[16]!==v||u[17]!==w||u[18]!==b?(e=e=>(0,a.jsx)(h,{offer:e,currency:x,disabled:v,isAr:w,onSelectOffer:b},e.id),u[15]=x,u[16]=v,u[17]=w,u[18]=b,u[19]=e):e=u[19],o=f.map(e),u[9]=x,u[10]=v,u[11]=w,u[12]=f,u[13]=b,u[14]=o}else o=u[14];return u[20]!==o?(d=(0,a.jsx)("div",{className:"grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3",children:o}),u[20]=o,u[21]=d):d=u[21],u[22]!==n||u[23]!==d?(c=(0,a.jsxs)("section",{className:"mb-4 space-y-3",children:[n,d]}),u[22]=n,u[23]=d,u[24]=c):c=u[24],c}var g=r(37570);function v(e){let t,r,l,i,n,o=(0,s.c)(16),{count:d,id:c,label:m,selected:u,variant:p}=e,x=void 0===p?"default":p;o[0]!==u||o[1]!==x?(t=((e,t="default")=>(0,g.cn)("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",e&&"offer"===t?"border-amber-500 bg-amber-500 text-white shadow-sm":e?"border-primary bg-primary text-primary-foreground shadow-sm":"offer"===t?"border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100":"border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5"))(u,x),o[0]=u,o[1]=x,o[2]=t):t=o[2],o[3]!==m?(r=(0,a.jsx)("span",{className:"max-w-36 truncate",children:m}),o[3]=m,o[4]=r):r=o[4];let f=u?"bg-white/20 text-primary-foreground":"bg-slate-100 text-slate-500";return o[5]!==f?(l=(0,g.cn)("rounded-full px-1.5 py-0.5 text-[11px] leading-none",f),o[5]=f,o[6]=l):l=o[6],o[7]!==d||o[8]!==l?(i=(0,a.jsx)("span",{className:l,children:d}),o[7]=d,o[8]=l,o[9]=i):i=o[9],o[10]!==c||o[11]!==u||o[12]!==t||o[13]!==r||o[14]!==i?(n=(0,a.jsxs)("button",{type:"button",role:"tab","aria-selected":u,"data-category-id":c,className:t,children:[r,i]}),o[10]=c,o[11]=u,o[12]=t,o[13]=r,o[14]=i,o[15]=n):n=o[15],n}let y=(0,l.memo)(function(e){let t,r,l,i,o=(0,s.c)(15),{allLabel:d,categories:c,selectedCategory:m,totalCount:u,onCategoryChange:p}=e;o[0]!==p?(t=e=>{let t=e.target.closest("button[data-category-id]"),r=t?.dataset.categoryId;r&&p(r)},o[0]=p,o[1]=t):t=o[1];let x=t,f=m===n;if(o[2]!==d||o[3]!==f||o[4]!==u?(r=(0,a.jsx)(v,{id:n,label:d,count:u,selected:f}),o[2]=d,o[3]=f,o[4]=u,o[5]=r):r=o[5],o[6]!==c||o[7]!==m){let e;o[9]!==m?(e=e=>(0,a.jsx)(v,{id:e.id,label:e.label,count:e.count,selected:m===e.id,variant:e.variant},e.id),o[9]=m,o[10]=e):e=o[10],l=c.map(e),o[6]=c,o[7]=m,o[8]=l}else l=o[8];return o[11]!==x||o[12]!==r||o[13]!==l?(i=(0,a.jsxs)("div",{role:"tablist","aria-label":"Product categories",onClick:x,className:"flex min-w-0 gap-2 overflow-x-auto pb-1",children:[r,l]}),o[11]=x,o[12]=r,o[13]=l,o[14]=i):i=o[14],i});var w=r(81705),N=r(80309),j=r(58652),A=r(99487),$=r(32976),S=r(60276);function C(e){return e.isActive}let k=(0,l.memo)(function(e){let t,r,l,i,n,o,d,c,m,u,p,f,h,b,v,y,k,P,q,I,T,M,D=(0,s.c)(76),{currency:O,disabled:_,index:R,labels:F,locale:z,product:L,onProductSelect:E,onProductQuickView:U}=e,B="ar"===z,V=L.displayPrice??L.discountedPrice??L.basePrice,G=null==L.displayPrice&&!!L.discountedPrice&&L.discountedPrice<L.basePrice,Q=!!(L.allergens&&L.allergens>0);D[0]!==L.options?(t=L.options?.filter(C).length??0,D[0]=L.options,D[1]=t):t=D[1];let J=t,Y=_||!L.isAvailableNow,H=R<12,K=B&&L.nameAr?L.nameAr:L.displayName||L.name;D[2]!==B||D[3]!==L?(r=(0,$.mB)(L,B?"ar":"en")||(0,$.XV)(L,B?"ar":"en"),D[2]=B,D[3]=L,D[4]=r):r=D[4];let X=r;D[5]!==L.imageKey||D[6]!==L.imageUrl?(l=(0,S.Dl)(L.imageKey,L.imageUrl,"medium"),D[5]=L.imageKey,D[6]=L.imageUrl,D[7]=l):l=D[7];let Z=l;D[8]!==Y||D[9]!==E||D[10]!==L?(i=()=>{Y||E(L)},D[8]=Y,D[9]=E,D[10]=L,D[11]=i):i=D[11];let W=i;D[12]!==W?(n=e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),W())},D[12]=W,D[13]=n):n=D[13];let ee=n;D[14]!==U||D[15]!==L?(o=e=>{e.stopPropagation(),U(L)},D[14]=U,D[15]=L,D[16]=o):o=D[16];let et=o,er=Y?-1:0,ea=Y?"cursor-not-allowed opacity-50":"cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.98]";D[17]!==ea?(d=(0,g.cn)("group relative min-h-[13rem] overflow-hidden border-slate-200 py-0 transition duration-100",ea),D[17]=ea,D[18]=d):d=D[18],D[19]!==G?(c=G&&(0,a.jsx)("div",{className:"absolute start-2 top-2 z-10 rounded-md bg-destructive px-2 py-1 text-[11px] font-bold text-white shadow",children:"SALE"}),D[19]=G,D[20]=c):c=D[20],D[21]!==Q?(m=Q&&(0,a.jsx)("div",{className:"absolute end-2 top-2 z-10 rounded-full bg-warning px-2 py-1 text-[11px] font-bold text-warning-foreground shadow",children:"!"}),D[21]=Q,D[22]=m):m=D[22];let es=F.quickView,el=F.quickView,ei=Q?"top-11":"top-2";D[23]!==ei?(u=(0,g.cn)("absolute end-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white hover:text-primary",ei),D[23]=ei,D[24]=u):u=D[24],D[25]===Symbol.for("react.memo_cache_sentinel")?(p=(0,a.jsx)(w.A,{className:"h-4 w-4"}),D[25]=p):p=D[25],D[26]!==et||D[27]!==F.quickView||D[28]!==u?(f=(0,a.jsx)("button",{type:"button","aria-label":es,title:el,onClick:et,className:u,children:p}),D[26]=et,D[27]=F.quickView,D[28]=u,D[29]=f):f=D[29],D[30]!==F.unavailable||D[31]!==L.isAvailableNow?(h=!L.isAvailableNow&&(0,a.jsx)("div",{className:"absolute start-2 top-11 z-10 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow",children:F.unavailable}),D[30]=F.unavailable,D[31]=L.isAvailableNow,D[32]=h):h=D[32],D[33]!==K||D[34]!==Z||D[35]!==H?(b=Z?(0,a.jsx)("div",{className:"h-32 w-full overflow-hidden bg-slate-100",children:(0,a.jsx)("img",{src:Z.src,srcSet:Z.srcSet,sizes:"(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 17vw",alt:K,className:"h-full w-full object-cover transition duration-300 group-hover:scale-105",loading:H?"eager":"lazy",decoding:"async",fetchPriority:H?"high":"low"})}):(0,a.jsx)("div",{className:"flex h-32 w-full items-center justify-center bg-slate-100 text-slate-300",children:(0,a.jsx)(N.A,{className:"h-10 w-10"})}),D[33]=K,D[34]=Z,D[35]=H,D[36]=b):b=D[36],D[37]!==K?(v=(0,a.jsx)(A.aR,{className:"p-3 pb-1",children:(0,a.jsx)(A.ZB,{className:"line-clamp-2 min-h-10 text-center text-sm font-bold leading-5 text-slate-800",children:K})}),D[37]=K,D[38]=v):v=D[38],D[39]!==O||D[40]!==G||D[41]!==L.basePrice?(y=G&&(0,a.jsx)("div",{className:"text-xs font-medium text-slate-400 line-through",children:(0,x.vv)(L.basePrice,O)}),D[39]=O,D[40]=G,D[41]=L.basePrice,D[42]=y):y=D[42];let en=G?"text-destructive":"text-success";return D[43]!==en?(k=(0,g.cn)("text-lg font-bold",en),D[43]=en,D[44]=k):k=D[44],D[45]!==O||D[46]!==V?(P=(0,x.vv)(V,O),D[45]=O,D[46]=V,D[47]=P):P=D[47],D[48]!==k||D[49]!==P?(q=(0,a.jsx)("div",{className:k,children:P}),D[48]=k,D[49]=P,D[50]=q):q=D[50],D[51]!==J||D[52]!==X||D[53]!==Q||D[54]!==F.containsAllergens||D[55]!==F.options||D[56]!==L.calories||D[57]!==L.isAvailableNow?(I=(null!=L.calories||J>0||Q||!L.isAvailableNow&&X)&&(0,a.jsxs)("div",{className:"flex min-h-5 flex-wrap justify-center gap-1",children:[null!=L.calories&&(0,a.jsxs)("span",{className:"inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700",children:[(0,a.jsx)(j.A,{className:"h-3 w-3"}),L.calories]}),J>0&&(0,a.jsx)("span",{className:"rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary",children:F.options}),Q&&(0,a.jsx)("span",{className:"rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning",children:F.containsAllergens}),!L.isAvailableNow&&X&&(0,a.jsx)("span",{className:"line-clamp-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700",children:X})]}),D[51]=J,D[52]=X,D[53]=Q,D[54]=F.containsAllergens,D[55]=F.options,D[56]=L.calories,D[57]=L.isAvailableNow,D[58]=I):I=D[58],D[59]!==y||D[60]!==q||D[61]!==I?(T=(0,a.jsxs)(A.Wu,{className:"space-y-1 px-3 pb-3 pt-0 text-center",children:[y,q,I]}),D[59]=y,D[60]=q,D[61]=I,D[62]=T):T=D[62],D[63]!==ee||D[64]!==W||D[65]!==Y||D[66]!==c||D[67]!==m||D[68]!==f||D[69]!==h||D[70]!==b||D[71]!==v||D[72]!==T||D[73]!==er||D[74]!==d?(M=(0,a.jsxs)(A.Zp,{role:"button",tabIndex:er,"aria-disabled":Y,onClick:W,onKeyDown:ee,className:d,children:[c,m,f,h,b,v,T]}),D[63]=ee,D[64]=W,D[65]=Y,D[66]=c,D[67]=m,D[68]=f,D[69]=h,D[70]=b,D[71]=v,D[72]=T,D[73]=er,D[74]=d,D[75]=M):M=D[75],M}),P=(0,l.memo)(function(e){let t,r,l=(0,s.c)(19),{currency:i,disabled:n,emptyLabel:o,labels:d,locale:c,products:m,onProductSelect:u,onProductQuickView:p}=e;if(0===m.length){let e;return l[0]!==o?(e=(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:o}),l[0]=o,l[1]=e):e=l[1],e}if(l[2]!==i||l[3]!==n||l[4]!==d||l[5]!==c||l[6]!==p||l[7]!==u||l[8]!==m){let e;l[10]!==i||l[11]!==n||l[12]!==d||l[13]!==c||l[14]!==p||l[15]!==u?(e=(e,t)=>(0,a.jsx)(k,{product:e,index:t,currency:i,locale:c,labels:d,disabled:n,onProductSelect:u,onProductQuickView:p},e.id),l[10]=i,l[11]=n,l[12]=d,l[13]=c,l[14]=p,l[15]=u,l[16]=e):e=l[16],t=m.map(e),l[2]=i,l[3]=n,l[4]=d,l[5]=c,l[6]=p,l[7]=u,l[8]=m,l[9]=t}else t=l[9];return l[17]!==t?(r=(0,a.jsx)("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 [@media(min-width:1800px)]:grid-cols-6",children:t}),l[17]=t,l[18]=r):r=l[18],r});var q=r(40757),I=r(58079),T=r(34819);let M=(0,l.memo)(function(e){let t,r,l,i,n,o,d=(0,s.c)(15),{value:c,placeholder:m,onChange:u}=e;d[0]!==u?(t=e=>{u(e.target.value)},d[0]=u,d[1]=t):t=d[1];let p=t;d[2]!==u?(r=()=>{u("")},d[2]=u,d[3]=r):r=d[3];let x=r;return d[4]===Symbol.for("react.memo_cache_sentinel")?(l=(0,a.jsx)(q.A,{className:"pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"}),d[4]=l):l=d[4],d[5]!==p||d[6]!==m||d[7]!==c?(i=(0,a.jsx)(T.p,{type:"text",value:c,onChange:p,placeholder:m,autoComplete:"off",className:"h-11 min-h-11 rounded-lg bg-white px-10 py-2.5 text-sm"}),d[5]=p,d[6]=m,d[7]=c,d[8]=i):i=d[8],d[9]!==x||d[10]!==c?(n=c&&(0,a.jsx)("button",{type:"button","aria-label":"Clear search",onClick:x,className:"absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",children:(0,a.jsx)(I.A,{className:"h-4 w-4"})}),d[9]=x,d[10]=c,d[11]=n):n=d[11],d[12]!==i||d[13]!==n?(o=(0,a.jsxs)("div",{className:"relative min-w-0 flex-1",children:[l,i,n]}),d[12]=i,d[13]=n,d[14]=o):o=d[14],o}),D="__offers__",O="__other_subcategory__",_=e=>"ar"===e?"أخرى":"Other",R=e=>e.isActive&&(null==e.status||e.status===d.ry.ACTIVE);function F(e){let t,r,d,c,m,u,p,x,f,h,g,v,w,N,j,A,$,S,C,k,q,I,T,F,E=(0,s.c)(94),{currency:U,disabled:B,offers:V,onSelectOffer:G,products:Q,onProductSelect:J,onProductQuickView:Y}=e,H=void 0!==B&&B;E[0]!==V?(t=void 0===V?[]:V,E[0]=V,E[1]=t):t=E[1];let K=t,{locale:X,t:Z}=(0,i.Y)(),W=(0,l.useRef)(null),[ee,et]=(0,l.useState)(""),[er,ea]=(0,l.useState)(n),[es,el]=(0,l.useState)(n),ei=function(e,t){let r,a,i=(0,s.c)(4),[n,o]=(0,l.useState)(e);return 300!==i[0]||i[1]!==e?(r=()=>{let t=window.setTimeout(()=>{o(e)},300);return()=>window.clearTimeout(t)},a=[e,300],i[0]=300,i[1]=e,i[2]=r,i[3]=a):(r=i[2],a=i[3]),(0,l.useEffect)(r,a),n}(ee,0),en=K.length>0&&!!G;E[2]!==Q?(r=Q.filter(R),E[2]=Q,E[3]=r):r=E[3];let eo=r;if(E[4]!==eo||E[5]!==en||E[6]!==X||E[7]!==K.length){e:{let e,t,r=(t=new Map,eo.forEach(e=>{let r=e.categoryId??"__uncategorized__",a=t.get(r);if(a){a.count+=1;return}t.set(r,{id:r,label:"ar"===X?e.categoryNameAr||e.categoryDisplayName||e.categoryName||_(X):e.categoryDisplayName||e.categoryName||e.categoryNameAr||_(X),count:1})}),Array.from(t.values()));if(!en){d=r;break e}let a="ar"===X?"العروض":"Offers";E[9]!==K.length||E[10]!==a?(e={id:D,label:a,count:K.length,variant:"offer"},E[9]=K.length,E[10]=a,E[11]=e):e=E[11],d=[e,...r]}E[4]=eo,E[5]=en,E[6]=X,E[7]=K.length,E[8]=d}else d=E[8];let ed=d;t:{let e;if(er===n){c=er;break t}E[12]!==ed||E[13]!==er?(e=ed.some(e=>e.id===er)?er:n,E[12]=ed,E[13]=er,E[14]=e):e=E[14],c=e}let ec=c,em=function(e,t,r){let a,l=(0,s.c)(4);if(l[0]!==r||l[1]!==e||l[2]!==t){let s;s=o(t),a=e.filter(e=>(r===n||(e.categoryId??"__uncategorized__")===r)&&(!s||[e.name,e.nameAr,e.displayName,e.description,e.descriptionAr,e.categoryName,e.categoryNameAr,e.categoryDisplayName].some(e=>o(e).includes(s)))),l[0]=r,l[1]=e,l[2]=t,l[3]=a}else a=l[3];return a}(eo,ei,ec);r:{let e;if(ec===n||ec===D){let e;E[15]===Symbol.for("react.memo_cache_sentinel")?(e=[],E[15]=e):e=E[15],m=e;break r}if(E[16]!==em||E[17]!==X){let t;t=new Map,em.forEach(e=>{let r=e.subcategoryId??O,a=t.get(r);if(a){a.count+=1;return}t.set(r,{id:r,label:e.subcategoryId?"ar"===X?e.subcategoryNameAr||e.subcategoryDisplayName||e.subcategoryName||_(X):e.subcategoryDisplayName||e.subcategoryName||e.subcategoryNameAr||_(X):_(X),count:1})}),e=Array.from(t.values()),E[16]=em,E[17]=X,E[18]=e}else e=E[18];m=e}let eu=m;a:{let e;if(es===n){u=es;break a}E[19]!==es||E[20]!==eu?(e=eu.some(e=>e.id===es)?es:n,E[19]=es,E[20]=eu,E[21]=e):e=E[21],u=e}let ep=u;s:{let e;if(ep===n){p=em;break s}if(ep===O){let e;E[22]!==em?(e=em.filter(L),E[22]=em,E[23]=e):e=E[23],p=e;break s}if(E[24]!==ep||E[25]!==em){let t;E[27]!==ep?(t=e=>e.subcategoryId===ep,E[27]=ep,E[28]=t):t=E[28],e=em.filter(t),E[24]=ep,E[25]=em,E[26]=e}else e=E[26];p=e}let ex=p;if(E[29]!==ei||E[30]!==X||E[31]!==K){let e;E[33]!==ei||E[34]!==X?(e=e=>{var t,r,a;let s;return t=e,r=ei,a=X,!(s=r.trim().toLowerCase())||[..."ar"===a?[t.nameAr,t.name,t.descriptionAr,t.description]:[t.name,t.nameAr,t.description,t.descriptionAr],...t.products.flatMap(e=>"ar"===a?[e.nameAr,e.name,e.descriptionAr,e.description]:[e.name,e.nameAr,e.description,e.descriptionAr])].some(e=>e?.trim().toLowerCase().includes(s))},E[33]=ei,E[34]=X,E[35]=e):e=E[35],x=K.filter(e),E[29]=ei,E[30]=X,E[31]=K,E[32]=x}else x=E[32];let ef=x,eh=ec===n,eb=ec===D&&!!G,eg=eo.length+(en?K.length:0);(E[36]!==Z?(f=Z("allCategories"),E[36]=Z,E[37]=f):f=E[37],E[38]!==Z?(h=Z("containsAllergens"),E[38]=Z,E[39]=h):h=E[39],E[40]!==X)?(g="ar"===X?"لا توجد منتجات مطابقة":"No matching products",E[40]=X,E[41]=g):g=E[41],E[42]!==X?(v="ar"===X?"خيارات":"Options",E[42]=X,E[43]=v):v=E[43];let ev="ar"===X?"عرض التفاصيل":"Quick view";(E[44]!==Z?(w=Z("searchProducts"),E[44]=Z,E[45]=w):w=E[45],E[46]!==X)?(N="ar"===X?"غير متاح":"Unavailable",E[46]=X,E[47]=N):N=E[47],E[48]!==f||E[49]!==h||E[50]!==g||E[51]!==v||E[52]!==ev||E[53]!==w||E[54]!==N?(j={allCategories:f,containsAllergens:h,noProducts:g,options:v,quickView:ev,searchPlaceholder:w,unavailable:N},E[48]=f,E[49]=h,E[50]=g,E[51]=v,E[52]=ev,E[53]=w,E[54]=N,E[55]=j):j=E[55];let ey=j;E[56]===Symbol.for("react.memo_cache_sentinel")?(A=e=>{et(e)},E[56]=A):A=E[56];let ew=A;E[57]===Symbol.for("react.memo_cache_sentinel")?($=e=>{ea(e),el(n),W.current?.scrollIntoView({block:"start"})},E[57]=$):$=E[57];let eN=$;E[58]===Symbol.for("react.memo_cache_sentinel")?(S=e=>{el(e),W.current?.scrollIntoView({block:"start"})},E[58]=S):S=E[58];let ej=S;return(E[59]!==ey.searchPlaceholder||E[60]!==ee?(C=(0,a.jsx)(M,{value:ee,placeholder:ey.searchPlaceholder,onChange:ew}),E[59]=ey.searchPlaceholder,E[60]=ee,E[61]=C):C=E[61],E[62]!==ec||E[63]!==ed||E[64]!==ey.allCategories||E[65]!==eg?(k=(0,a.jsx)(y,{allLabel:ey.allCategories,categories:ed,selectedCategory:ec,totalCount:eg,onCategoryChange:eN}),E[62]=ec,E[63]=ed,E[64]=ey.allCategories,E[65]=eg,E[66]=k):k=E[66],E[67]!==ep||E[68]!==em||E[69]!==X||E[70]!==eh||E[71]!==eb||E[72]!==eu)?(q=eu.some(z)&&!eh&&!eb&&(0,a.jsx)(y,{allLabel:"ar"===X?"الكل":"All",categories:eu,selectedCategory:ep,totalCount:em.length,onCategoryChange:ej}),E[67]=ep,E[68]=em,E[69]=X,E[70]=eh,E[71]=eb,E[72]=eu,E[73]=q):q=E[73],(E[74]!==C||E[75]!==k||E[76]!==q?(I=(0,a.jsxs)("div",{className:"sticky top-0 z-30 space-y-3 border-b border-slate-200 bg-slate-50/95 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85",children:[C,k,q]}),E[74]=C,E[75]=k,E[76]=q,E[77]=I):I=E[77],E[78]!==U||E[79]!==H||E[80]!==ef||E[81]!==em||E[82]!==ey||E[83]!==X||E[84]!==Y||E[85]!==J||E[86]!==G||E[87]!==eh||E[88]!==eb||E[89]!==ex)?(T=eb?ef.length>0?(0,a.jsx)(b,{offers:ef,currency:U,disabled:H,onSelectOffer:G}):(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:"ar"===X?"لا توجد عروض مطابقة":"No matching offers"}):eh?ef.length>0||em.length>0?(0,a.jsxs)(a.Fragment,{children:[G&&ef.length>0&&(0,a.jsx)(b,{offers:ef,currency:U,disabled:H,onSelectOffer:G}),em.length>0&&(0,a.jsx)(P,{products:em,currency:U,locale:X,labels:ey,emptyLabel:ey.noProducts,disabled:H,onProductSelect:J,onProductQuickView:Y})]}):(0,a.jsx)("div",{className:"flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-medium text-slate-500",children:"ar"===X?"لا توجد عناصر مطابقة":"No matching items"}):(0,a.jsx)(P,{products:ex,currency:U,locale:X,labels:ey,emptyLabel:ey.noProducts,disabled:H,onProductSelect:J,onProductQuickView:Y}),E[78]=U,E[79]=H,E[80]=ef,E[81]=em,E[82]=ey,E[83]=X,E[84]=Y,E[85]=J,E[86]=G,E[87]=eh,E[88]=eb,E[89]=ex,E[90]=T):T=E[90],E[91]!==I||E[92]!==T?(F=(0,a.jsxs)("section",{ref:W,className:"space-y-4",children:[I,T]}),E[91]=I,E[92]=T,E[93]=F):F=E[93],F}function z(e){return e.id!==O}function L(e){return!e.subcategoryId}},76820:(e,t,r)=>{r.d(t,{C:()=>u});var a=r(95155),s=r(19749);r(12115);var l=r(94995),i=r(50277),n=r(97511),o=r(17397),d=r(97012),c=r(40154),m=r(1016);function u(e){let t,r,u,y,w,N,j=(0,s.c)(30),{order:A,variant:$,size:S,className:C,label:k,iconOnly:P}=e,q=void 0===$?"outline":$,I=void 0===S?"default":S,T=void 0!==P&&P,{t:M}=(0,m.Y)(),D=(0,n.useSettingsStore)(v),O=(0,o.useBrandingStore)(g),_=(0,o.useBrandingStore)(b),R=(0,d.usePosStore)(h),F=(0,d.usePosStore)(f),z=(0,d.usePosStore)(x),L=(0,d.usePosStore)(p);j[0]!==_||j[1]!==F||j[2]!==O||j[3]!==A||j[4]!==R||j[5]!==D||j[6]!==z||j[7]!==L?(t=()=>{A&&(0,c.printReceipt)({order:A,settings:D,logoUrl:O,businessName:_,products:R,currency:F,storeServiceChargeRate:z,storeTaxRate:L,customerPhone:A.customerPhone,amountTendered:A.amountTendered,changeAmount:A.changeAmount,forceReprint:!0})},j[0]=_,j[1]=F,j[2]=O,j[3]=A,j[4]=R,j[5]=D,j[6]=z,j[7]=L,j[8]=t):t=j[8];let E=t;if(!A)return null;j[9]!==k||j[10]!==M?(r=k??M("printReceiptBtn"),j[9]=k,j[10]=M,j[11]=r):r=j[11],j[12]!==k||j[13]!==M?(u=k??M("printReceiptBtn"),j[12]=k,j[13]=M,j[14]=u):u=j[14];let U=T?"":"me-2 h-4 w-4";return j[15]!==U?(y=(0,a.jsx)(l.A,{className:U}),j[15]=U,j[16]=y):y=j[16],j[17]!==T||j[18]!==k||j[19]!==M?(w=!T&&(k??M("printReceiptBtn")),j[17]=T,j[18]=k,j[19]=M,j[20]=w):w=j[20],j[21]!==C||j[22]!==E||j[23]!==I||j[24]!==r||j[25]!==u||j[26]!==y||j[27]!==w||j[28]!==q?(N=(0,a.jsxs)(i.$,{variant:q,size:I,className:C,onClick:E,"aria-label":r,title:u,children:[y,w]}),j[21]=C,j[22]=E,j[23]=I,j[24]=r,j[25]=u,j[26]=y,j[27]=w,j[28]=q,j[29]=N):N=j[29],N}function p(e){return e.taxRate}function x(e){return e.serviceChargeRate}function f(e){return e.currency}function h(e){return e.products}function b(e){return e.businessName}function g(e){return e.logoUrl}function v(e){return e.settings}},81769:(e,t,r)=>{r.d(t,{J:()=>n});var a=r(95155),s=r(19749);r(12115);var l=r(86228),i=r(37570);function n(e){let t,r,n,o,d=(0,s.c)(8);return d[0]!==e?({className:t,...r}=e,d[0]=e,d[1]=t,d[2]=r):(t=d[1],r=d[2]),d[3]!==t?(n=(0,i.cn)("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",t),d[3]=t,d[4]=n):n=d[4],d[5]!==r||d[6]!==n?(o=(0,a.jsx)(l.b,{"data-slot":"label",className:n,...r}),d[5]=r,d[6]=n,d[7]=o):o=d[7],o}},98256:(e,t,r)=>{r.d(t,{A:()=>N});var a=r(95155),s=r(19749),l=r(12115),i=r(97012),n=r(32226),o=r(94077),d=r(50277),c=r(34819),m=r(45827),u=r(13628),p=r(81769),x=r(37570),f=r(32976),h=r(366),b=r(77274),g=r(14547),v=r(15823),y=r(74593),w=r(1016);function N(e){let t,r,N,R,B,J,Y,H,K,X,Z,W,ee,et,er,ea,es,el,ei,en,eo,ed,ec,em,eu,ep,ex,ef,eh,eb,eg,ev,ey,ew,eN,ej=(0,s.c)(156),{product:eA,isOpen:e$,onClose:eS,onAddToCart:eC,initialQuantity:ek,initialNotes:eP,initialModifierIds:eq,initialModifierQuantities:eI,actionLabel:eT,orderType:eM}=e;ej[0]===Symbol.for("react.memo_cache_sentinel")?(t=[],ej[0]=t):t=ej[0];let[eD,eO]=(0,l.useState)(t),[e_,eR]=(0,l.useState)(null);ej[1]===Symbol.for("react.memo_cache_sentinel")?(r={},ej[1]=r):r=ej[1];let[eF,ez]=(0,l.useState)(r),[eL,eE]=(0,l.useState)(1),[eU,eB]=(0,l.useState)("");ej[2]===Symbol.for("react.memo_cache_sentinel")?(N=[],ej[2]=N):N=ej[2];let[eV,eG]=(0,l.useState)(N),eQ=(0,i.usePosStore)(Q),{t:eJ,locale:eY}=(0,w.Y)(),eH=eA?.isActive&&eA?.isAvailableNow;ej[3]!==eY||ej[4]!==eA?(R=eA?(0,f.mB)(eA,"ar"===eY?"ar":"en"):null,ej[3]=eY,ej[4]=eA,ej[5]=R):R=ej[5];let eK=R;ej[6]!==eY||ej[7]!==eA?(B=eA?(0,f.XV)(eA,"ar"===eY?"ar":"en"):null,ej[6]=eY,ej[7]=eA,ej[8]=B):B=ej[8];let eX=B,eZ=G;if(ej[9]!==eq||ej[10]!==eI||ej[11]!==eP||ej[12]!==ek||ej[13]!==e$||ej[14]!==eA?(J=()=>{if(e$&&eA){eE(Math.max(1,ek??1)),eB(eP??""),eG([]),eq&&eq.length>0?eO(eA.modifierGroups.flatMap(V).filter(e=>eq.includes(e.id)).map(e=>eZ(e,eI?.[e.id]??1))):eO(eA.modifierGroups.flatMap(U).map(e=>eZ(e,1)));let e=eA.options?.filter(E)??[];eR(e.find(L)??e[0]??null);let t={};for(let e of eA.recipeItems??[]){if(!e.alternatives?.length)continue;let r=e.alternatives.find(z);t[e.id]=r?.id??""}ez(t)}else eA||(eO([]),eR(null),ez({}))},Y=[e$,eA,ek,eP,eq,eI,eZ],ej[9]=eq,ej[10]=eI,ej[11]=eP,ej[12]=ek,ej[13]=e$,ej[14]=eA,ej[15]=J,ej[16]=Y):(J=ej[15],Y=ej[16]),(0,l.useEffect)(J,Y),!eA)return null;let eW=eA.displayPrice??eA.discountedPrice??eA.basePrice;ej[17]!==eD?(H=e=>eD.filter(t=>e.modifiers.some(e=>e.id===t.id)).length,ej[17]=eD,ej[18]=H):H=ej[18];let e0=H;ej[19]===Symbol.for("react.memo_cache_sentinel")?(K=(e,t)=>{let r=e.modifiers.find(e=>e.id===t);r&&(eO(t=>[...t.filter(t=>!e.modifiers.some(e=>e.id===t.id)),eZ(r,1)]),eG([]))},ej[19]=K):K=ej[19];let e1=K;ej[20]===Symbol.for("react.memo_cache_sentinel")?(X=(e,t,r)=>{eO(a=>{if(!e)return a.filter(e=>e.id!==r.id);{let e=a.filter(e=>t.modifiers.some(t=>t.id===e.id)).length;return t.maxSelection>0&&e>=t.maxSelection?a:[...a,eZ(r,1)]}}),eG([])},ej[20]=X):X=ej[20];let e2=X;ej[21]===Symbol.for("react.memo_cache_sentinel")?(Z=(e,t)=>{eO(r=>r.map(r=>{if(r.id!==e)return r;let a=Math.max(1,(r.quantity||1)+t);return{...r,quantity:a}}))},ej[21]=Z):Z=ej[21];let e5=Z;if(ej[22]!==eF||ej[23]!==eX||ej[24]!==eK||ej[25]!==eW||ej[26]!==eQ||ej[27]!==e0||ej[28]!==e$||ej[29]!==eH||ej[30]!==eY||ej[31]!==eU||ej[32]!==eC||ej[33]!==eS||ej[34]!==eM||ej[35]!==eA||ej[36]!==eL||ej[37]!==eD||ej[38]!==e_||ej[39]!==eJ){let e,t,r,s,l,i,d,c,m,f=eA?.modifierGroups?.filter(e=>void 0===eM||(e.availableForOrderTypes&eM)!=0)??[];ej[56]!==eW||ej[57]!==eA?(e=(e,t)=>{let r=e.freeQuantityLimit??0;if(e.isFree&&r>0&&(void 0===t?1:t)<=r||e.isFree&&0===r)return 0;let a=e.pricingType??0;return 2===a?0:1===a&&eA?eW*e.priceAdjustment/100:e.priceAdjustment},ej[56]=eW,ej[57]=eA,ej[58]=e):e=ej[58],ea=e;let w=(eA.recipeItems??[]).filter(_);ej[59]!==eF||ej[60]!==eA||ej[61]!==e_?(t=()=>{if(e_)return 0;let e=Object.entries(eF).filter(O).map(D);return(0,h.XY)(eA,e)},ej[59]=eF,ej[60]=eA,ej[61]=e_,ej[62]=t):t=ej[62];let N=t;ej[63]!==eF||ej[64]!==e_?(r=()=>{if(e_)return[];let e=[];for(let[t,r]of Object.entries(eF))r&&e.push({recipeItemId:t,alternativeId:r});return e},ej[63]=eF,ej[64]=e_,ej[65]=r):r=ej[65];let j=r;ej[66]!==N||ej[67]!==eW||ej[68]!==ea||ej[69]!==eL||ej[70]!==eD||ej[71]!==e_?(s=()=>{if(e_)return e_.price*eL;let e=eD.filter(M).reduce((e,t)=>e+ea(t,1),0);return((e>0?e:eW)+eD.filter(T).reduce((e,t)=>e+ea(t,t.quantity||1)*(t.quantity||1),0)+N())*eL},ej[66]=N,ej[67]=eW,ej[68]=ea,ej[69]=eL,ej[70]=eD,ej[71]=e_,ej[72]=s):s=ej[72],et=s,ej[73]!==N||ej[74]!==eW||ej[75]!==ea||ej[76]!==eD||ej[77]!==e_?(l=()=>{if(e_)return e_.price;let e=eD.filter(I).reduce((e,t)=>e+ea(t,1),0);return(e>0?e:eW)+eD.filter(q).reduce((e,t)=>e+ea(t,t.quantity||1)*(t.quantity||1),0)+N()},ej[73]=N,ej[74]=eW,ej[75]=ea,ej[76]=eD,ej[77]=e_,ej[78]=l):l=ej[78],er=l,es=()=>{eA.isActive&&eA.isAvailableNow?(()=>{let e=[];for(let t of f){if(0===t.modifiers.filter(F).length)continue;let r=e0(t),a=t.displayName||t.name;t.isRequired&&t.minSelection>0&&r<t.minSelection&&e.push(`${a}: select at least ${t.minSelection}`),t.maxSelection>0&&r>t.maxSelection&&e.push(`${a}: max ${t.maxSelection} allowed`)}return eG(e),0===e.length})()&&(eC(eA,eD,eL,eU.trim(),e_,j()),eS()):eG(["ar"===eY?"هذا المنتج غير متاح حاليًا":"This product is not available right now"])},ee=o.lG,ep=e$,ej[79]!==eS?(ex=e=>!e&&eS(),ej[79]=eS,ej[80]=ex):ex=ej[80],W=o.Cf,ec="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] flex flex-col p-0 gap-0 overflow-hidden bg-white sm:max-w-[600px] sm:max-h-[85vh]",em="ar"===eY?"rtl":"ltr";let A="ar"===eY&&eA.nameAr?eA.nameAr:eA.displayName||eA.name;ej[81]!==A?(i=(0,a.jsx)(o.L3,{className:"text-2xl font-bold text-slate-800 text-start",children:A}),ej[81]=A,ej[82]=i):i=ej[82];let R="ar"===eY?"rtl":"ltr",z="ar"===eY?"right":"left";ej[83]!==R||ej[84]!==z?(d={direction:R,textAlign:z},ej[83]=R,ej[84]=z,ej[85]=d):d=ej[85];let L=e_?e_.price:eW;ej[86]!==eQ||ej[87]!==L?(c=(0,n.vv)(L,eQ),ej[86]=eQ,ej[87]=L,ej[88]=c):c=ej[88],ej[89]!==d||ej[90]!==c?(m=(0,a.jsx)("p",{className:"text-lg text-primary font-semibold text-start",style:d,children:c}),ej[89]=d,ej[90]=c,ej[91]=m):m=ej[91],ej[92]!==i||ej[93]!==m?(eu=(0,a.jsxs)(o.c7,{className:"border-b border-slate-100 p-4 pb-4 sm:p-6 text-start",children:[i,m]}),ej[92]=i,ej[93]=m,ej[94]=eu):eu=ej[94],el="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6",ej[95]!==eX||ej[96]!==eK||ej[97]!==eH||ej[98]!==eY?(ei=!eH&&(0,a.jsxs)("div",{className:"flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700",children:[(0,a.jsx)(b.A,{className:"mt-0.5 h-4 w-4 shrink-0"}),(0,a.jsxs)("div",{children:[(0,a.jsx)("div",{children:"ar"===eY?"هذا المنتج غير متاح حاليًا ولا يمكن إضافته إلى الطلب":"This product is currently unavailable and cannot be added to the order."}),eK&&(0,a.jsx)("div",{className:"mt-1 text-xs text-amber-600",children:eK}),eX&&(0,a.jsx)("div",{className:"mt-1 text-xs text-amber-600",children:eX})]})]}),ej[95]=eX,ej[96]=eK,ej[97]=eH,ej[98]=eY,ej[99]=ei):ei=ej[99],ej[100]!==eQ||ej[101]!==eY||ej[102]!==eA.options||ej[103]!==e_?.id||ej[104]!==eJ?(en=(eA.options?.filter(P).length??0)>0&&(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eY?"اختر النوع":"Choose Variant"}),(0,a.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100",children:eJ("required")})]}),(0,a.jsx)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:eA.options.filter(k).map(e=>{let t=e_?.id===e.id,r="ar"===eY&&e.nameAr?e.nameAr:e.name;return(0,a.jsxs)("button",{type:"button",onClick:()=>eR(e),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                ${t?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[t&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:r}),(0,a.jsx)("span",{className:"text-[11px] font-bold mt-0.5 text-primary",children:(0,n.vv)(e.price,eQ)})]},e.id)})})]}),ej[100]=eQ,ej[101]=eY,ej[102]=eA.options,ej[103]=e_?.id,ej[104]=eJ,ej[105]=en):en=ej[105],eo=w.length>0&&!e_&&(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eY?"البدائل":"Ingredient Swaps"}),(0,a.jsx)("span",{className:"text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100",children:eJ("optional")})]}),w.map(e=>{let t="ar"===eY&&e.rawMaterialNameAr?e.rawMaterialNameAr:e.rawMaterialName,r=(e.alternatives??[]).filter(C),s=eF[e.id]??"",l=(0,x.D)(e.unit,eY),i=`${t} (${e.amount} ${l})`;return(0,a.jsxs)("div",{className:"space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-3",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700",children:t}),(0,a.jsx)("span",{className:"text-[11px] text-slate-400",children:"ar"===eY?"اختر بديلاً":"Pick an alternative"})]}),(0,a.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,a.jsxs)("button",{type:"button",onClick:()=>ez(t=>({...t,[e.id]:""})),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                    ${""===s?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[""===s&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:i}),(0,a.jsx)("span",{className:"text-[11px] text-slate-400 mt-0.5",children:"ar"===eY?"افتراضي":"Default"})]}),r.map(t=>{let r=s===t.id,l="ar"===eY&&(t.nameAr||t.rawMaterialNameAr)?t.nameAr||t.rawMaterialNameAr:t.name||t.rawMaterialName,i=(0,x.D)(t.unit,eY),o=`${l} (${t.amount} ${i})`,d=(0,h.CX)(eA,e,t),c=(0,h.R_)(d,e=>(0,n.vv)(e,eQ)),m=d<0?"text-emerald-600":"text-primary";return(0,a.jsxs)("button",{type:"button",onClick:()=>ez(r=>({...r,[e.id]:t.id})),className:`relative flex flex-col items-start p-3 rounded-xl border-2 text-start transition-all min-h-[60px]
                                                            ${r?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,children:[r&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)("span",{className:"text-sm font-semibold text-slate-700 truncate max-w-full",children:o}),c&&(0,a.jsx)("span",{className:`text-[11px] font-bold mt-0.5 ${m}`,children:c})]},t.id)})]})]},e.id)})]}),ed=f.length>0?f.map(e=>{let t=e.modifiers.filter(S);if(0===t.length)return null;let r=0===e.selectionType,s=e.isRequired,l=e0(e),i=e.maxSelection>0&&l>=e.maxSelection,o=e.displayType??+!r;return(0,a.jsxs)("div",{className:"space-y-3",children:[(0,a.jsxs)("div",{className:"flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("h3",{className:"font-bold text-base text-slate-800",children:"ar"===eY&&e.nameAr?e.nameAr:e.displayName||e.name}),s?(0,a.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100",children:eJ("required")}):(0,a.jsx)("span",{className:"text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-100",children:eJ("optional")})]}),(0,a.jsx)("span",{className:"text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md text-start",children:r?eJ("chooseOne"):e.maxSelection>0?`${l}/${e.maxSelection}`:l>0?`${l} ${eJ("selectedLabel")}`:eJ("anyOption")})]}),r?(0,a.jsx)(u.z,{value:eD.find(t=>e.modifiers.some(e=>e.id===t.id))?.id,onValueChange:t=>e1(e,t),className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:t.map(t=>{let r=eD.some(e=>e.id===t.id),s=`radio-${e.id}-${t.id}`,l=ea(t,1),i=1===t.pricingType?"%":2===t.pricingType?"incl.":"";return(0,a.jsxs)("div",{className:`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-center min-h-[72px]
                                                        ${r?"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`,onClick:()=>e1(e,t.id),children:[r&&(0,a.jsx)("div",{className:"absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center",children:(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)(u.C,{value:t.id,id:s,className:"sr-only"}),(0,a.jsx)(p.J,{htmlFor:s,className:"cursor-pointer font-semibold text-sm text-slate-700",children:"ar"===eY&&t.nameAr?t.nameAr:t.displayName||t.name}),t.isFree||0===l?(0,a.jsx)("span",{className:"text-[10px] text-slate-400 mt-1",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:`text-xs font-bold mt-1 ${l>0?"text-primary":"text-blue-600"}`,children:[l>0?"+":"",(0,n.vv)(l,eQ)," ",i]})]},t.id)})}):2===o?(0,a.jsx)("div",{className:"flex flex-col gap-2",children:t.map(e=>{let t=eD.find(t=>t.id===e.id),r=t?.quantity||0,s=ea(e,r),l=e.maxQuantity>0?e.maxQuantity:99;return(0,a.jsxs)("div",{className:`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${r>0?"border-primary bg-primary/5 shadow-sm":"border-slate-200 hover:border-slate-300"}`,children:[(0,a.jsx)("div",{className:"flex items-center gap-3",children:(0,a.jsx)("span",{className:"font-medium text-sm text-slate-700",children:"ar"===eY&&e.nameAr?e.nameAr:e.displayName||e.name})}),(0,a.jsxs)("div",{className:"flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start",children:[(0,a.jsxs)("div",{className:"flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5",children:[(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>{r<=1?eO(t=>t.filter(t=>t.id!==e.id)):r>0&&e5(e.id,-1)},children:(0,a.jsx)(v.A,{className:"w-3 h-3"})}),(0,a.jsx)("span",{className:"w-7 text-center text-sm font-bold text-slate-700",children:r}),(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>{0===r?eO(t=>[...t,eZ(e,1)]):r<l&&e5(e.id,1)},children:(0,a.jsx)(y.A,{className:"w-3 h-3"})})]}),e.isFree||0===s?(0,a.jsx)("span",{className:"text-xs text-slate-400 min-w-[40px] text-end",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:"text-sm font-bold min-w-[60px] text-end text-primary",children:["+",(0,n.vv)(s*r,eQ)]})]})]},e.id)})}):(0,a.jsx)("div",{className:"flex flex-col gap-2",children:t.map(t=>{let r=eD.find(e=>e.id===t.id),s=!!r,l=!s&&i,o=`check-${e.id}-${t.id}`,d=ea(t,r?.quantity||1);return(0,a.jsxs)("div",{className:`flex flex-col items-start gap-3 rounded-xl border-2 p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between
                                                        ${s?"border-primary bg-primary/5 shadow-sm":l?"border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed":"border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"}`,onClick:()=>!l&&e2(!s,e,t),children:[(0,a.jsxs)("div",{className:"flex items-center gap-3",children:[(0,a.jsx)("div",{className:`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${s?"bg-primary border-primary":"border-slate-300"}`,children:s&&(0,a.jsx)(g.A,{className:"w-3 h-3 text-white"})}),(0,a.jsx)(p.J,{htmlFor:o,className:`font-medium text-sm ${l?"text-slate-400":"text-slate-700 cursor-pointer"}`,children:"ar"===eY&&t.nameAr?t.nameAr:t.displayName||t.name})]}),(0,a.jsxs)("div",{className:"flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start",children:[s&&(0,a.jsxs)("div",{className:"flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5",onClick:$,children:[(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>e5(t.id,-1),children:(0,a.jsx)(v.A,{className:"w-3 h-3"})}),(0,a.jsx)("span",{className:"w-7 text-center text-sm font-bold text-slate-700",children:r?.quantity||1}),(0,a.jsx)("button",{type:"button",className:"w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all",onClick:()=>e5(t.id,1),children:(0,a.jsx)(y.A,{className:"w-3 h-3"})})]}),t.isFree||0===d?(0,a.jsx)("span",{className:"text-xs text-slate-400 min-w-[40px] text-end",children:eJ("freeLabel")}):(0,a.jsxs)("span",{className:`text-sm font-bold min-w-[60px] text-end ${d>0?"text-primary":"text-blue-600"}`,children:[d>0?"+":"",(0,n.vv)(d*(r?.quantity||1),eQ)]})]})]},t.id)})})]},e.id)}):(0,a.jsxs)("div",{className:"flex flex-col items-center justify-center py-10 text-slate-400",children:[(0,a.jsx)("span",{className:"text-4xl mb-2",children:"\uD83C\uDF7D️"}),(0,a.jsx)("p",{children:eJ("noExtraOptions")})]}),ej[22]=eF,ej[23]=eX,ej[24]=eK,ej[25]=eW,ej[26]=eQ,ej[27]=e0,ej[28]=e$,ej[29]=eH,ej[30]=eY,ej[31]=eU,ej[32]=eC,ej[33]=eS,ej[34]=eM,ej[35]=eA,ej[36]=eL,ej[37]=eD,ej[38]=e_,ej[39]=eJ,ej[40]=W,ej[41]=ee,ej[42]=et,ej[43]=er,ej[44]=ea,ej[45]=es,ej[46]=el,ej[47]=ei,ej[48]=en,ej[49]=eo,ej[50]=ed,ej[51]=ec,ej[52]=em,ej[53]=eu,ej[54]=ep,ej[55]=ex}else W=ej[40],ee=ej[41],et=ej[42],er=ej[43],ea=ej[44],es=ej[45],el=ej[46],ei=ej[47],en=ej[48],eo=ej[49],ed=ej[50],ec=ej[51],em=ej[52],eu=ej[53],ep=ej[54],ex=ej[55];return ej[106]!==eW||ej[107]!==er||ej[108]!==eQ||ej[109]!==ea||ej[110]!==eY||ej[111]!==eA.displayName||ej[112]!==eA.name||ej[113]!==eA.nameAr||ej[114]!==eD||ej[115]!==eJ?(ef=eD.length>0&&eD.some(e=>ea(e,e.quantity||1)>0)&&(0,a.jsxs)("div",{className:"bg-slate-50 rounded-xl p-4 border border-slate-100",children:[(0,a.jsx)("h4",{className:"text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",children:eJ("priceBreakdown")}),(0,a.jsxs)("div",{className:"space-y-1.5",children:[(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-600",children:[(0,a.jsx)("span",{children:"ar"===eY&&eA.nameAr?eA.nameAr:eA.displayName||eA.name}),(0,a.jsx)("span",{className:"font-medium",children:(0,n.vv)(eW,eQ)})]}),eD.filter(e=>0!==ea(e,e.quantity||1)).map((e,t)=>(0,a.jsxs)("div",{className:"flex justify-between text-sm text-slate-500",children:[(0,a.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,a.jsx)("span",{className:"w-1 h-1 rounded-full bg-primary"}),"ar"===eY&&e.nameAr?e.nameAr:e.displayName||e.name,(e.quantity||1)>1&&(0,a.jsxs)("span",{className:"text-slate-400",children:["\xd7",e.quantity]})]}),(0,a.jsxs)("span",{className:"font-medium text-primary",children:["+",(0,n.vv)(ea(e,e.quantity||1)*(e.quantity||1),eQ)]})]},t)),(0,a.jsxs)("div",{className:"flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200",children:[(0,a.jsx)("span",{children:eJ("unitPrice")}),(0,a.jsx)("span",{children:(0,n.vv)(er(),eQ)})]})]})]}),ej[106]=eW,ej[107]=er,ej[108]=eQ,ej[109]=ea,ej[110]=eY,ej[111]=eA.displayName,ej[112]=eA.name,ej[113]=eA.nameAr,ej[114]=eD,ej[115]=eJ,ej[116]=ef):ef=ej[116],ej[117]!==eH||ej[118]!==eU||ej[119]!==eL||ej[120]!==eJ?(eh=eH&&(0,a.jsxs)("div",{className:"space-y-4 border-t border-slate-100 pt-6",children:[(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(p.J,{htmlFor:"qty",className:"text-sm font-semibold text-slate-700",children:eJ("qty")}),(0,a.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,a.jsx)(d.$,{type:"button",variant:"outline",className:"h-10 w-10 p-0",onClick:()=>eE(A),children:"-"}),(0,a.jsx)(c.p,{id:"qty",type:"number",min:"1",step:"1",value:eL,onChange:e=>{let t=parseInt(e.target.value||"1",10);eE(Number.isNaN(t)?1:Math.max(1,t))},className:"w-full text-center sm:w-24"}),(0,a.jsx)(d.$,{type:"button",variant:"outline",className:"h-10 w-10 p-0",onClick:()=>eE(j),children:"+"})]})]}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsx)(p.J,{htmlFor:"notes",className:"text-sm font-semibold text-slate-700",children:eJ("specialNote")}),(0,a.jsx)(m.T,{id:"notes",value:eU,onChange:e=>eB(e.target.value),placeholder:"e.g. No onions, extra spicy",className:"min-h-20"})]})]}),ej[117]=eH,ej[118]=eU,ej[119]=eL,ej[120]=eJ,ej[121]=eh):eh=ej[121],ej[122]!==el||ej[123]!==ei||ej[124]!==en||ej[125]!==eo||ej[126]!==ed||ej[127]!==ef||ej[128]!==eh?(eb=(0,a.jsxs)("div",{className:el,children:[ei,en,eo,ed,ef,eh]}),ej[122]=el,ej[123]=ei,ej[124]=en,ej[125]=eo,ej[126]=ed,ej[127]=ef,ej[128]=eh,ej[129]=eb):eb=ej[129],ej[130]!==eV?(eg=eV.length>0&&(0,a.jsxs)("div",{className:"flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm",children:[(0,a.jsx)(b.A,{className:"w-4 h-4 mt-0.5 shrink-0"}),(0,a.jsx)("div",{children:eV.join(" \xb7 ")})]}),ej[130]=eV,ej[131]=eg):eg=ej[131],ej[132]!==eT||ej[133]!==et||ej[134]!==er||ej[135]!==eQ||ej[136]!==es||ej[137]!==eH||ej[138]!==eL||ej[139]!==eJ?(ev=eH&&(0,a.jsxs)(d.$,{className:"flex h-auto min-h-14 w-full flex-col items-start gap-1 rounded-xl bg-primary px-4 py-3 text-start text-base text-white shadow-lg shadow-primary/20 hover:bg-primary/90 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6",onClick:es,children:[(0,a.jsx)("span",{className:"font-semibold",children:eT||eJ("addToCartBtn")}),(0,a.jsxs)("span",{className:"flex items-center gap-2",children:[(0,a.jsxs)("span",{className:"text-xs opacity-80",children:[eL," \xd7 ",(0,n.vv)(er(),eQ)]}),(0,a.jsx)("span",{className:"font-bold text-lg",children:(0,n.vv)(et(),eQ)})]})]}),ej[132]=eT,ej[133]=et,ej[134]=er,ej[135]=eQ,ej[136]=es,ej[137]=eH,ej[138]=eL,ej[139]=eJ,ej[140]=ev):ev=ej[140],ej[141]!==eg||ej[142]!==ev?(ey=(0,a.jsx)(o.Es,{className:"mt-auto border-t border-slate-100 bg-white p-4 sm:p-5",children:(0,a.jsxs)("div",{className:"flex flex-col w-full gap-3",children:[eg,ev]})}),ej[141]=eg,ej[142]=ev,ej[143]=ey):ey=ej[143],ej[144]!==W||ej[145]!==ec||ej[146]!==em||ej[147]!==eu||ej[148]!==eb||ej[149]!==ey?(ew=(0,a.jsxs)(W,{className:ec,dir:em,children:[eu,eb,ey]}),ej[144]=W,ej[145]=ec,ej[146]=em,ej[147]=eu,ej[148]=eb,ej[149]=ey,ej[150]=ew):ew=ej[150],ej[151]!==ee||ej[152]!==ep||ej[153]!==ex||ej[154]!==ew?(eN=(0,a.jsx)(ee,{open:ep,onOpenChange:ex,children:ew}),ej[151]=ee,ej[152]=ep,ej[153]=ex,ej[154]=ew,ej[155]=eN):eN=ej[155],eN}function j(e){return e+1}function A(e){return Math.max(1,e-1)}function $(e){return e.stopPropagation()}function S(e){return!1!==e.isActive}function C(e){return e.isActive}function k(e){return e.isActive}function P(e){return e.isActive}function q(e){return(e.recipeItems?.length??0)===0}function I(e){return(e.recipeItems?.length??0)>0}function T(e){return(e.recipeItems?.length??0)===0}function M(e){return(e.recipeItems?.length??0)>0}function D(e){let[t,r]=e;return{recipeItemId:t,alternativeId:r}}function O(e){let[,t]=e;return t}function _(e){return(e.alternatives?.length??0)>0&&e.alternatives.some(R)}function R(e){return e.isActive}function F(e){return!1!==e.isActive}function z(e){return e.isDefault&&e.isActive}function L(e){return e.isDefault}function E(e){return e.isActive}function U(e){return e.modifiers.filter(B)}function B(e){return e.isDefault&&!1!==e.isActive}function V(e){return e.modifiers}function G(e,t){return{id:e.id,name:e.name,nameAr:e.nameAr,displayName:e.displayName,priceAdjustment:e.priceAdjustment,pricingType:e.pricingType,isFree:e.isFree,freeQuantityLimit:e.freeQuantityLimit,maxQuantity:e.maxQuantity,isDefault:e.isDefault,isActive:e.isActive,quantity:void 0===t?1:t,recipeItems:e.recipeItems}}function Q(e){return e.currency}}}]);