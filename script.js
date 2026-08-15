let products = [];
let currentSort = 'default';

function formatPrice(price){
  if (price === null || price === undefined || price === '' || Number.isNaN(Number(price))) return 'السعر غير متوفر';
  return new Intl.NumberFormat('en-US').format(Number(price)) + ' د.ع';
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));
}

function brandIconClass(brand){
  if(brand === 'Apple') return 'apple-icon';
  if(brand === 'Samsung') return 'samsung-icon';
  if(brand === 'Xiaomi') return 'xiaomi-icon';
  return '';
}

function setCount(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function renderPhones(){
  const grid = document.getElementById('phoneGrid');
  const q = (document.getElementById('phoneSearch')?.value || '').trim().toLowerCase();
  const brand = document.getElementById('brandFilter')?.value || '';
  const unique = new Map();

  products.forEach(p => {
    const key = `${p.name}|||${p.ram_storage || ''}`;
    if(!unique.has(key)) unique.set(key,p);
  });

  const list = [...unique.values()].filter(p => {
    const text = `${p.name} ${p.brand} ${p.ram_storage || ''}`.toLowerCase();
    return (!q || text.includes(q)) && (!brand || p.brand === brand);
  });

  setCount('phoneCount', list.length);

  grid.innerHTML = list.slice(0, 12).map(p => `
    <article class="phone-card">
      <div class="phone-icon ${brandIconClass(p.brand)}">${p.brand === 'Apple' ? '' : escapeHtml((p.name || '').split(' ').slice(-2).join(' '))}</div>
      <div class="phone-info">
        <span>${escapeHtml(p.brand)}</span>
        <h3 dir="ltr">${escapeHtml(p.name)}</h3>
        <p dir="ltr">${escapeHtml(p.ram_storage || 'المواصفات غير متوفرة')}</p>
        <strong>${formatPrice(p.price)}</strong>
      </div>
    </article>
  `).join('') || '<div class="empty-state">ماكو نتائج مطابقة.</div>';
}

function renderPrices(){
  const grid = document.getElementById('priceGrid');
  const q = (document.getElementById('priceSearch')?.value || '').trim().toLowerCase();
  const brand = document.getElementById('priceBrand')?.value || '';

  let list = products.filter(p => {
    const text = `${p.name} ${p.brand} ${p.ram_storage || ''}`.toLowerCase();
    return (!q || text.includes(q)) && (!brand || p.brand === brand);
  });

  if(currentSort === 'low') list.sort((a,b)=>(a.price ?? Infinity)-(b.price ?? Infinity));
  if(currentSort === 'high') list.sort((a,b)=>(b.price ?? -1)-(a.price ?? -1));

  setCount('priceCount', list.length);

  grid.innerHTML = list.map(p => `
    <article class="price-card" data-brand="${escapeHtml(p.brand)}" data-price="${p.price ?? 0}">
      <div class="price-top">
        <span class="brand-tag">${escapeHtml(p.brand)}</span>
        <span class="status">${p.price == null ? 'غير متوفر' : 'متوفر'}</span>
      </div>
      <h3 dir="ltr">${escapeHtml(p.name)}</h3>
      <p dir="ltr">${escapeHtml(p.ram_storage || 'المواصفات غير متوفرة')}</p>
      <div class="price-value">${formatPrice(p.price)}</div>
      <small>${p.store ? escapeHtml(p.store) : 'MiTech Price Database'}</small>
    </article>
  `).join('') || '<div class="empty-state">ماكو نتائج مطابقة.</div>';
}

function fillBrands(){
  const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
  ['brandFilter','priceBrand'].forEach(id=>{
    const select=document.getElementById(id);
    if(!select) return;
    brands.forEach(b=>{
      if([...select.options].some(o=>o.value===b)) return;
      const option=document.createElement('option');
      option.value=b;
      option.textContent=b;
      select.appendChild(option);
    });
  });
}

function filterPhones(){ renderPhones(); }
function filterPrices(){ renderPrices(); }
function sortPrices(){
  currentSort = document.getElementById('priceSort')?.value || 'default';
  renderPrices();
}

async function loadPrices(){
  try{
    const res = await fetch('prices.json', {cache:'no-store'});
    if(!res.ok) throw new Error('prices.json not found');
    products = await res.json();
    fillBrands();
    renderPhones();
    renderPrices();
  }catch(err){
    const msg='<div class="empty-state">تعذر تحميل الأسعار. تأكد من رفع prices.json مع index.html.</div>';
    document.getElementById('phoneGrid').innerHTML=msg;
    document.getElementById('priceGrid').innerHTML=msg;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadPrices);
