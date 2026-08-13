// Renders a branded, shareable image of a user's The Eight picks — dark
// background, gold accents, sized for Instagram Stories (1080x1920).
const WIDTH = 1080
const HEIGHT = 1920

export async function buildShareImageBlob(fixtures, picks) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0b0d10'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = '#2ee6a6'
  ctx.font = '700 34px Archivo Narrow, sans-serif'
  ctx.fillText('CHAMPAGNE FOOTBALL', 64, 120)

  ctx.fillStyle = '#ffc233'
  ctx.font = '700 92px Archivo Narrow, sans-serif'
  ctx.fillText('THE EIGHT', 64, 220)

  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(64, 260)
  ctx.lineTo(WIDTH - 64, 260)
  ctx.stroke()

  const rowHeight = (HEIGHT - 420) / fixtures.length
  let y = 330

  ctx.textBaseline = 'middle'
  for (const fixture of fixtures) {
    const pick = picks[fixture.id]
    const home = pick?.home ?? 0
    const away = pick?.away ?? 0

    ctx.fillStyle = '#7d8a8f'
    ctx.font = '700 22px Archivo Narrow, sans-serif'
    ctx.fillText(fixture.competition.toUpperCase(), 64, y)

    ctx.fillStyle = '#f4f4f2'
    ctx.font = '600 34px Archivo Narrow, sans-serif'
    wrapText(ctx, `${fixture.home_team}`, 64, y + 42, WIDTH - 260)
    wrapText(ctx, `${fixture.away_team}`, 64, y + 84, WIDTH - 260)

    ctx.fillStyle = '#ffc233'
    ctx.font = '400 48px Anton, Archivo Narrow, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${home} - ${away}`, WIDTH - 64, y + 60)
    ctx.textAlign = 'left'

    y += rowHeight
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(64, y - rowHeight * 0.15)
    ctx.lineTo(WIDTH - 64, y - rowHeight * 0.15)
    ctx.stroke()
  }

  ctx.fillStyle = '#7d8a8f'
  ctx.font = '600 26px Archivo Narrow, sans-serif'
  ctx.fillText('champagnefootball.app · Predict. Banter. Repeat.', 64, HEIGHT - 64)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function wrapText(ctx, text, x, y, maxWidth) {
  let displayText = text
  while (ctx.measureText(displayText).width > maxWidth && displayText.length > 3) {
    displayText = displayText.slice(0, -1)
  }
  if (displayText !== text) displayText = displayText.slice(0, -1) + '…'
  ctx.fillText(displayText, x, y)
}
