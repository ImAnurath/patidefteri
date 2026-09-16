import type { ATTACHMENT_KINDS } from '@/db/schema/enums';
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const ALLOWED: Record<AttachmentKind, readonly string[]> = {
  receipt: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  invoice: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf'],
};

export function validateUpload(file: { type: string; size: number; name: string }, kind: AttachmentKind): { ok: true; ext: string } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: 'Dosya boş.' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'Dosya 10 MB sınırını aşıyor.' };
  if (!ALLOWED[kind].includes(file.type)) return { ok: false, error: `Bu dosya türü (${file.type}) kabul edilmiyor.` };
  return { ok: true, ext: EXT[file.type]! };
}

const PDF_SIG = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];
const RIFF_SIG = [0x52, 0x49, 0x46, 0x46]; // RIFF
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50]; // WEBP, at offset 8

function startsWith(bytes: Uint8Array, sig: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((byte, i) => bytes[offset + i] === byte);
}

/** Recognises exactly the allowlisted types by their magic bytes; null means the content is something else. */
export function sniffMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, PDF_SIG)) return 'application/pdf';
  if (startsWith(bytes, PNG_SIG)) return 'image/png';
  if (startsWith(bytes, JPEG_SIG)) return 'image/jpeg';
  if (startsWith(bytes, RIFF_SIG) && startsWith(bytes, WEBP_SIG, 8)) return 'image/webp';
  return null;
}
