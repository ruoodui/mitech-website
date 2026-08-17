export default {async fetch(request,env){const url=new URL(request.url);
if(url.pathname==="/api/update-prices"){if(request.method!=="POST")return j({error:"Method not allowed"},405);
if(request.headers.get("X-Admin-Key")!==env.ADMIN_KEY)return j({error:"رمز الإدارة غير صحيح"},401);
let p;try{p=await request.json()}catch{return j({error:"بيانات غير صالحة"},400)}
if(!Array.isArray(p.phones)||!p.phones.length)return j({error:"لا توجد أجهزة"},400);
const phones=p.phones.map(x=>({name:String(x.name??"").trim(),ram:String(x.ram??"").trim(),price:x.price??"",brand:String(x.brand??"").trim(),store:String(x.store??"").trim(),address:String(x.address??"").trim()})).filter(x=>x.name);
const repo="ruoodui/mitech-website",path="prices.json",branch="main";
const api=`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
const h={"Authorization":`Bearer ${env.GITHUB_TOKEN}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"MiTech-Price-Admin"};
const g=await fetch(api,{headers:h});if(!g.ok)return j({error:"تعذر قراءة prices.json من GitHub"},502);const cur=await g.json();
let old=null;try{old=JSON.parse(decodeURIComponent(escape(atob(cur.content.replace(/\n/g,"")))))}catch{}
let out=Array.isArray(old)?phones:{...(old&&typeof old==="object"?old:{}),phones,updatedAt:p.updatedAt||new Date().toISOString().slice(0,10)};
const content=btoa(unescape(encodeURIComponent(JSON.stringify(out,null,2))));
const put=await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{method:"PUT",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify({message:`Update phone prices - ${p.updatedAt||"today"}`,content,sha:cur.sha,branch})});
if(!put.ok)return j({error:"GitHub رفض تحديث الأسعار"},502);
return j({ok:true,count:phones.length,updatedAt:p.updatedAt})}
return env.ASSETS.fetch(request)}};function j(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json;charset=utf-8"}})}