import { useEffect, useState } from 'react'

// Shared by PredictionsDashboard's full countdown card and Home's compact
// teaser — both need the same "time until lockTime" ticking label.
export default function useCountdown(lockTime) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!lockTime) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [lockTime])

  if (!lockTime) return { locked: true, label: '' }

  const diffMs = lockTime - now
  if (diffMs <= 0) return { locked: true, label: '' }

  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  let label
  if (days > 0) label = `${days}d ${hours}h`
  else if (hours > 0) label = `${hours}h ${minutes}m`
  else label = `${minutes}m`

  return { locked: false, label, diffMs }
}
