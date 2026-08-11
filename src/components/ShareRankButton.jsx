import { useState } from 'react'
import { generateRankCardBlob } from '../lib/shareRankCard'

export default function ShareRankButton({ displayName, rank, points }) {
  const [busy, setBusy] = useState(false)

  async function handleShare() {
    setBusy(true)
    try {
      const blob = await generateRankCardBlob({ displayName, rank, points })
      const file = new File([blob], 'cflb-rank.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My CFLB Predictions Rank',
          text: `I'm #${rank} on the CFLB Predictions leaderboard.`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'cflb-rank.png'
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') window.alert('Could not generate the share image, try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="button button--small button--secondary" onClick={handleShare} disabled={busy}>
      {busy ? 'Generating...' : 'Share your rank'}
    </button>
  )
}
