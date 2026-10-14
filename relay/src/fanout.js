const OPEN = 1

/**
 * Sends `text` to every open viewer. A viewer whose send buffer is above `slowBytes` is not fed
 * any more and is handed to `onSlow` (which may remove it from the set while we iterate).
 * @param {Iterable<{ readyState: number, bufferedAmount: number, send: (text: string) => void }>} viewers
 * @param {string} text
 * @param {number} slowBytes
 * @param {(viewer: any) => void} onSlow
 */
export function broadcast(viewers, text, slowBytes, onSlow) {
  for (const viewer of viewers) {
    if (viewer.readyState !== OPEN) continue
    if (viewer.bufferedAmount > slowBytes) {
      onSlow(viewer)
      continue
    }
    viewer.send(text)
  }
}
