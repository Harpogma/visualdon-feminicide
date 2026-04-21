/**
 * flower.js
 * Helpers D3 pour dessiner des fleurs et cercles dans des SVG
 */

/**
 * Génère un chemin SVG de fleur
 * @param {number} cx - centre X
 * @param {number} cy - centre Y
 * @param {number} r  - rayon (de centre au bout des pétales)
 * @param {number} petals - nombre de pétales (défaut 8)
 * @returns {string} path d attribute
 */
export function flowerPath(cx, cy, r, petals = 8) {
  let d = ''
  for (let i = 0; i < petals; i++) {
    const a0 = (i / petals) * Math.PI * 2
    const a1 = ((i + 1) / petals) * Math.PI * 2
    const am = (a0 + a1) / 2
    const x0  = cx + Math.cos(a0) * r * 0.26
    const y0  = cy + Math.sin(a0) * r * 0.26
    const cp1x = cx + Math.cos(am - 0.32) * r * 1.2
    const cp1y = cy + Math.sin(am - 0.32) * r * 1.2
    const cp2x = cx + Math.cos(am + 0.32) * r * 1.2
    const cp2y = cy + Math.sin(am + 0.32) * r * 1.2
    const x1  = cx + Math.cos(a1) * r * 0.26
    const y1  = cy + Math.sin(a1) * r * 0.26
    d += (i === 0 ? `M${x0},${y0}` : '') + ` C${cp1x},${cp1y},${cp2x},${cp2y},${x1},${y1}`
  }
  return d + 'Z'
}

/**
 * Appende une fleur à un parent D3 selection
 */
export function drawFlower(parent, cx, cy, r, fill = '#F29CB7', opacity = 1, petals = 8) {
  parent.append('path')
    .attr('d', flowerPath(cx, cy, r, petals))
    .attr('fill', fill)
    .attr('opacity', opacity)
}

/**
 * Appende un cercle à un parent D3 selection
 */
export function drawCircle(parent, cx, cy, r, fill = '#F29CB7', opacity = 0.26) {
  parent.append('circle')
    .attr('cx', cx).attr('cy', cy).attr('r', r)
    .attr('fill', fill).attr('opacity', opacity)
}
