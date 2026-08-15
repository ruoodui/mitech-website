function filterPhones(){
  const q = document.getElementById('phoneSearch').value.trim().toLowerCase();
  document.querySelectorAll('.phone-card').forEach(card => {
    card.style.display = card.dataset.name.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterPhones(){
  const q=(document.getElementById('phoneSearch').value||'').toLowerCase().trim();
  const brand=document.getElementById('brandFilter').value;
  document.querySelectorAll('#phoneGrid .phone-card').forEach(card=>{
    const name=card.dataset.name.toLowerCase();
    const okName=name.includes(q);
    const okBrand=!brand || card.dataset.brand===brand;
    card.style.display=(okName&&okBrand)?'':'none';
  });
}

function filterPrices(){
  const q=(document.getElementById('priceSearch').value||'').toLowerCase().trim();
  const brand=document.getElementById('priceBrand').value;
  document.querySelectorAll('#priceGrid .price-card').forEach(card=>{
    const okName=card.dataset.name.toLowerCase().includes(q);
    const okBrand=!brand || card.dataset.brand===brand;
    card.style.display=(okName&&okBrand)?'':'none';
  });
}
function sortPrices(){
  const grid=document.getElementById('priceGrid');
  const cards=[...grid.querySelectorAll('.price-card')];
  const mode=document.getElementById('priceSort').value;
  if(mode==='low') cards.sort((a,b)=>Number(a.dataset.price)-Number(b.dataset.price));
  if(mode==='high') cards.sort((a,b)=>Number(b.dataset.price)-Number(a.dataset.price));
  cards.forEach(c=>grid.appendChild(c));
}
