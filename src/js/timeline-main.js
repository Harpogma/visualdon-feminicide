import '../css/main.css'

import { initTimeline } from './timeline.js'
import { initModal }    from './modal.js'
import { initAllViz }   from './visualizations.js'

window.addEventListener('DOMContentLoaded', () => {
  initTimeline()
  initModal()
  setTimeout(initAllViz, 200)
})
