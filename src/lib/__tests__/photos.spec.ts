import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  validateMagicBytes,
  canAddPhoto,
  MAX_PHOTOS,
  uploadName,
  matchUploadedFilenames,
  nextClientId,
} from '../photos'

function headerFile(bytes: number[], name = 'x.bin'): File {
  return new File([new Uint8Array(bytes)], name)
}

describe('validateImageFile', () => {
  it('rejects a text/plain file', () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })
    expect(validateImageFile(file)).toEqual({ ok: false, reason: 'mime' })
  })

  it('rejects an image over 10 MB', () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.jpg', {
      type: 'image/jpeg',
    })
    expect(validateImageFile(file)).toEqual({ ok: false, reason: 'size' })
  })

  it('accepts a jpeg within the limits', () => {
    const file = new File([new Uint8Array([0xff, 0xd8])], 'ok.jpg', {
      type: 'image/jpeg',
    })
    expect(validateImageFile(file)).toEqual({ ok: true })
  })
})

describe('validateMagicBytes', () => {
  it('accepts a real JPEG header', async () => {
    const file = headerFile([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(await validateMagicBytes(file)).toBe(true)
  })

  it('rejects a renamed non-image', async () => {
    const file = new File(['not an image at all'], 'fake.jpg', { type: 'image/jpeg' })
    expect(await validateMagicBytes(file)).toBe(false)
  })
})

describe('photo cap', () => {
  it('rejects the 21st photo and allows the 20th', () => {
    expect(MAX_PHOTOS).toBe(20)
    expect(canAddPhoto(MAX_PHOTOS)).toBe(false)
    expect(canAddPhoto(MAX_PHOTOS - 1)).toBe(true)
  })
})

describe('upload filename mapping', () => {
  it('names uploads deterministically from the client id', () => {
    expect(uploadName('c_7')).toBe('c_7.jpg')
  })

  it('maps server filenames back to client ids by their base', () => {
    const returned = ['c_7_49w3y0vaxd.jpg', 'c_9_abcdef0123.jpg', 'kept_existing.jpg']
    const map = matchUploadedFilenames(returned, ['c_7', 'c_9'])
    expect(map.get('c_7')).toBe('c_7_49w3y0vaxd.jpg')
    expect(map.get('c_9')).toBe('c_9_abcdef0123.jpg')
    expect(map.size).toBe(2)
  })

  it('matches by exact base, not by a shared short prefix', () => {
    // A stale filename whose base is a short prefix of a real token must not be
    // matched to that token.
    const returned = ['p0000000003_gg55hh66ii.jpg', 'tok1_aaaaaaaaaa.jpg']
    const map = matchUploadedFilenames(returned, ['tok1'])
    expect(map.get('tok1')).toBe('tok1_aaaaaaaaaa.jpg')
    expect(map.size).toBe(1)
  })
})

describe('nextClientId', () => {
  it('produces unique tokens that never collide with stale counter-based filenames', () => {
    // Simulates a second session: the old ids were a resettable counter, so a
    // fresh session could recycle a base that a persisted filename still used.
    const staleBases = ['p0000000001', 'p0000000002', 'p0000000003']
    const seen = new Set<string>()
    for (let i = 0; i < 50; i += 1) {
      const token = nextClientId()
      seen.add(token)
      expect(staleBases).not.toContain(token)
    }
    expect(seen.size).toBe(50)
  })
})
