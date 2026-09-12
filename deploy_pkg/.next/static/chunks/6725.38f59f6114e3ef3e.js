"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[6725],{40154:(t,e,a)=>{a.r(e),a.d(e,{buildReceiptBodyHtml:()=>x,getReceiptCss:()=>$,openReceiptPrintWindow:()=>w,printReceipt:()=>y});var r=a(44737),i=a(38221);function o(t){return t?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}a(80842);var n=a(82019),s=a(29094),l=a(74727),d=a(53937);function c(t){return t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function m(t,e){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:e||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(t)}catch{return`${e} ${t.toFixed(2)}`}}let u="pos:printed-receipts:v1";function p(t){return t.publicOrderNumber||t.orderNumber||t.id}function f(t){return`receipt:${p(t)}:paid:${(0,r.Rh)(t).toFixed(2)}`}function h(){let t=window.localStorage.getItem(u);if(!t)return{};try{return JSON.parse(t)}catch{return window.localStorage.removeItem(u),{}}}function g(t){let e=h();delete e[t],window.localStorage.setItem(u,JSON.stringify(e))}let b=`
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
`;function v(t,e,a,s,l,u,p=0,f=0,h,g,b,y){var w;let x,$="Takeaway"===t.orderType,N="Delivery"===t.orderType||"DELIVERY"===t.tableName,A="Talabat"===t.orderSource,P="DeliveryPartner"===t.orderSource,T=t.deliveryAddress??"",S=T.trim().length>0&&(N||A||P),D=t.deliveryPartnerName||t.deliveryPartnerCode||"Delivery Partner",C=P?"Delivery Partner / شريك توصيل":A?"Talabat / طلبات":N?t.deliveryZoneName||"Delivery / توصيل":$?"Takeaway / طلب خارجي":t.tableName||"—",M=(0,r.go)(t),R=(0,r.PX)(t),q=t.paymentMethod||R||"",k=R&&q&&R!==q?R:"",I=Array.from(new Set((t.payments??[]).map(t=>t.referenceNumber?.trim()).filter(t=>!!t))).join(" + "),z=A&&t.talabatPaymentMethod?`${"Cash"===t.talabatPaymentMethod?"Cash":"Prepaid"} / ${t.talabatPaymentMethod}`:"",O=P&&t.partnerPaymentMethod?t.partnerPaymentMethod:"",F=A?z||R:P?O||R:q,U=M.length?(0,r.Rh)(t):0,j=g?.trim()||t.customerName?.trim()||t.customerNameAr?.trim()||t.partnerCustomerName?.trim()||t.talabatCustomerName?.trim()||"",E=h?.trim()||t.customerPhone?.trim()||t.partnerCustomerPhone?.trim()||t.talabatCustomerPhone?.trim()||"",G=function(t,e){if(!t)return"";let a=new Date(t);return Number.isNaN(a.getTime())?"":(0,d.So)(a,e,"en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(t.talabatPickupTime,e.timeZoneId),L=(t.items??[]).reduce((t,e)=>t+(e.quantity??0),0),V=e.showLogoOnReceipt&&a?`<img src="${c(a)}" alt="logo" class="logo" />`:"",B=`
        <div class="header">
            ${V}
            ${e.restaurantAddress?`<div class="rest-info">${c(e.restaurantAddress)}</div>`:""}
            ${e.restaurantPhone?`<div class="rest-info">Tel: ${c(e.restaurantPhone)}</div>`:""}
            ${e.taxNumber?`<div class="rest-info">Tax No: ${c(e.taxNumber)}</div>`:""}
        </div>
    `,Z=(0,n.v)(t),H=`
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order</td>
                <td class="meta-value">${c(Z??`#${t.orderNumber.slice(-4)}`)}</td>
            </tr>
            ${Z?`
            <tr>
                <td class="meta-label">System ID</td>
                <td class="meta-value">${c(t.orderNumber)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">${P||A?"Source / المصدر":N?"Delivery Area / منطقة التوصيل":$?"Type":"Table"}</td>
                <td class="meta-value">${c(C)}</td>
            </tr>
            ${S?`
            <tr>
                <td class="meta-label">Address / العنوان</td>
                <td class="meta-value meta-value-address">${c(T)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${(w=e.timeZoneId,(0,d.UD)(new Date,w,"en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0}))}</td>
            </tr>
            ${A&&t.talabatOrderNumber?`
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${c(t.talabatOrderNumber)}</td>
            </tr>`:""}
            ${P?`
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${c(D)}</td>
            </tr>`:""}
            ${P&&t.partnerOrderNumber?`
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${c(t.partnerOrderNumber)}</td>
            </tr>`:""}
            ${A&&G?`
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${c(G)}</td>
            </tr>`:""}
            ${A&&L>0?`
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${L}</td>
            </tr>`:""}
            ${F?`
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${c(F)}</td>
            </tr>`:""}
            ${k&&!A&&!P?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${c(k)}</td>
            </tr>`:""}
            ${I?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${c(I)}</td>
            </tr>`:""}
            ${j?`
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${c(j)}</td>
            </tr>`:""}
            ${E?`
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${c(E)}</td>
            </tr>`:""}
        </table>
    `,{offerCoveredTotal:_,visibleItems:Q}=function(t){let e=t.items?.find(t=>t.isOfferBundle);if(e)return{offerCoveredTotal:e.lineTotalAmount??0,visibleItems:t.items?.filter(t=>!t.isOfferBundle)??[]};let a=new Map;for(let e of t.offerProducts||[])a.set(e.productId,(a.get(e.productId)??0)+e.quantity);let r=0,i=[];for(let e of t.items||[]){let t=e.quantity??0,o=e.lineTotalAmount??0,n=t>0?o/t:0,s=!!e.notes||(e.modifiers?.length??0)>0,l=e.productId??"",d=0;if(!s&&l){let e=a.get(l)??0;e>0&&(d=Math.min(e,t),a.set(l,e-d))}d>0&&(r+=n*d);let c=t-d;c>0&&i.push({...e,quantity:c,lineTotalAmount:e.isComplimentary?0:Number((n*c).toFixed(2))})}return{offerCoveredTotal:Number(r.toFixed(2)),visibleItems:i}}(t),J=t.offerId&&(t.offerName||t.offerNameAr||(t.offerProducts?.length??0)>0)?`
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${t.offerName?`<span class="name-en">${c(t.offerName)}</span>`:""}
            ${t.offerNameAr?`<span class="name-ar">${c(t.offerNameAr)}</span>`:""}
            ${_>0?`
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${m(_,u)}</span>
                </div>
            `:""}
            ${(t.offerProducts||[]).map(t=>`
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${t.name?`<span class="name-en">${c(t.name)}</span>`:""}
                        ${t.nameAr?`<span class="name-ar">${c(t.nameAr)}</span>`:""}
                    </div>
                    <div class="offer-item-qty">x${t.quantity}</div>
                </div>
            `).join("")}
        </div>
    `:"",W="";for(let t of Q){let e=t.productName||"",a=l.find(e=>e.id===t.productId)?.nameAr??"",r=t.quantity??1,i=t.isComplimentary?0:t.lineTotalAmount??0;for(let o of(W+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${c(e)}</span>
                    ${a?`<span class="name-ar">${c(a)}</span>`:""}
                    ${t.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${r}</td>
                <td class="td-price">${t.isComplimentary?"—":m(i,u)}</td>
            </tr>
        `,t.selectedOptionName&&(W+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${c(t.selectedOptionName)}
                        ${t.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${c(t.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),t.modifiers||[])){if(!o.modifierName)continue;let t=(o.price??0)*(o.quantity??1);W+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${c(o.modifierName)}
                        ${o.modifierNameAr?`<span class="mod-name-ar">+ ${c(o.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${t>0?m(t,u):""}</td>
                </tr>
            `}for(let e of t.recipeSnapshot||[]){if(!e.sourceAlternativeId)continue;let t=e.sourceAlternativeName||e.rawMaterialName||"",a=e.sourceAlternativeNameAr||e.rawMaterialNameAr||"";(t||a)&&(W+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${c(t)}
                        ${a?`<span class="mod-name-ar">↪ ${c(a)}</span>`:""}
                    </td>
                </tr>
            `)}t.notes&&(W+=`
                <tr class="notes-row">
                    <td colspan="3">Note: ${c(t.notes)}</td>
                </tr>
            `)}let Y=t.subtotal&&t.subtotal>0?t.subtotal:(t.items||[]).reduce((t,e)=>t+(e.lineTotalAmount??0),0),X=t.discountAmount&&t.discountAmount>0?t.discountAmount:Y*((t.discountPercentage??0)/100),K=Math.round(100*X)/100,tt=(t.serviceChargeRate??0)>0?t.serviceChargeRate:p,te=(t.taxRate??0)>0?t.taxRate:f,ta=t.discountType??(t.discountPercentage>0?"Percentage":null),tr=t.discountValue??t.discountPercentage??0,ti=t.discountGroupType??0,to=t.discountGroupValue??0,tn=(0,i.rb)(Y,ta,tr,tt,te,to,ti),ts=t.discountGroupAmount&&t.discountGroupAmount>0?Math.round(100*t.discountGroupAmount)/100:tn.discountGroupAmount,tl=Y-K-ts,td=t.serviceChargeAmount&&t.serviceChargeAmount>0?t.serviceChargeAmount:tn.serviceChargeAmount,tc=t.taxAmount&&t.taxAmount>0?t.taxAmount:tn.taxAmount,tm=Math.max(0,Math.round((t.deliveryFee??0)*100)/100),tu=Math.max(0,Math.round((t.talabatDeliveryFee??0)*100)/100),tp=Math.max(0,Math.round((t.talabatServiceFee??0)*100)/100),tf=Math.max(0,Math.round((t.partnerDeliveryFee??0)*100)/100),th=Math.max(0,Math.round((t.partnerServiceFee??0)*100)/100),tg=Math.round((tl+td+tc+tm+tu+tp+tf+th)*100)/100,tb=!0===t.isVoucherApplied?Math.max(0,Math.round((t.voucherDiscountAmount??0)*100)/100):0,tv=Math.round(100*Math.max(0,tg-tb))/100,ty=`
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${m(Y,u)}</td>
        </tr>
    `;if(X>0&&(ty+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${"Percentage"===ta?`${tr}%`:m(tr,u)})</td>
                <td class="sum-value">-${m(X,u)}</td>
            </tr>
        `),ts>0){let e=0===ti?` (${to}%)`:"",a=t.discountGroupName?`${t.discountGroupName}${e}`:`Group Discount / خصم الفئة${e}`;ty+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">${a}</td>
                <td class="sum-value">-${m(ts,u)}</td>
            </tr>
        `}td>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${tt}%)</td>
                <td class="sum-value">${m(td,u)}</td>
            </tr>
        `),!1!==e.showTaxOnReceipt&&tc>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${te}%)</td>
                <td class="sum-value">${m(tc,u)}</td>
            </tr>
        `),tm>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${m(tm,u)}</td>
            </tr>
        `),tu>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${m(tu,u)}</td>
            </tr>
        `),tp>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${m(tp,u)}</td>
            </tr>
        `),tf>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${m(tf,u)}</td>
            </tr>
        `),th>0&&(ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${m(th,u)}</td>
            </tr>
        `),tb>0&&(ty+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${m(tb,u)}</td>
            </tr>
        `),ty+=`
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${m(tv,u)}</td>
        </tr>
    `,M.length>0&&(ty+=M.map(t=>`
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${c(t.method)}</td>
                <td class="sum-value">${m(t.amount,u)}</td>
            </tr>
        `).join(""),ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${m(U,u)}</td>
            </tr>
        `);let tw=b??t.amountTendered,tx=y??t.changeAmount;if(null!=tw&&tw>0){ty+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${m(tw,u)}</td>
            </tr>
        `;let t=tx??Math.max(0,tw-tv);ty+=`
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${m(t,u)}</td>
            </tr>
        `}let t$=e.receiptFooterNote?`<hr class="div-eq" /><div class="footer">${c(e.receiptFooterNote)}</div>`:"",tN=function(t){let e=o(t.googleReviewUrl);if(e)return{url:e,title:"Scan to Review / امسح للتقييم",alt:"Review QR"};let a=o(t.qrMenuUrl);return a?{url:a,title:"Scan for Menu / امسح للقائمة",alt:"Menu QR"}:null}(e),tA=tN?`
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${c(tN.title)}</div>
                    <img class="qr-image"
                         src="${c((x=new URLSearchParams({size:"512x512",data:tN.url,ecc:"M",qzone:"4",format:"png"}),`https://api.qrserver.com/v1/create-qr-code/?${x.toString()}`))}"
                         alt="${c(tN.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `:"";return`
        <div class="receipt">
            ${B}
            <hr class="div-eq" />
            ${H}
            <hr class="div-eq" />
            ${J}
            ${J?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${W}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${ty}
                </tbody>
            </table>

            ${t$}
            ${tA}
            <div style="height: 30px"></div>
        </div>
    `}function y(t){var e,r;let{order:i,settings:o,logoUrl:d,businessName:m,products:b=[],currency:y=o.currency||"USD",storeServiceChargeRate:w=0,storeTaxRate:x=0,customerPhone:$,customerName:N,amountTendered:A,changeAmount:P,targetWindow:T,forceReprint:S}=t,D=function(t,e){let a=e?`${f(t)}:reprint:${Date.now()}`:f(t);if(e)return{reserved:!0,id:a};let r=h();return r[a]?{reserved:!1,id:a}:(r[a]=Date.now(),window.localStorage.setItem(u,JSON.stringify(r)),{reserved:!0,id:a})}(i,S);if(!D.reserved){if(T&&!T.closed)try{T.close()}catch{}return}let C={...t,receiptTransactionId:D.id};if(T&&!T.closed)try{T.close()}catch{}let M=Math.max(1,Math.min(o.receiptCopies??1,5)),R=[];for(let t=0;t<M;t++){let e=t===M-1;R.push(v(i,o,d,m,b,y,w,x,$,N,A,P)+(e?"":'<div class="page-break"></div>'))}e=R,r=i,c((0,n.v)(r)??`#${r.orderNumber.slice(-4)}`),e.join("\n"),(async()=>{try{let{printReceiptViaHtml:t}=await a.e(7247).then(a.bind(a,97247));if(!await t(C)){g(D.id),s.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,l.iv)({id:D.id,orderId:i.id,publicOrderNumber:p(i),transactionId:D.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(t){g(D.id),console.error("printReceipt html path failed:",t),s.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function w(){return window.open("","_blank","width=460,height=700,scrollbars=yes,resizable=yes")}function x(t){let{order:e,settings:a,logoUrl:r,businessName:i,products:o=[],currency:n=a.currency||"USD",storeServiceChargeRate:s=0,storeTaxRate:l=0,customerPhone:d,customerName:c,amountTendered:m,changeAmount:u}=t,p=Math.max(1,Math.min(a.receiptCopies??1,5)),f=[];for(let t=0;t<p;t++){let h=t===p-1;f.push(v(e,a,r,i,o,n,s,l,d,c,m,u)+(h?"":'<div class="page-break"></div>'))}return f.join("\n")}function $(){return b}},53937:(t,e,a)=>{a.d(e,{Hs:()=>r,Mt:()=>p,So:()=>l,UD:()=>n,Vy:()=>s,Xt:()=>m,Zz:()=>o,dk:()=>f,hc:()=>d,pY:()=>c,r7:()=>u});let r="Asia/Qatar",i=/(Z|[+-]\d{2}:\d{2})$/i;function o(t){return t instanceof Date?t:new Date(t.includes("T")&&!i.test(t)?`${t}Z`:t)}function n(t,e,a,r){let i=r?.dateStyle||r?.timeStyle?{}:{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"};return new Intl.DateTimeFormat(a,{...i,timeZone:e,...r}).format(o(t))}function s(t,e,a,r){return new Intl.DateTimeFormat(a,{year:"numeric",month:"short",day:"2-digit",timeZone:e,...r}).format(o(t))}function l(t,e,a,r){return new Intl.DateTimeFormat(a,{hour:"2-digit",minute:"2-digit",timeZone:e,...r}).format(o(t))}function d(t,e){let a=h(o(t),e);return`${a.year}-${g(a.month)}-${g(a.day)}`}function c(t,e=new Date){return d(e,t)}function m(t,e){let[a,r,i]=t.split("-").map(Number);return new Date(Date.UTC(a,r-1,i+e)).toISOString().slice(0,10)}function u(t,e){let[a,r,i]=t.split("-").map(Number),o=Date.UTC(a,r-1,i),n=o;for(let t=0;t<4;t+=1){let t=h(new Date(n),e),a=o-Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second);if(n+=a,0===a)break}return new Date(n).toISOString()}function p(t,e,a){return{startUtc:u(t,a),endUtc:u(m(e,1),a)}}function f(){let t=Intl.supportedValuesOf;return t?t("timeZone"):[r,"UTC","Asia/Riyadh","Asia/Dubai","Europe/London","America/New_York"]}function h(t,e){let a=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(t).map(t=>[t.type,t.value]));return{year:Number(a.year),month:Number(a.month),day:Number(a.day),hour:Number(a.hour),minute:Number(a.minute),second:Number(a.second)}}function g(t){return String(t).padStart(2,"0")}},76725:(t,e,a)=>{a.r(e),a.d(e,{autoPrintReceiptForOrder:()=>d,printReceiptViaImage:()=>l,renderReceiptToPngBase64:()=>s});var r=a(80014),i=a.n(r),o=a(40154),n=a(80842);async function s(t){var e;let a,r=(0,o.buildReceiptBodyHtml)(t),n=(0,o.getReceiptCss)(),s=document.createElement("div");s.style.position="fixed",s.style.left="-99999px",s.style.top="0",s.style.width="576px",s.style.background="#ffffff",s.style.zIndex="-1",s.setAttribute("data-receipt-render","true"),s.setAttribute("dir","ltr"),s.style.direction="ltr",s.style.textAlign="left";let l=document.createElement("style");e='[data-receipt-render="true"]',l.textContent=Array.from(((a=n.indexOf("@media print"))>=0?n.slice(0,a):n).replace(/\/\*[\s\S]*?\*\//g,"").matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(([,t,a])=>{let r=t.split(",").map(t=>t.trim()).filter(Boolean).map(t=>"body"===t||"html"===t||":root"===t?e:"*"===t?`${e} *`:t.startsWith(e)?t:`${e} ${t}`);return r.length>0?`${r.join(", ")} {${a}}`:""}).filter(Boolean).join("\n"),s.appendChild(l);let d=document.createElement("div");d.innerHTML=r,s.appendChild(d),document.body.appendChild(s);try{return await function(t,e=4e3){let a=Array.from(t.querySelectorAll("img"));return 0===a.length?Promise.resolve():new Promise(t=>{let r=a.length,i=()=>{--r<=0&&t()};for(let t of a)t.complete?i():(t.addEventListener("load",i),t.addEventListener("error",i));setTimeout(t,e)})}(s),(await i()(s,{backgroundColor:"#ffffff",scale:1,useCORS:!0,allowTaint:!0,logging:!1,width:576,windowWidth:576})).toDataURL("image/png").replace(/^data:image\/png;base64,/,"")}finally{s.remove()}}async function l(t){try{let e=await s(t),a=await n.api.post(`/printing/orders/${t.order.id}/receipt-image`,{imageBase64:e});return!!a.data?.enqueued}catch(t){return console.error("printReceiptViaImage failed:",t),!1}}async function d(t){try{let[{useSettingsStore:e},{useBrandingStore:r},{usePosStore:i},{printReceipt:o}]=await Promise.all([a.e(7511).then(a.bind(a,97511)),a.e(7397).then(a.bind(a,17397)),Promise.resolve().then(a.bind(a,97012)),Promise.resolve().then(a.bind(a,40154))]),n=e.getState().settings,s=r.getState(),l=i.getState();o({order:t,settings:n,logoUrl:s.logoUrl??null,businessName:s.businessName??n.restaurantName,products:l.products,currency:l.currency||n.currency,storeServiceChargeRate:l.serviceChargeRate,storeTaxRate:l.taxRate})}catch(t){console.error("autoPrintReceiptForOrder failed:",t)}}},82019:(t,e,a)=>{a.d(e,{v:()=>r});function r(t){for(let e of[t?.displayOrderNumber,t?.orderSequenceNumber]){if("string"!=typeof e)continue;let t=e.trim();if(t.length>0)return t}return null}}}]);