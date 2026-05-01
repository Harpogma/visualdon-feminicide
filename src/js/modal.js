/**
 * modal.js
 * Sources popup — déclenché au hover, animé via GSAP autoAlpha
 */

import { gsap } from 'gsap'
import { SOURCES_MAP } from './data.js'

export function initModal() {
  const modal    = document.getElementById('sources-modal')
  const closeBtn = document.getElementById('modal-close')
  const body     = document.getElementById('modal-body')

  if (!modal || !closeBtn || !body) return

  /* ── État initial géré par GSAP (retire la classe hidden éventuelle) ──
     xPercent: -50 remplace le transform: translateX(-50%) CSS pour éviter
     tout conflit quand GSAP écrit la propriété transform.               */
  modal.classList.remove('hidden')
  gsap.set(modal, { autoAlpha: 0, y: 14, xPercent: -50 })

  let closeTimer = null

  /* ── Contenu dynamique ── */
  function populate(key) {
    const srcs = SOURCES_MAP[key] ?? []
    body.innerHTML = srcs.length
      ? srcs.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join('')
      : '<p style="opacity:.4;font-size:12px">Voir stopfemizid.ch et bfs.admin.ch</p>'
  }

  /* ── Ouverture ── */
  function open(btn) {
    clearTimeout(closeTimer)
    populate(btn.dataset.screen)
    modal.style.pointerEvents = 'auto'
    gsap.to(modal, {
      autoAlpha: 1,
      y: 0,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  /* ── Fermeture avec délai (laisse le temps de glisser vers la modale) ── */
  function scheduleClose() {
    closeTimer = setTimeout(close, 160)
  }

  function close() {
    clearTimeout(closeTimer)
    gsap.to(modal, {
      autoAlpha: 0,
      y: 14,
      duration: 0.2,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => { modal.style.pointerEvents = 'none' },
    })
  }

  /* ── Boutons sources : hover ── */
  document.querySelectorAll('.sources-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => open(btn))
    btn.addEventListener('mouseleave', scheduleClose)
  })

  /* ── Modale : annule la fermeture si la souris y entre ── */
  modal.addEventListener('mouseenter', () => clearTimeout(closeTimer))
  modal.addEventListener('mouseleave', scheduleClose)

  /* ── Fermetures de secours (bouton × et Escape) ── */
  closeBtn.addEventListener('click', close)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close() })
}
