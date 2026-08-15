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
