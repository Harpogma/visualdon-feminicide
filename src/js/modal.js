/**
 * modal.js
 * Modale des sources bibliographiques
 */

import { SOURCES_MAP } from './data.js'

export function initModal() {
  const modal    = document.getElementById('sources-modal')
  const closeBtn = document.getElementById('modal-close')
  const body     = document.getElementById('modal-body')

  if (!modal || !closeBtn || !body) return

  /* ── Ouverture via boutons "● Sources" ── */
  document.querySelectorAll('.sources-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key  = btn.dataset.screen
      const srcs = SOURCES_MAP[key] ?? []

      body.innerHTML = srcs.length
        ? srcs.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join('')
        : '<p style="opacity:.4;font-size:12px">Voir stopfemizid.ch et bfs.admin.ch</p>'

      modal.classList.remove('hidden')
    })
  })

  /* ── Fermeture ── */
  const close = () => modal.classList.add('hidden')

  closeBtn.addEventListener('click', close)
  modal.addEventListener('click', e => { if (e.target === modal) close() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close() })
}
