/* The promo sheep on the article pages. One crosses the bottom once, as the page opens.
   The others sit still in the margin. At the end of the article, one walks in and stays.
   Nothing moves during the reading. */
(function () {
  'use strict';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const passer = document.querySelector('.passer');
  if (passer) {
    if (reduced) passer.remove();
    else {
      const img = passer.querySelector('img');
      img.addEventListener('animationend', (e) => { if (e.animationName === 'passer') passer.remove(); });
    }
  }

  const pasture = document.querySelector('.pasture');
  if (!pasture || reduced || !('IntersectionObserver' in window)) return;
  pasture.classList.add('arm');
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    pasture.classList.add('play');
    io.disconnect();
  }, { threshold: 0.85 });
  io.observe(pasture);
}());
