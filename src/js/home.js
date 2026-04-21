/**
 * home.js
 * Animations et interactions de la page d'accueil
 */

export function initHome() {
  /* ── Reveal au scroll (IntersectionObserver) ── */
  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0)'
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.home-section, .home-cta').forEach(s => {
    s.style.opacity = '0'
    s.style.transform = 'translateY(26px)'
    s.style.transition = 'opacity .85s ease, transform .85s ease'
    obs.observe(s)
  })

  /* ── Fondu du scroll hint ── */
  window.addEventListener('scroll', () => {
    const hint = document.querySelector('.scroll-hint')
    if (hint) hint.style.opacity = String(Math.max(0, 0.38 - window.scrollY / 170))
  })
}
