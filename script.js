const rail   = document.getElementById('rail');
const slides = rail.querySelectorAll('.mySlides');
const total  = slides.length;
let   idx    = 0;
let   startX = null;

// Build dots dynamically
const dotsEl = document.getElementById('dots');
slides.forEach((_, i) => {
  const d = document.createElement('span');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', () => goTo(i));
  dotsEl.appendChild(d);
});

function goTo(n) {
  idx = (n + total) % total;
  rail.style.transform = `translateX(-${idx * 100}%)`;
  dotsEl.querySelectorAll('.dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx)
  );
}

document.getElementById('btnPrev').addEventListener('click', () => goTo(idx - 1));
document.getElementById('btnNext').addEventListener('click', () => goTo(idx + 1));

// Keyboard support
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  goTo(idx - 1);
  if (e.key === 'ArrowRight') goTo(idx + 1);
});

// Touch / drag swipe
rail.addEventListener('pointerdown', e => { startX = e.clientX; rail.setPointerCapture(e.pointerId); });
rail.addEventListener('pointerup',   e => {
  if (startX === null) return;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 40) goTo(dx < 0 ? idx + 1 : idx - 1);
  startX = null;
});