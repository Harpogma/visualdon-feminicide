/**
 * main.js — point d'entrée Vite
 * Orchestre l'initialisation de tous les modules
 */

import '../css/main.css'

import { initHome }       from './home.js'
import { initTimeline }   from './timeline.js'
import { initModal }      from './modal.js'
import { initAllViz }     from './visualizations.js'

window.addEventListener('DOMContentLoaded', () => {
  initHome()
  initTimeline()
  initModal()

  // Les viz D3 ont besoin que le layout GSAP soit posé
  setTimeout(initAllViz, 200)
})
