// Draws a shareable rank card (Instagram Story/Post friendly, 1080x1350)
// with plain Canvas 2D, no extra dependency for one image.
export async function generateRankCardBlob({ displayName, rank, points }) {
  // Canvas text silently falls back to a default font if the real one
  // hasn't finished loading yet when fillText runs, so wait for it.
  await Promise.all([
    document.fonts.load('700 340px Oswald'),
    document.fonts.load('600 60px Oswald'),
    document.fonts.load('500 42px Inter'),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, '#0a0e14')
  gradient.addColorStop(1, '#12171f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.textAlign = 'center'

  ctx.fillStyle = '#8b95a3'
  ctx.font = '600 32px Oswald, sans-serif'
  ctx.fillText('CHAMPAGNE FOOTBALL LEMONADE BANTER', canvas.width / 2, 180)

  ctx.fillStyle = '#d4af37'
  ctx.font = '600 40px Oswald, sans-serif'
  ctx.fillText('PREDICTIONS LEADERBOARD', canvas.width / 2, 250)

  ctx.fillStyle = '#2ee6a6'
  ctx.font = '700 340px Oswald, sans-serif'
  ctx.fillText(`#${rank}`, canvas.width / 2, 700)

  ctx.fillStyle = '#eef1f5'
  ctx.font = '600 60px Oswald, sans-serif'
  ctx.fillText(displayName, canvas.width / 2, 820)

  ctx.fillStyle = '#8b95a3'
  ctx.font = '500 42px Inter, sans-serif'
  ctx.fillText(`${points} points`, canvas.width / 2, 890)

  ctx.strokeStyle = '#262f3d'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(240, 1150)
  ctx.lineTo(840, 1150)
  ctx.stroke()

  ctx.fillStyle = '#8b95a3'
  ctx.font = '500 34px Inter, sans-serif'
  ctx.fillText('Think you can beat me? Make your picks:', canvas.width / 2, 1220)

  ctx.fillStyle = '#2ee6a6'
  ctx.font = '600 40px Oswald, sans-serif'
  ctx.fillText('cflb-alpha.vercel.app', canvas.width / 2, 1280)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
