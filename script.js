function filterPhones(){
  const q=(document.getElementById('search').value||'').toLowerCase().trim();
  const brand=document.getElementById('brand').value;
  document.querySelectorAll('.phone-card').forEach(c=>{
    const okName=c.dataset.name.toLowerCase().includes(q);
    const okBrand=!brand||c.dataset.brand===brand;
    c.style.display=(okName&&okBrand)?'':'none';
  });
}