"use strict";exports.id=767,exports.ids=[767],exports.modules={90767:(a,b,c)=>{c.r(b),c.d(b,{buildReceiptBodyHtml:()=>s,getReceiptCss:()=>t,openReceiptPrintWindow:()=>r,printReceipt:()=>q});var d=c(70272),e=c(19756);function f(a){return a?.trim().replace(/^["']|["']$/g,"").replace(/&amp;/g,"&")||null}c(56089);var g=c(11718),h=c(90707),i=c(67962),j=c(32576);function k(a){return a?a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):""}function l(a,b){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:b||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(a)}catch{return`${b} ${a.toFixed(2)}`}}function m(a){return a.publicOrderNumber||a.orderNumber||a.id}function n(a){return`receipt:${m(a)}:paid:${(0,d.Rh)(a).toFixed(2)}`}let o=`
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
`;function p(a,b,c,h,i,m,n=0,o=0,q,r,s,t){var u;let v,w="Takeaway"===a.orderType,x="Delivery"===a.orderType||"DELIVERY"===a.tableName,y="Talabat"===a.orderSource,z="DeliveryPartner"===a.orderSource,A=a.deliveryAddress??"",B=A.trim().length>0&&(x||y||z),C=a.deliveryPartnerName||a.deliveryPartnerCode||"Delivery Partner",D=z?"Delivery Partner / شريك توصيل":y?"Talabat / طلبات":x?a.deliveryZoneName||"Delivery / توصيل":w?"Takeaway / طلب خارجي":a.tableName||"—",E=(0,d.go)(a),F=(0,d.PX)(a),G=a.paymentMethod||F||"",H=F&&G&&F!==G?F:"",I=Array.from(new Set((a.payments??[]).map(a=>a.referenceNumber?.trim()).filter(a=>!!a))).join(" + "),J=y&&a.talabatPaymentMethod?`${"Cash"===a.talabatPaymentMethod?"Cash":"Prepaid"} / ${a.talabatPaymentMethod}`:"",K=z&&a.partnerPaymentMethod?a.partnerPaymentMethod:"",L=y?J||F:z?K||F:G,M=E.length?(0,d.Rh)(a):0,N=r?.trim()||a.customerName?.trim()||a.customerNameAr?.trim()||a.partnerCustomerName?.trim()||a.talabatCustomerName?.trim()||"",O=q?.trim()||a.customerPhone?.trim()||a.partnerCustomerPhone?.trim()||a.talabatCustomerPhone?.trim()||"",P=function(a,b){if(!a)return"";let c=new Date(a);return Number.isNaN(c.getTime())?"":(0,j.So)(c,b,"en-US",{hour:"2-digit",minute:"2-digit",hour12:!1})}(a.talabatPickupTime,b.timeZoneId),Q=(a.items??[]).reduce((a,b)=>a+(b.quantity??0),0),R=b.showLogoOnReceipt&&c?`<img src="${k(c)}" alt="logo" class="logo" />`:"",S=`
        <div class="header">
            ${R}
            ${b.restaurantAddress?`<div class="rest-info">${k(b.restaurantAddress)}</div>`:""}
            ${b.restaurantPhone?`<div class="rest-info">Tel: ${k(b.restaurantPhone)}</div>`:""}
            ${b.taxNumber?`<div class="rest-info">Tax No: ${k(b.taxNumber)}</div>`:""}
        </div>
    `,T=(0,g.v)(a),U=`
        <table class="meta-table">
            <tr>
                <td class="meta-label">Order</td>
                <td class="meta-value">${k(T??`#${a.orderNumber.slice(-4)}`)}</td>
            </tr>
            ${T?`
            <tr>
                <td class="meta-label">System ID</td>
                <td class="meta-value">${k(a.orderNumber)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">${z||y?"Source / المصدر":x?"Delivery Area / منطقة التوصيل":w?"Type":"Table"}</td>
                <td class="meta-value">${k(D)}</td>
            </tr>
            ${B?`
            <tr>
                <td class="meta-label">Address / العنوان</td>
                <td class="meta-value meta-value-address">${k(A)}</td>
            </tr>`:""}
            <tr>
                <td class="meta-label">Date</td>
                <td class="meta-value">${(u=b.timeZoneId,(0,j.UD)(new Date,u,"en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0}))}</td>
            </tr>
            ${y&&a.talabatOrderNumber?`
            <tr>
                <td class="meta-label">Talabat #</td>
                <td class="meta-value">${k(a.talabatOrderNumber)}</td>
            </tr>`:""}
            ${z?`
            <tr>
                <td class="meta-label">Partner</td>
                <td class="meta-value">${k(C)}</td>
            </tr>`:""}
            ${z&&a.partnerOrderNumber?`
            <tr>
                <td class="meta-label">Partner #</td>
                <td class="meta-value">${k(a.partnerOrderNumber)}</td>
            </tr>`:""}
            ${y&&P?`
            <tr>
                <td class="meta-label">Pickup Time</td>
                <td class="meta-value">${k(P)}</td>
            </tr>`:""}
            ${y&&Q>0?`
            <tr>
                <td class="meta-label">Items</td>
                <td class="meta-value">${Q}</td>
            </tr>`:""}
            ${L?`
            <tr>
                <td class="meta-label">Payment Type</td>
                <td class="meta-value">${k(L)}</td>
            </tr>`:""}
            ${H&&!y&&!z?`
            <tr>
                <td class="meta-label">Payment Method</td>
                <td class="meta-value">${k(H)}</td>
            </tr>`:""}
            ${I?`
            <tr>
                <td class="meta-label">Payment Reference</td>
                <td class="meta-value">${k(I)}</td>
            </tr>`:""}
            ${N?`
            <tr>
                <td class="meta-label">Customer</td>
                <td class="meta-value">${k(N)}</td>
            </tr>`:""}
            ${O?`
            <tr>
                <td class="meta-label">Phone</td>
                <td class="meta-value">${k(O)}</td>
            </tr>`:""}
        </table>
    `,{offerCoveredTotal:V,visibleItems:W}=function(a){let b=a.items?.find(a=>a.isOfferBundle);if(b)return{offerCoveredTotal:b.lineTotalAmount??0,visibleItems:a.items?.filter(a=>!a.isOfferBundle)??[]};let c=new Map;for(let b of a.offerProducts||[])c.set(b.productId,(c.get(b.productId)??0)+b.quantity);let d=0,e=[];for(let b of a.items||[]){let a=b.quantity??0,f=b.lineTotalAmount??0,g=a>0?f/a:0,h=!!b.notes||(b.modifiers?.length??0)>0,i=b.productId??"",j=0;if(!h&&i){let b=c.get(i)??0;b>0&&(j=Math.min(b,a),c.set(i,b-j))}j>0&&(d+=g*j);let k=a-j;k>0&&e.push({...b,quantity:k,lineTotalAmount:b.isComplimentary?0:Number((g*k).toFixed(2))})}return{offerCoveredTotal:Number(d.toFixed(2)),visibleItems:e}}(a),X=a.offerId&&(a.offerName||a.offerNameAr||(a.offerProducts?.length??0)>0)?`
        <div class="offer-box">
            <div class="offer-title">Offer / العرض</div>
            <div class="offer-subtitle">Included Items / محتوى العرض</div>
            ${a.offerName?`<span class="name-en">${k(a.offerName)}</span>`:""}
            ${a.offerNameAr?`<span class="name-ar">${k(a.offerNameAr)}</span>`:""}
            ${V>0?`
                <div class="offer-price-row">
                    <span class="offer-price-label">Offer Price / سعر العرض</span>
                    <span class="offer-price-value">${l(V,m)}</span>
                </div>
            `:""}
            ${(a.offerProducts||[]).map(a=>`
                <div class="offer-item">
                    <div class="offer-item-copy">
                        ${a.name?`<span class="name-en">${k(a.name)}</span>`:""}
                        ${a.nameAr?`<span class="name-ar">${k(a.nameAr)}</span>`:""}
                    </div>
                    <div class="offer-item-qty">x${a.quantity}</div>
                </div>
            `).join("")}
        </div>
    `:"",Y="";for(let a of W){let b=a.productName||"",c=i.find(b=>b.id===a.productId)?.nameAr??"",d=a.quantity??1,e=a.isComplimentary?0:a.lineTotalAmount??0;for(let f of(Y+=`
            <tr>
                <td class="td-name">
                    <span class="name-en">${k(b)}</span>
                    ${c?`<span class="name-ar">${k(c)}</span>`:""}
                    ${a.isComplimentary?'<span class="comp-badge">(Complimentary)</span>':""}
                </td>
                <td class="td-qty">${d}</td>
                <td class="td-price">${a.isComplimentary?"—":l(e,m)}</td>
            </tr>
        `,a.selectedOptionName&&(Y+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ▸ ${k(a.selectedOptionName)}
                        ${a.selectedOptionNameAr?`<span class="mod-name-ar">▸ ${k(a.selectedOptionNameAr)}</span>`:""}
                    </td>
                </tr>
            `),a.modifiers||[])){if(!f.modifierName)continue;let a=(f.price??0)*(f.quantity??1);Y+=`
                <tr class="mod-row">
                    <td colspan="2" class="mod-name">
                        + ${k(f.modifierName)}
                        ${f.modifierNameAr?`<span class="mod-name-ar">+ ${k(f.modifierNameAr)}</span>`:""}
                    </td>
                    <td class="td-price">${a>0?l(a,m):""}</td>
                </tr>
            `}for(let b of a.recipeSnapshot||[]){if(!b.sourceAlternativeId)continue;let a=b.sourceAlternativeName||b.rawMaterialName||"",c=b.sourceAlternativeNameAr||b.rawMaterialNameAr||"";(a||c)&&(Y+=`
                <tr class="mod-row">
                    <td colspan="3" class="mod-name">
                        ↪ ${k(a)}
                        ${c?`<span class="mod-name-ar">↪ ${k(c)}</span>`:""}
                    </td>
                </tr>
            `)}a.notes&&(Y+=`
                <tr class="notes-row">
                    <td colspan="3">Note: ${k(a.notes)}</td>
                </tr>
            `)}let Z=a.subtotal&&a.subtotal>0?a.subtotal:(a.items||[]).reduce((a,b)=>a+(b.lineTotalAmount??0),0),$=a.discountAmount&&a.discountAmount>0?a.discountAmount:Z*((a.discountPercentage??0)/100),_=Math.round(100*$)/100,aa=(a.serviceChargeRate??0)>0?a.serviceChargeRate:n,ab=(a.taxRate??0)>0?a.taxRate:o,ac=a.discountType??(a.discountPercentage>0?"Percentage":null),ad=a.discountValue??a.discountPercentage??0,ae=a.discountGroupType??0,af=a.discountGroupValue??0,ag=(0,e.rb)(Z,ac,ad,aa,ab,af,ae),ah=a.discountGroupAmount&&a.discountGroupAmount>0?Math.round(100*a.discountGroupAmount)/100:ag.discountGroupAmount,ai=Z-_-ah,aj=a.serviceChargeAmount&&a.serviceChargeAmount>0?a.serviceChargeAmount:ag.serviceChargeAmount,ak=a.taxAmount&&a.taxAmount>0?a.taxAmount:ag.taxAmount,al=Math.max(0,Math.round((a.deliveryFee??0)*100)/100),am=Math.max(0,Math.round((a.talabatDeliveryFee??0)*100)/100),an=Math.max(0,Math.round((a.talabatServiceFee??0)*100)/100),ao=Math.max(0,Math.round((a.partnerDeliveryFee??0)*100)/100),ap=Math.max(0,Math.round((a.partnerServiceFee??0)*100)/100),aq=Math.round((ai+aj+ak+al+am+an+ao+ap)*100)/100,ar=!0===a.isVoucherApplied?Math.max(0,Math.round((a.voucherDiscountAmount??0)*100)/100):0,as=Math.round(100*Math.max(0,aq-ar))/100,at=`
        <tr class="sum-row">
            <td colspan="2" class="sum-label">Subtotal</td>
            <td class="sum-value">${l(Z,m)}</td>
        </tr>
    `;if($>0&&(at+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Discount (${"Percentage"===ac?`${ad}%`:l(ad,m)})</td>
                <td class="sum-value">-${l($,m)}</td>
            </tr>
        `),ah>0){let b=0===ae?` (${af}%)`:"",c=a.discountGroupName?`${a.discountGroupName}${b}`:`Group Discount / خصم الفئة${b}`;at+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">${c}</td>
                <td class="sum-value">-${l(ah,m)}</td>
            </tr>
        `}aj>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Service (${aa}%)</td>
                <td class="sum-value">${l(aj,m)}</td>
            </tr>
        `),!1!==b.showTaxOnReceipt&&ak>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Tax (${ab}%)</td>
                <td class="sum-value">${l(ak,m)}</td>
            </tr>
        `),al>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Delivery Fee / رسوم التوصيل</td>
                <td class="sum-value">${l(al,m)}</td>
            </tr>
        `),am>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Delivery / توصيل طلبات</td>
                <td class="sum-value">${l(am,m)}</td>
            </tr>
        `),an>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Talabat Service / خدمة طلبات</td>
                <td class="sum-value">${l(an,m)}</td>
            </tr>
        `),ao>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Delivery / توصيل الشريك</td>
                <td class="sum-value">${l(ao,m)}</td>
            </tr>
        `),ap>0&&(at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Partner Service / خدمة الشريك</td>
                <td class="sum-value">${l(ap,m)}</td>
            </tr>
        `),ar>0&&(at+=`
            <tr class="sum-row discount-row">
                <td colspan="2" class="sum-label">Voucher / قسيمة</td>
                <td class="sum-value">-${l(ar,m)}</td>
            </tr>
        `),at+=`
        <tr class="total-row">
            <td colspan="2" class="total-label">TOTAL</td>
            <td class="total-value">${l(as,m)}</td>
        </tr>
    `,E.length>0&&(at+=E.map(a=>`
            <tr class="pay-row">
                <td colspan="2" class="sum-label">Paid: ${k(a.method)}</td>
                <td class="sum-value">${l(a.amount,m)}</td>
            </tr>
        `).join(""),at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Total Paid</td>
                <td class="sum-value">${l(M,m)}</td>
            </tr>
        `);let au=s??a.amountTendered,av=t??a.changeAmount;if(null!=au&&au>0){at+=`
            <tr class="sum-row">
                <td colspan="2" class="sum-label">Cash Given</td>
                <td class="sum-value">${l(au,m)}</td>
            </tr>
        `;let a=av??Math.max(0,au-as);at+=`
            <tr class="sum-row" style="font-weight:bold">
                <td colspan="2" class="sum-label">Change</td>
                <td class="sum-value">${l(a,m)}</td>
            </tr>
        `}let aw=b.receiptFooterNote?`<hr class="div-eq" /><div class="footer">${k(b.receiptFooterNote)}</div>`:"",ax=function(a){let b=f(a.googleReviewUrl);if(b)return{url:b,title:"Scan to Review / امسح للتقييم",alt:"Review QR"};let c=f(a.qrMenuUrl);return c?{url:c,title:"Scan for Menu / امسح للقائمة",alt:"Menu QR"}:null}(b),ay=ax?`
            <div class="qr-wrapper">
                <hr class="div-eq" />
                <div class="qr-section">
                    <div class="qr-title">${k(ax.title)}</div>
                    <img class="qr-image"
                         src="${k((v=new URLSearchParams({size:"512x512",data:ax.url,ecc:"M",qzone:"4",format:"png"}),`https://api.qrserver.com/v1/create-qr-code/?${v.toString()}`))}"
                         alt="${k(ax.alt)}"
                         onerror="var p=this.closest && this.closest('.qr-wrapper'); if (p) p.remove(); else this.style.display='none';" />
                </div>
            </div>
        `:"";return`
        <div class="receipt">
            ${S}
            <hr class="div-eq" />
            ${U}
            <hr class="div-eq" />
            ${X}
            ${X?'<hr class="div-eq" />':""}

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="th-name">Item / الصنف</th>
                        <th class="th-qty">Qty</th>
                        <th class="th-price">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${Y}
                    <tr><td colspan="3"><hr class="div-dash" /></td></tr>
                    ${at}
                </tbody>
            </table>

            ${aw}
            ${ay}
            <div style="height: 30px"></div>
        </div>
    `}function q(a){var b,d;let{order:e,settings:f,logoUrl:j,businessName:l,products:o=[],currency:q=f.currency||"USD",storeServiceChargeRate:r=0,storeTaxRate:s=0,customerPhone:t,customerName:u,amountTendered:v,changeAmount:w,targetWindow:x,forceReprint:y}=a,z={reserved:!0,id:y?`${n(e)}:reprint:${Date.now()}`:n(e)};if(!z.reserved){if(x&&!x.closed)try{x.close()}catch{}return}let A={...a,receiptTransactionId:z.id};if(x&&!x.closed)try{x.close()}catch{}let B=Math.max(1,Math.min(f.receiptCopies??1,5)),C=[];for(let a=0;a<B;a++){let b=a===B-1;C.push(p(e,f,j,l,o,q,r,s,t,u,v,w)+(b?"":'<div class="page-break"></div>'))}b=C,d=e,k((0,g.v)(d)??`#${d.orderNumber.slice(-4)}`),b.join("\n"),(async()=>{try{let{printReceiptViaHtml:a}=await c.e(9216).then(c.bind(c,59216));if(!await a(A)){z.id,h.toast.error("Receipt was not printed: no receipt printer is configured.",{duration:6e3});return}await (0,i.iv)({id:z.id,orderId:e.id,publicOrderNumber:m(e),transactionId:z.id,printedAt:Date.now(),status:"printed"}).catch(()=>{})}catch(a){z.id,console.error("printReceipt html path failed:",a),h.toast.error("Receipt could not be sent to the printer. Check the Print queue.",{duration:6e3})}})()}function r(){return null}function s(a){let{order:b,settings:c,logoUrl:d,businessName:e,products:f=[],currency:g=c.currency||"USD",storeServiceChargeRate:h=0,storeTaxRate:i=0,customerPhone:j,customerName:k,amountTendered:l,changeAmount:m}=a,n=Math.max(1,Math.min(c.receiptCopies??1,5)),o=[];for(let a=0;a<n;a++){let q=a===n-1;o.push(p(b,c,d,e,f,g,h,i,j,k,l,m)+(q?"":'<div class="page-break"></div>'))}return o.join("\n")}function t(){return o}}};