"use strict";exports.id=767,exports.ids=[767],exports.modules={90767:(a,b,c)=>{c.r(b),c.d(b,{buildReceiptBodyHtml:()=>q,getReceiptCss:()=>r,openReceiptPrintWindow:()=>p,printReceipt:()=>o});var d=c(70272),e=c(92405);function f(a){return a?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}c(82833);var g=c(90707),h=c(67962);function i(a){return a?a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function j(a,b){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:b||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(a)}catch{return`${b} ${a.toFixed(2)}`}}function k(a){return a.publicOrderNumber||a.orderNumber||a.id}function l(a){return`receipt:${k(a)}:paid:${(0,d.Rh)(a).toFixed(2)}`}let m=`
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
`;function n(a,b,c,g,h,k,l=0,m=0,o,p,q,r){let s,t="Takeaway"===a.orderType,u="Delivery"===a.orderType||"DELIVERY"===a.tableName,v="Talabat"===a.orderSource,w="DeliveryPartner"===a.orderSource,x=a.deliveryPartnerName||a.deliveryPartnerCode||"Delivery Partner",y=w?"Delivery Partner / شريك توصيل":v?"Talabat / طلبات":u?a.deliveryZoneName||"Delivery / توصيل":t?"Takeaway / طلب خارجي":a.tableName||"—",z=(0,d.go)(a),A=(0,d.PX)(a),B=a.paymentMethod||A||"",C=A&&B&&A!==B?A:"",D=Array.from(new Set((a.payments??[]).map(a=>a.referenceNumber?.trim()).filter(a=>!!a))).join(" + "),E=v&&a.talabatPaymentMethod?`${"Cash"===a.talabatPaymentMethod?"Cash":"Prepaid"} / ${a.talabatPaymentMethod}`:"",F=w&&a.partnerPaymentMethod?a.partnerPaymentMethod:"",G=v?E||A:w?F||A:B,H=z.length?(0,d.Rh)(a):0,I=p?.trim()||a.customerName?.trim()||a.customerNameAr?.trim()||a.partnerCustomerName?.trim()||a.talabatCustomerName?.trim()||"",J=o?.trim()||a.customerPhone?.trim()||a.partnerCustomerPhone?.trim()||a.talabatCustomerPhone?.trim()||"",K=function(a){if(!a)return"";let b=new Date(a);return Number.isNaN(b.getTime())?"":b.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(a.talabatPickupTime),L=(a.items??[]).reduce((a,b)=>a+(b.quantity??0),0),M=b.showLogoOnReceipt&&c?`<img src="${i(c)}" alt="logo" class="logo" />`:"",N=`
        <div class="header">
            ${M}
            ${b.restaurantAddress?`<div class="rest-info">${i(b.restaurantAddress)}</div>`:""}
            ${b.restaurantPhone?`<div class="rest-info">Tel: ${i(b.restaurantPhone)}</div>`:""}
            ${b.taxNumber?`<div class="rest-info">Tax No: ${i(b.taxNumber)}</div>`:""}
        </div>
    `,O=`
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order #</td>
                <td class="meta-value">${i(a.orderNumber.slice(-4))}</td>
            </tr>
            <tr>
                <td class="meta-label">${w||v?"Source / المصدر":u?"Delivery Area / منطقة التوصيل":t?"Type":"Table"}</td>
                <td class="meta-value">${i(y)}</td>
            </tr>
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${new Date().toLocaleString("en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0})}</td>
            </tr>
            ${v&&a.talabatOrderNumber?`
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${i(a.talabatOrderNumber)}</td>
            </tr>`:""}
            ${w?`
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${i(x)}</td>
            </tr>`:""}
            ${w&&a.partnerOrderNumber?`
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${i(a.partnerOrderNumber)}</td>
            </tr>`:""}
            ${v&&K?`
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${i(K)}</td>
            </tr>`:""}
            ${v&&L>0?`
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${L}</td>
            </tr>`:""}
            ${G?`
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${i(G)}</td>
            </tr>`:""}
            ${C&&!v&&!w?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${i(C)}</td>
            </tr>`:""}
            ${D?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${i(D)}</td>
            </tr>`:""}
            ${I?`
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${i(I)}</td>
            </tr>`:""}
            ${J?`
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${i(J)}</td>
            </tr>`:""}
        </table>
    `,{offerCoveredTotal:P,visibleItems:Q}=function(a){let b=a.items?.find(a=>a.isOfferBundle);if(b)return{offerCoveredTotal:b.lineTotalAmount??0,visibleItems:a.items?.filter(a=>!a.isOfferBundle)??[]};let c=new Map;for(let b of a.offerProducts||[])c.set(b.productId,(c.get(b.productId)??0)+b.quantity);let d=0,e=[];for(let b of a.items||[]){let a=b.quantity??0,f=b.lineTotalAmount??0,g=a>0?f/a:0,h=!!b.notes||(b.modifiers?.length??0)>0,i=b.productId??"",j=0;if(!h&&i){let b=c.get(i)??0;b>0&&(j=Math.min(b,a),c.set(i,b-j))}j>0&&(d+=g*j);let k=a-j;k>0&&e.push({...b,quantity:k,lineTotalAmount:b.isComplimentary?0:Number((g*k).toFixed(2))})}return{offerCoveredTotal:Number(d.toFixed(2)),visibleItems:e}}(a),R=a.offerId&&(a.offerName||a.offerNameAr||(a.offerProducts?.length??0)>0)?`
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${a.offerName?`<span class="name-en">${i(a.offerName)}</span>`:""}
            ${a.offerNameAr?`<span class="name-ar">${i(a.offerNameAr)}</span>`:""}
            ${P>0?`
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${j(P,k)}</span>
                </div>
            `:""}
            ${(a.offerProducts||[]).map(a=>`
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${a.name?`<span class="name-en">${i(a.name)}</span>`:""}
                        ${a.nameAr?`<span class="name-ar">${i(a.nameAr)}</span>`:""}
                    </div>
                    <div class="offer-item-qty">x${a.quantity}</div>
                </div>
            `).join("")}
        </div>
    `:"",S="";for(let a of Q){let b=a.productName||"",c=h.find(b=>b.id===a.productId)?.nameAr??"",d=a.quantity??1,e=a.isComplimentary?0:a.lineTotalAmount??0;for(let f of(S+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${i(b)}</span>
                    ${c?`<span class="name-ar">${i(c)}</span>`:""}
                    ${a.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${d}</td>
                <td class="td-price">${a.isComplimentary?"—":j(e,k)}</td>
            </tr>
        `,a.selectedOptionName&&(S+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${i(a.selectedOptionName)}
                        ${a.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${i(a.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),a.modifiers||[])){if(!f.modifierName)continue;let a=(f.price??0)*(f.quantity??1);S+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${i(f.modifierName)}
                        ${f.modifierNameAr?`<span class="mod-name-ar">+ ${i(f.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${a>0?j(a,k):""}</td>
                </tr>
            `}for(let b of a.recipeSnapshot||[]){if(!b.sourceAlternativeId)continue;let a=b.sourceAlternativeName||b.rawMaterialName||"",c=b.sourceAlternativeNameAr||b.rawMaterialNameAr||"";(a||c)&&(S+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${i(a)}
                        ${c?`<span class="mod-name-ar">↪ ${i(c)}</span>`:""}
                    </td>
                </tr>
            `)}a.notes&&(S+=`
                <tr class="notes-row">
                    <td colspan="3">Note: ${i(a.notes)}</td>
                </tr>
            `)}let T=a.subtotal&&a.subtotal>0?a.subtotal:(a.items||[]).reduce((a,b)=>a+(b.lineTotalAmount??0),0),U=a.discountAmount&&a.discountAmount>0?a.discountAmount:T*((a.discountPercentage??0)/100),V=Math.round(100*U)/100,W=(a.serviceChargeRate??0)>0?a.serviceChargeRate:l,X=(a.taxRate??0)>0?a.taxRate:m,Y=(0,e.q)(T,V,W,X),Z=Y.afterDiscount,$=a.serviceChargeAmount&&a.serviceChargeAmount>0?a.serviceChargeAmount:Y.serviceAmount,_=a.taxAmount&&a.taxAmount>0?a.taxAmount:Y.taxAmount,aa=Math.max(0,Math.round((a.deliveryFee??0)*100)/100),ab=Math.max(0,Math.round((a.talabatDeliveryFee??0)*100)/100),ac=Math.max(0,Math.round((a.talabatServiceFee??0)*100)/100),ad=Math.max(0,Math.round((a.partnerDeliveryFee??0)*100)/100),ae=Math.max(0,Math.round((a.partnerServiceFee??0)*100)/100),af=Math.round((Z+$+_+aa+ab+ac+ad+ae)*100)/100,ag=!0===a.isVoucherApplied?Math.max(0,Math.round((a.voucherDiscountAmount??0)*100)/100):0,ah=Math.round(100*Math.max(0,af-ag))/100,ai=`
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${j(T,k)}</td>
        </tr>
    `;U>0&&(ai+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${a.discountPercentage??0}%)</td>
                <td class="sum-value">-${j(U,k)}</td>
            </tr>
        `),$>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${W}%)</td>
                <td class="sum-value">${j($,k)}</td>
            </tr>
        `),!1!==b.showTaxOnReceipt&&_>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${X}%)</td>
                <td class="sum-value">${j(_,k)}</td>
            </tr>
        `),aa>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${j(aa,k)}</td>
            </tr>
        `),ab>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${j(ab,k)}</td>
            </tr>
        `),ac>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${j(ac,k)}</td>
            </tr>
        `),ad>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${j(ad,k)}</td>
            </tr>
        `),ae>0&&(ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${j(ae,k)}</td>
            </tr>
        `),ag>0&&(ai+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${j(ag,k)}</td>
            </tr>
        `),ai+=`
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${j(ah,k)}</td>
        </tr>
    `,z.length>0&&(ai+=z.map(a=>`
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${i(a.method)}</td>
                <td class="sum-value">${j(a.amount,k)}</td>
            </tr>
        `).join(""),ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${j(H,k)}</td>
            </tr>
        `);let aj=q??a.amountTendered,ak=r??a.changeAmount;if(null!=aj&&aj>0){ai+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${j(aj,k)}</td>
            </tr>
        `;let a=ak??Math.max(0,aj-ah);ai+=`
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${j(a,k)}</td>
            </tr>
        `}let al=b.receiptFooterNote?`<hr class="div-eq" /><div class="footer">${i(b.receiptFooterNote)}</div>`:"",am=function(a){let b=f(a.googleReviewUrl);if(b)return{url:b,title:"Scan to Review / امسح للتقييم",alt:"Review QR"};let c=f(a.qrMenuUrl);return c?{url:c,title:"Scan for Menu / امسح للقائمة",alt:"Menu QR"}:null}(b),an=am?`
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${i(am.title)}</div>
                    <img class="qr-image"
                         src="${i((s=new URLSearchParams({size:"512x512",data:am.url,ecc:"M",qzone:"4",format:"png"}),`https://api.qrserver.com/v1/create-qr-code/?${s.toString()}`))}"
                         alt="${i(am.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `:"";return`
        <div class="receipt">
            ${N}
            <hr class="div-eq" />
            ${O}
            <hr class="div-eq" />
            ${R}
            ${R?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${S}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${ai}
                </tbody>
            </table>

            ${al}
            ${an}
            <div style="height: 30px"></div>
        </div>
    `}function o(a){var b;let{order:d,settings:e,logoUrl:f,businessName:j,products:m=[],currency:o=e.currency||"USD",storeServiceChargeRate:p=0,storeTaxRate:q=0,customerPhone:r,customerName:s,amountTendered:t,changeAmount:u,targetWindow:v,forceReprint:w}=a,x={reserved:!0,id:w?`${l(d)}:reprint:${Date.now()}`:l(d)};if(!x.reserved){if(v&&!v.closed)try{v.close()}catch{}return}let y={...a,receiptTransactionId:x.id};if(v&&!v.closed)try{v.close()}catch{}let z=Math.max(1,Math.min(e.receiptCopies??1,5)),A=[];for(let a=0;a<z;a++){let b=a===z-1;A.push(n(d,e,f,j,m,o,p,q,r,s,t,u)+(b?"":'<div class="page-break"></div>'))}b=A,i(d.orderNumber.slice(-4)),b.join("\n"),(async()=>{try{let{printReceiptViaHtml:a}=await c.e(9216).then(c.bind(c,59216));if(!await a(y)){x.id,g.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,h.iv)({id:x.id,orderId:d.id,publicOrderNumber:k(d),transactionId:x.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(a){x.id,console.error("printReceipt html path failed:",a),g.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function p(){return null}function q(a){let{order:b,settings:c,logoUrl:d,businessName:e,products:f=[],currency:g=c.currency||"USD",storeServiceChargeRate:h=0,storeTaxRate:i=0,customerPhone:j,customerName:k,amountTendered:l,changeAmount:m}=a,o=Math.max(1,Math.min(c.receiptCopies??1,5)),p=[];for(let a=0;a<o;a++){let q=a===o-1;p.push(n(b,c,d,e,f,g,h,i,j,k,l,m)+(q?"":'<div class="page-break"></div>'))}return p.join("\n")}function r(){return m}},92405:(a,b,c)=>{function d(a,b,c,d){let e=Math.max(0,a-b),f=Math.round(c/100*e*100)/100,g=Math.round(d/100*e*100)/100,h=Math.round((e+f+g)*100)/100;return{afterDiscount:e,serviceAmount:f,taxAmount:g,total:h}}function e(a,b){return Math.round(100*Math.max(0,a-Math.max(0,b)))/100}c.d(b,{X:()=>e,q:()=>d})}};