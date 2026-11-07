// Photo validation, compression and upload bookkeeping. Framework-free: no Vue
// imports, no PocketBase SDK. Only browser APIs (FileReader, Image, canvas) are
// used, and only inside the functions that document them.

export const MAX_PHOTOS = 20
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type PhotoValidation = { ok: true } | { ok: false; reason: 'mime' | 'size' }

// MIME whitelist plus the 10 MB limit, returning a result the caller can show.
export function validateImageFile(file: File): PhotoValidation {
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'mime' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: 'size' }
  }
  return { ok: true }
}

// True while `totalCount` photos are still under the shared per-inspection cap.
export function canAddPhoto(totalCount: number): boolean {
  return totalCount < MAX_PHOTOS
}

// Reads the first bytes and sniffs the real image signature so a renamed
// non-image is rejected before upload, even when its MIME lies.
export function validateMagicBytes(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer)
      const isJpeg = arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff
      const isPng =
        arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47
      const isWebp = arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50
      // HEIC/HEIF carry an 'ftyp' box at offset 4.
      const isHeif = arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70
      resolve(isJpeg || isPng || isWebp || isHeif)
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}

// Re-encodes to JPEG with a longest edge of 600px and quality 0.55, returning
// a Blob (never a base64 string) for upload. Rejects when the browser cannot
// decode the source (e.g. HEIC the current browser cannot render).
export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('unsupported image'))
      img.onload = () => {
        const MAX = 600
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > MAX) {
            h = Math.round((h * MAX) / w)
            w = MAX
          }
        } else if (h > MAX) {
          w = Math.round((w * MAX) / h)
          h = MAX
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas'))
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55)
        const [header, body] = dataUrl.split(',')
        const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
        const bin = atob(body)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
        resolve(new Blob([bytes], { type: mime }))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// A photo as tracked by the form before save: exactly one of `file` (pending
// upload) or `filename` (already persisted) is set, plus a stable client id.
export interface PhotoDraft {
  clientId: string
  file?: File
  filename?: string
}

// Monotonic id for draft photos. Fixed width keeps the ids the same length, so
// no id is a prefix of another: PocketBase appends a random suffix to the base
// name, and matching is done on `id + '_'` (see matchUploadedFilenames). Names
// shorter than 3 chars get an extra random prefix from the server, so the base
// must stay >= 3 chars.
let clientSeq = 0
export function nextClientId(): string {
  clientSeq += 1
  return `p${String(clientSeq).padStart(10, '0')}`
}

// The deterministic upload name for a pending photo. PocketBase keeps the base
// name and appends a random suffix, so this prefix lets the save path map the
// server filename back to its owner without trusting upload order.
export function uploadName(clientId: string): string {
  return `${clientId}.jpg`
}

// Matches server-returned filenames to pending client ids by their deterministic
// prefix (`clientId + '_'`). Existing filenames are left out of the result.
export function matchUploadedFilenames(
  returned: string[],
  clientIds: string[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const id of clientIds) {
    const found = returned.find((name) => name.startsWith(`${id}_`))
    if (found) map.set(id, found)
  }
  return map
}
