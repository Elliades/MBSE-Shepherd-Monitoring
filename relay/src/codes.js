import { randomInt } from 'node:crypto'

export const GENERATED_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const CODE_LENGTH = 6

/**
 * Accepts any 6 letters, in any case, with spaces or dashes ("kqx-hdm").
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeCode(raw) {
  if (typeof raw !== 'string') return null
  const code = raw.replace(/[\s-]/g, '').toUpperCase()
  return /^[A-Z]{6}$/.test(code) ? code : null
}

/**
 * @param {(code: string) => boolean} isTaken
 * @param {(max: number) => number} [pick]
 * @returns {string}
 */
export function generateCode(isTaken, pick = randomInt) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += GENERATED_ALPHABET[pick(GENERATED_ALPHABET.length)]
    }
    if (!isTaken(code)) return code
  }
  throw new Error('No free pairing code')
}
