/**
 * Bounded history of serialized signals, oldest first. Sequence numbers are contiguous.
 * @param {{ maxItems: number, maxBytes: number }} limits
 */
export function createRing({ maxItems, maxBytes }) {
  /** @type {{ seq: number, text: string, size: number }[]} */
  let items = []
  let head = 0
  let bytes = 0

  /**
   * @param {number} seq
   * @param {string} text
   */
  function push(seq, text) {
    const size = Buffer.byteLength(text)
    items.push({ seq, text, size })
    bytes += size
    // Always keep the newest item, even when it alone is above the byte limit.
    while (items.length - head > 1 && (items.length - head > maxItems || bytes > maxBytes)) {
      bytes -= items[head].size
      head += 1
    }
    if (head >= 1024 && head * 2 >= items.length) {
      items = items.slice(head)
      head = 0
    }
  }

  /** @returns {number | null} */
  function oldestSeq() {
    return items.length > head ? items[head].seq : null
  }

  /**
   * Serialized signals whose seq is greater than `afterSeq`, in order.
   * @param {number} afterSeq
   * @returns {string[]}
   */
  function since(afterSeq) {
    if (items.length === head) return []
    const start = head + Math.max(0, afterSeq + 1 - items[head].seq)
    return items.slice(start).map((item) => item.text)
  }

  return {
    push,
    oldestSeq,
    since,
    get size() {
      return items.length - head
    },
    get bytes() {
      return bytes
    },
  }
}
