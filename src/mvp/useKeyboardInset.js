import { useEffect } from 'react'

// iOS Safari keeps position:fixed elements on the layout viewport, so a
// bottom sheet sits behind the on-screen keyboard. Vaul's own fix for this
// (repositionInputs) overshoots on iPhone and shoves the sheet off the top,
// so it's switched off and this publishes the real visible area instead:
//   --m-kb   how much of the bottom the keyboard covers
//   --m-vvh  height of the visible area above it
// .m-sheet uses both to sit on top of the keyboard and fit what's left.
export default function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const covered = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
        root.style.setProperty('--m-kb', `${Math.round(covered)}px`)
        root.style.setProperty('--m-vvh', `${Math.round(vv.height)}px`)
      })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.removeProperty('--m-kb')
      root.style.removeProperty('--m-vvh')
    }
  }, [])
}
