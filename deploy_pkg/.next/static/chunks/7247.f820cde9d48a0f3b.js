"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[7247],{85616:(e,t,r)=>{r.d(t,{F:()=>a,O:()=>o});var n=r(80842);let i="cashier:receiptPrinter:v1";function a(){try{let e=window.localStorage.getItem(i);if(!e)return null;let t=JSON.parse(e);if("number"!=typeof t.printerType)return null;return t}catch{return null}}async function o(){try{let e=await n.api.get("/printing/me/receipt-printer-config");e.data&&"number"==typeof e.data.printerType&&function(e){try{if(null===e)return void window.localStorage.removeItem(i);window.localStorage.setItem(i,JSON.stringify(e))}catch{}}(e.data)}catch{}}},97247:(e,t,r)=>{r.d(t,{printReceiptViaHtml:()=>s});var n=r(80842),i=r(40154),a=r(42630),o=r(26350),l=r(59564),c=r(85616),p=r(82402);async function d(e){let t=(0,c.F)();if(!t)return console.warn("[localPrint] no cached receipt printer; offline print skipped"),!1;let r={htmlContent:e,printerType:t.printerType,windowsPrinterName:t.windowsPrinterName??null,ipAddress:t.ipAddress??null,port:t.port??9100,copies:t.copies??1};try{let e=await fetch(`${void 0!==p&&p.env?.NEXT_PUBLIC_LOCAL_AGENT_URL?p.env.NEXT_PUBLIC_LOCAL_AGENT_URL:"http://127.0.0.1:5005"}/local/print/receipt-html`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r),mode:"cors"});if(!e.ok)return console.warn("[localPrint] non-OK response",e.status),!1;let t=await e.json();if(!t.success)return console.warn("[localPrint] agent reported failure",t.error),!1;return!0}catch(e){return console.warn("[localPrint] fetch failed",e),!1}}async function s(e){let t,r,c=(t=(0,i.buildReceiptBodyHtml)(e),r=(0,i.getReceiptCss)(),`<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8' />
  <style>
    ${r}
    html, body { margin: 0; padding: 0; width: 80mm; background: #fff; }
    @page { size: 80mm auto; margin: 0; }
  </style>
</head>
<body dir='ltr'>
  ${t}
</body>
</html>`),p=(0,a.bt)(),s=!(0,l.d2)(e.order.id);if("online"===p&&s)try{let t=e.receiptTransactionId??`receipt:${e.order.id}`,r=await n.api.post(`/printing/orders/${e.order.id}/receipt-html`,{htmlContent:c},{headers:(0,o.U)(t)});if(r.data?.enqueued===!0)return!0}catch{}return await d(c)}}}]);