function filterPhones(){
  const q = document.getElementById('phoneSearch').value.trim().toLowerCase();
  document.querySelectorAll('.phone-card').forEach(card => {
    card.style.display = card.dataset.name.toLowerCase().includes(q) ? '' : 'none';
  });
}
