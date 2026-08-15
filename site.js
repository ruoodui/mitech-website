
function norm(v){return String(v??"").toLowerCase().trim();}
function filterPrices(){
 const q=norm(document.getElementById("priceSearch")?.value);
 const b=document.getElementById("priceBrand")?.value||"";
 document.querySelectorAll("#priceGrid .price-item").forEach(c=>{
   const t=norm((c.dataset.name||"")+" "+(c.dataset.brand||""));
   c.classList.toggle("is-hidden", !((!q||t.includes(q))&&(!b||c.dataset.brand===b)));
 });
}
function sortPrices(){
 const g=document.getElementById("priceGrid"); if(!g)return;
 const m=document.getElementById("priceSort")?.value||"default";
 const a=[...g.querySelectorAll(".price-item")];
 if(m==="default")return;
 a.sort((x,y)=>{
   const xv=x.dataset.price===""?Infinity:Number(x.dataset.price);
   const yv=y.dataset.price===""?Infinity:Number(y.dataset.price);
   return m==="low"?xv-yv:yv-xv;
 });
 a.forEach(x=>g.appendChild(x));
}
document.addEventListener("DOMContentLoaded",()=>filterPrices());
