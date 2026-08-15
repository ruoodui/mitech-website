function norm(v){return String(v??'').toLowerCase().trim();}
function filterPrices(){
  const q=norm(document.getElementById('priceSearch')?.value);
  const b=document.getElementById('priceBrand')?.value||'';
  document.querySelectorAll('#priceGrid .price-card').forEach(c=>{
    const ok=(!q||norm(c.dataset.name).includes(q)||norm(c.dataset.brand).includes(q))&&(!b||c.dataset.brand===b);
    c.style.display=ok?'':'none';
  });
}
function sortPrices(){
  const grid=document.getElementById('priceGrid');
  const cards=[...grid.querySelectorAll('.price-card')];
  const mode=document.getElementById('priceSort')?.value||'default';
  cards.sort((a,b)=>{
    const av=a.dataset.price===''?Infinity:Number(a.dataset.price);
    const bv=b.dataset.price===''?Infinity:Number(b.dataset.price);
    if(mode==='low') return av-bv;
    if(mode==='high') return bv-av;
    return 0;
  });
  cards.forEach(c=>grid.appendChild(c));
}
function filterPhones(){
  const q=norm(document.getElementById('phoneSearch')?.value);
  const b=document.getElementById('brandFilter')?.value||'';
  const cards=document.querySelectorAll('#phoneGrid .phone-card');
  cards.forEach(c=>{
    const text=norm(c.dataset.name+' '+c.dataset.brand);
    c.style.display=(!q||text.includes(q))&&(!b||c.dataset.brand===b)?'':'none';
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  const count=document.querySelectorAll('#priceGrid .price-card').length;
  const pc=document.getElementById('priceCount'); if(pc) pc.textContent=count;
});
