/**
 * timeline.js
 * Scrollytelling horizontal avec GSAP ScrollTrigger
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { startJourJAnim, playFlowerAnim, playHomicideGrid, playAdolescenceMap, manageLottieWalker, cleanupFlowerPoem } from './visualizations.js'

gsap.registerPlugin(ScrollTrigger)

export function initTimeline() {
  const wrapper = document.getElementById('timeline-wrapper')
  const track   = document.getElementById('timeline-track')
  const screens = document.querySelectorAll('.timeline-screen')
  const N = screens.length
  const dotContainer = document.getElementById('timeline-progress')

  /* ── Création des points de progression ── */
  for (let i = 0; i < N; i++) {
    const dot = document.createElement('div')
    dot.className = 'progress-dot' + (i === N - 1 ? ' active' : '')
    dot.addEventListener('click', () => {
      const progress = 1 - (i / (N - 1))
      const sts = ScrollTrigger.getAll()
      const st  = sts.find(t => t.vars && t.vars.trigger === wrapper)
      if (st) {
        window.scrollTo({ top: st.start + progress * (st.end - st.start), behavior: 'smooth' })
      }
    })
    dotContainer.appendChild(dot)
  }

  /* ── Visibilité des dots ── */
  ScrollTrigger.create({
    trigger: '#page-timeline',
    start: 'top 85%',
    end: 'bottom 15%',
    onEnter:     () => dotContainer.classList.add('visible'),
    onLeave:     () => dotContainer.classList.remove('visible'),
    onEnterBack: () => dotContainer.classList.add('visible'),
    onLeaveBack: () => dotContainer.classList.remove('visible'),
  })

  /* Index de l'écran JJ - La mort */
  const jourJIdx = Array.from(screens).findIndex(s => s.querySelector('#viz-jour-j'))
  /* Index de l'écran J — 3 semaines — fleur + pétales */
  const j3sIdx   = Array.from(screens).findIndex(s => s.id === 'screen-j3s')
  /* Index de l'écran J-1 an - Floraison */
  const j1aIdx   = Array.from(screens).findIndex(s => s.id === 'screen-j1a')
  /* Index de l'écran J-2 ans - Homme marchant (Lottie) */
  const j2aIdx   = Array.from(screens).findIndex(s => s.id === 'screen-j2a')
  /* Index de l'écran J-15 ans - Grille → Fleurs */
  const j15aIdx  = Array.from(screens).findIndex(s => s.id === 'screen-j15a')
  /* Index de l'écran J+46 ans - Carte Suisse */
  const j46aIdx  = Array.from(screens).findIndex(s => s.id === 'screen-j46a')

  /* Dernier idx connu — détecte les transitions de slide */
  let _prevIdx = -1

  /* ── Scroll horizontal pinné ── */
  gsap.fromTo(track,
    { x: () => -(track.scrollWidth - window.innerWidth) },
    { x: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: () => `+=${track.scrollWidth - window.innerWidth}`,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const idx = Math.round((1 - self.progress) * (N - 1))

        /* Dots actifs */
        document.querySelectorAll('.progress-dot').forEach((d, i) =>
          d.classList.toggle('active', i === idx)
        )

        /* Classes in-view pour animations CSS */
        screens.forEach((s, i) => {
          if (i === idx) {
            s.classList.add('in-view')
          } else if (Math.abs(i - idx) > 1) {
            s.classList.remove('in-view')
          }
        })

        /* Démarre l'animation des mois quand l'écran JJ entre en vue */
        if (idx === jourJIdx) startJourJAnim()
        /* Lance la floraison quand l'écran J-1 an entre en vue */
        if (idx === j1aIdx)   playFlowerAnim()
        /* Lance la grille animée quand l'écran J-15 ans entre en vue */
        if (idx === j15aIdx)  playHomicideGrid()
        /* Lance la carte de pousses quand l'écran J+46 ans entre en vue */
        if (idx === j46aIdx)  playAdolescenceMap()

        /* Efface les pétales tombés quand on quitte screen-j3s */
        if (j3sIdx >= 0 && idx !== _prevIdx && _prevIdx === j3sIdx) {
          cleanupFlowerPoem()
        }

        /* Play/pause Lottie sur entrée et sortie de screen-j2a */
        if (j2aIdx >= 0 && idx !== _prevIdx) {
          if (idx === j2aIdx || _prevIdx === j2aIdx) {
            manageLottieWalker(idx === j2aIdx)
          }
        }
        _prevIdx = idx
      },
    },
  })

  window.addEventListener('resize', () => ScrollTrigger.refresh())
}
