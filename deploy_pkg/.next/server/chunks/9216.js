"use strict";exports.id=9216,exports.ids=[9216],exports.modules={59216:(a,b,c)=>{c.d(b,{printReceiptViaHtml:()=>k});var d=c(56089),e=c(90767),f=c(13139),g=c(11219),h=c(68381),i=c(61881);async function j(a){let b=(0,i.F)();if(!b)return console.warn("[localPrint] no cached receipt printer; offline print skipped"),!1;let c={htmlContent:a,printerType:b.printerType,windowsPrinterName:b.windowsPrinterName??null,ipAddress:b.ipAddress??null,port:b.port??9100,copies:b.copies??1};try{let a=await fetch(`${"u">typeof process&&process.env?.NEXT_PUBLIC_LOCAL_AGENT_URL?process.env.NEXT_PUBLIC_LOCAL_AGENT_URL:"http://127.0.0.1:5005"}/local/print/receipt-html`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c),mode:"cors"});if(!a.ok)return console.warn("[localPrint] non-OK response",a.status),!1;let b=await a.json();if(!b.success)return console.warn("[localPrint] agent reported failure",b.error),!1;return!0}catch(a){return console.warn("[localPrint] fetch failed",a),!1}}async function k(a){let b,c,i=(b=(0,e.buildReceiptBodyHtml)(a),c=(0,e.getReceiptCss)(),`<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8' />
  <style>
    ${c}
    html, body { margin: 0; padding: 0; width: 80mm; background: #fff; }
    @page { size: 80mm auto; margin: 0; }
  </style>
</head>
<body dir='ltr'>
  ${b}
</body>
</html>`),k=(0,f.bt)(),l=!(0,h.d2)(a.order.id);if("online"===k&&l)try{let b=a.receiptTransactionId??`receipt:${a.order.id}`,c=await d.api.post(`/printing/orders/${a.order.id}/receipt-html`,{htmlContent:i},{headers:(0,g.U)(b)});if(c.data?.enqueued===!0)return!0}catch{}return await j(i)}},61881:(a,b,c)=>{c.d(b,{F:()=>e,O:()=>f});var d=c(56089);function e(){return null}async function f(){try{let a=await d.api.get("/printing/me/receipt-printer-config");a.data&&"number"==typeof a.data.printerType&&a.data}catch{}}}};