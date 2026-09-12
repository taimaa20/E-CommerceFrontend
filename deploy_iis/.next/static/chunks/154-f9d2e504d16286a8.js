"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[154],{40154:(t,e,a)=>{a.r(e),a.d(e,{buildReceiptBodyHtml:()=>x,getReceiptCss:()=>w,openReceiptPrintWindow:()=>v,printReceipt:()=>g});var r=a(44737),i=a(44156);function s(t){return t?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}a(15340);var o=a(29094),l=a(74727);function n(t){return t?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function d(t,e){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:e||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(t)}catch{return`${e} ${t.toFixed(2)}`}}let c="pos:printed-receipts:v1";function m(t){return t.publicOrderNumber||t.orderNumber||t.id}function p(t){return`receipt:${m(t)}:paid:${(0,r.Rh)(t).toFixed(2)}`}function u(){let t=window.localStorage.getItem(c);if(!t)return{};try{return JSON.parse(t)}catch{return window.localStorage.removeItem(c),{}}}function f(t){let e=u();delete e[t],window.localStorage.setItem(c,JSON.stringify(e))}let h=`
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
`;function b(t,e,a,o,l,c,m=0,p=0,u,f,h,g){let v,x="Takeaway"===t.orderType,w="Delivery"===t.orderType||"DELIVERY"===t.tableName,y="Talabat"===t.orderSource,$="DeliveryPartner"===t.orderSource,N=t.deliveryPartnerName||t.deliveryPartnerCode||"Delivery Partner",A=$?"Delivery Partner / شريك توصيل":y?"Talabat / طلبات":w?t.deliveryZoneName||"Delivery / توصيل":x?"Takeaway / طلب خارجي":t.tableName||"—",M=(0,r.go)(t),P=(0,r.PX)(t),q=t.paymentMethod||P||"",T=P&&q&&P!==q?P:"",S=Array.from(new Set((t.payments??[]).map(t=>t.referenceNumber?.trim()).filter(t=>!!t))).join(" + "),z=y&&t.talabatPaymentMethod?`${"Cash"===t.talabatPaymentMethod?"Cash":"Prepaid"} / ${t.talabatPaymentMethod}`:"",k=$&&t.partnerPaymentMethod?t.partnerPaymentMethod:"",C=y?z||P:$?k||P:q,D=M.length?(0,r.Rh)(t):0,R=f?.trim()||t.customerName?.trim()||t.customerNameAr?.trim()||t.partnerCustomerName?.trim()||t.talabatCustomerName?.trim()||"",O=u?.trim()||t.customerPhone?.trim()||t.partnerCustomerPhone?.trim()||t.talabatCustomerPhone?.trim()||"",I=function(t){if(!t)return"";let e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(t.talabatPickupTime),F=(t.items??[]).reduce((t,e)=>t+(e.quantity??0),0),j=e.showLogoOnReceipt&&a?`<img src="${n(a)}" alt="logo" class="logo" />`:"",U=`
        <div class="header">
            ${j}
            ${e.restaurantAddress?`<div class="rest-info">${n(e.restaurantAddress)}</div>`:""}
            ${e.restaurantPhone?`<div class="rest-info">Tel: ${n(e.restaurantPhone)}</div>`:""}
            ${e.taxNumber?`<div class="rest-info">Tax No: ${n(e.taxNumber)}</div>`:""}
        </div>
    `,L=`
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order #</td>
                <td class="meta-value">${n(t.orderNumber.slice(-4))}</td>
            </tr>
            <tr>
                <td class="meta-label">${$||y?"Source / المصدر":w?"Delivery Area / منطقة التوصيل":x?"Type":"Table"}</td>
                <td class="meta-value">${n(A)}</td>
            </tr>
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${new Date().toLocaleString("en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0})}</td>
            </tr>
            ${y&&t.talabatOrderNumber?`
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${n(t.talabatOrderNumber)}</td>
            </tr>`:""}
            ${$?`
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${n(N)}</td>
            </tr>`:""}
            ${$&&t.partnerOrderNumber?`
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${n(t.partnerOrderNumber)}</td>
            </tr>`:""}
            ${y&&I?`
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${n(I)}</td>
            </tr>`:""}
            ${y&&F>0?`
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${F}</td>
            </tr>`:""}
            ${C?`
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${n(C)}</td>
            </tr>`:""}
            ${T&&!y&&!$?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${n(T)}</td>
            </tr>`:""}
            ${S?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${n(S)}</td>
            </tr>`:""}
            ${R?`
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${n(R)}</td>
            </tr>`:""}
            ${O?`
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${n(O)}</td>
            </tr>`:""}
        </table>
    `,{offerCoveredTotal:_,visibleItems:E}=function(t){let e=t.items?.find(t=>t.isOfferBundle);if(e)return{offerCoveredTotal:e.lineTotalAmount??0,visibleItems:t.items?.filter(t=>!t.isOfferBundle)??[]};let a=new Map;for(let e of t.offerProducts||[])a.set(e.productId,(a.get(e.productId)??0)+e.quantity);let r=0,i=[];for(let e of t.items||[]){let t=e.quantity??0,s=e.lineTotalAmount??0,o=t>0?s/t:0,l=!!e.notes||(e.modifiers?.length??0)>0,n=e.productId??"",d=0;if(!l&&n){let e=a.get(n)??0;e>0&&(d=Math.min(e,t),a.set(n,e-d))}d>0&&(r+=o*d);let c=t-d;c>0&&i.push({...e,quantity:c,lineTotalAmount:e.isComplimentary?0:Number((o*c).toFixed(2))})}return{offerCoveredTotal:Number(r.toFixed(2)),visibleItems:i}}(t),Q=t.offerId&&(t.offerName||t.offerNameAr||(t.offerProducts?.length??0)>0)?`
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${t.offerName?`<span class="name-en">${n(t.offerName)}</span>`:""}
            ${t.offerNameAr?`<span class="name-ar">${n(t.offerNameAr)}</span>`:""}
            ${_>0?`
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${d(_,c)}</span>
                </div>
            `:""}
            ${(t.offerProducts||[]).map(t=>`
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${t.name?`<span class="name-en">${n(t.name)}</span>`:""}
                        ${t.nameAr?`<span class="name-ar">${n(t.nameAr)}</span>`:""}
                    </div>
                    <div class="offer-item-qty">x${t.quantity}</div>
                </div>
            `).join("")}
        </div>
    `:"",B="";for(let t of E){let e=t.productName||"",a=l.find(e=>e.id===t.productId)?.nameAr??"",r=t.quantity??1,i=t.isComplimentary?0:t.lineTotalAmount??0;for(let s of(B+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${n(e)}</span>
                    ${a?`<span class="name-ar">${n(a)}</span>`:""}
                    ${t.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${r}</td>
                <td class="td-price">${t.isComplimentary?"—":d(i,c)}</td>
            </tr>
        `,t.selectedOptionName&&(B+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${n(t.selectedOptionName)}
                        ${t.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${n(t.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),t.modifiers||[])){if(!s.modifierName)continue;let t=(s.price??0)*(s.quantity??1);B+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${n(s.modifierName)}
                        ${s.modifierNameAr?`<span class="mod-name-ar">+ ${n(s.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${t>0?d(t,c):""}</td>
                </tr>
            `}for(let e of t.recipeSnapshot||[]){if(!e.sourceAlternativeId)continue;let t=e.sourceAlternativeName||e.rawMaterialName||"",a=e.sourceAlternativeNameAr||e.rawMaterialNameAr||"";(t||a)&&(B+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${n(t)}
                        ${a?`<span class="mod-name-ar">↪ ${n(a)}</span>`:""}
                    </td>
                </tr>
            `)}t.notes&&(B+=`
                <tr class="notes-row">
                    <td colspan="3">Note: ${n(t.notes)}</td>
                </tr>
            `)}let H=t.subtotal&&t.subtotal>0?t.subtotal:(t.items||[]).reduce((t,e)=>t+(e.lineTotalAmount??0),0),J=t.discountAmount&&t.discountAmount>0?t.discountAmount:H*((t.discountPercentage??0)/100),V=Math.round(100*J)/100,X=(t.serviceChargeRate??0)>0?t.serviceChargeRate:m,G=(t.taxRate??0)>0?t.taxRate:p,W=(0,i.q)(H,V,X,G),Y=W.afterDiscount,Z=t.serviceChargeAmount&&t.serviceChargeAmount>0?t.serviceChargeAmount:W.serviceAmount,K=t.taxAmount&&t.taxAmount>0?t.taxAmount:W.taxAmount,tt=Math.max(0,Math.round((t.deliveryFee??0)*100)/100),te=Math.max(0,Math.round((t.talabatDeliveryFee??0)*100)/100),ta=Math.max(0,Math.round((t.talabatServiceFee??0)*100)/100),tr=Math.max(0,Math.round((t.partnerDeliveryFee??0)*100)/100),ti=Math.max(0,Math.round((t.partnerServiceFee??0)*100)/100),ts=Math.round((Y+Z+K+tt+te+ta+tr+ti)*100)/100,to=!0===t.isVoucherApplied?Math.max(0,Math.round((t.voucherDiscountAmount??0)*100)/100):0,tl=Math.round(100*Math.max(0,ts-to))/100,tn=`
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${d(H,c)}</td>
        </tr>
    `;J>0&&(tn+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${t.discountPercentage??0}%)</td>
                <td class="sum-value">-${d(J,c)}</td>
            </tr>
        `),Z>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${X}%)</td>
                <td class="sum-value">${d(Z,c)}</td>
            </tr>
        `),!1!==e.showTaxOnReceipt&&K>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${G}%)</td>
                <td class="sum-value">${d(K,c)}</td>
            </tr>
        `),tt>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${d(tt,c)}</td>
            </tr>
        `),te>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${d(te,c)}</td>
            </tr>
        `),ta>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${d(ta,c)}</td>
            </tr>
        `),tr>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${d(tr,c)}</td>
            </tr>
        `),ti>0&&(tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${d(ti,c)}</td>
            </tr>
        `),to>0&&(tn+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${d(to,c)}</td>
            </tr>
        `),tn+=`
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${d(tl,c)}</td>
        </tr>
    `,M.length>0&&(tn+=M.map(t=>`
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${n(t.method)}</td>
                <td class="sum-value">${d(t.amount,c)}</td>
            </tr>
        `).join(""),tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${d(D,c)}</td>
            </tr>
        `);let td=h??t.amountTendered,tc=g??t.changeAmount;if(null!=td&&td>0){tn+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${d(td,c)}</td>
            </tr>
        `;let t=tc??Math.max(0,td-tl);tn+=`
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${d(t,c)}</td>
            </tr>
        `}let tm=e.receiptFooterNote?`<hr class="div-eq" /><div class="footer">${n(e.receiptFooterNote)}</div>`:"",tp=function(t){let e=s(t.googleReviewUrl);if(e)return{url:e,title:"Scan to Review / امسح للتقييم",alt:"Review QR"};let a=s(t.qrMenuUrl);return a?{url:a,title:"Scan for Menu / امسح للقائمة",alt:"Menu QR"}:null}(e),tu=tp?`
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${n(tp.title)}</div>
                    <img class="qr-image"
                         src="${n((v=new URLSearchParams({size:"512x512",data:tp.url,ecc:"M",qzone:"4",format:"png"}),`https://api.qrserver.com/v1/create-qr-code/?${v.toString()}`))}"
                         alt="${n(tp.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `:"";return`
        <div class="receipt">
            ${U}
            <hr class="div-eq" />
            ${L}
            <hr class="div-eq" />
            ${Q}
            ${Q?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${B}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${tn}
                </tbody>
            </table>

            ${tm}
            ${tu}
            <div style="height: 30px"></div>
        </div>
    `}function g(t){var e;let{order:r,settings:i,logoUrl:s,businessName:d,products:h=[],currency:g=i.currency||"USD",storeServiceChargeRate:v=0,storeTaxRate:x=0,customerPhone:w,customerName:y,amountTendered:$,changeAmount:N,targetWindow:A,forceReprint:M}=t,P=function(t,e){let a=e?`${p(t)}:reprint:${Date.now()}`:p(t);if(e)return{reserved:!0,id:a};let r=u();return r[a]?{reserved:!1,id:a}:(r[a]=Date.now(),window.localStorage.setItem(c,JSON.stringify(r)),{reserved:!0,id:a})}(r,M);if(!P.reserved){if(A&&!A.closed)try{A.close()}catch{}return}let q={...t,receiptTransactionId:P.id};if(A&&!A.closed)try{A.close()}catch{}let T=Math.max(1,Math.min(i.receiptCopies??1,5)),S=[];for(let t=0;t<T;t++){let e=t===T-1;S.push(b(r,i,s,d,h,g,v,x,w,y,$,N)+(e?"":'<div class="page-break"></div>'))}e=S,n(r.orderNumber.slice(-4)),e.join("\n"),(async()=>{try{let{printReceiptViaHtml:t}=await a.e(7247).then(a.bind(a,97247));if(!await t(q)){f(P.id),o.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,l.iv)({id:P.id,orderId:r.id,publicOrderNumber:m(r),transactionId:P.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(t){f(P.id),console.error("printReceipt html path failed:",t),o.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function v(){return window.open("","_blank","width=460,height=700,scrollbars=yes,resizable=yes")}function x(t){let{order:e,settings:a,logoUrl:r,businessName:i,products:s=[],currency:o=a.currency||"USD",storeServiceChargeRate:l=0,storeTaxRate:n=0,customerPhone:d,customerName:c,amountTendered:m,changeAmount:p}=t,u=Math.max(1,Math.min(a.receiptCopies??1,5)),f=[];for(let t=0;t<u;t++){let h=t===u-1;f.push(b(e,a,r,i,s,o,l,n,d,c,m,p)+(h?"":'<div class="page-break"></div>'))}return f.join("\n")}function w(){return h}},44156:(t,e,a)=>{function r(t,e,a,r){let i=Math.max(0,t-e),s=Math.round(a/100*i*100)/100,o=Math.round(r/100*i*100)/100,l=Math.round((i+s+o)*100)/100;return{afterDiscount:i,serviceAmount:s,taxAmount:o,total:l}}function i(t,e){return Math.round(100*Math.max(0,t-Math.max(0,e)))/100}a.d(e,{X:()=>i,q:()=>r})}}]);