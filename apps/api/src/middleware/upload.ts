import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(ApiError.badRequest('Only JPEG, PNG, WebP or AVIF images are allowed'));
    cb(null, true);
  },
});

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Product videos (Premium): one MP4 or WebM file per request. */
export const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!VIDEO_TYPES.has(file.mimetype)) return cb(ApiError.badRequest('Only MP4 or WebM videos are allowed'));
    cb(null, true);
  },
});

export function hasVideoSignature(buf: Buffer, mimetype: string): boolean {
  if (buf.length < 12) return false;
  switch (mimetype) {
    case 'video/mp4':
      // ISO base media file: "ftyp" box at offset 4.
      return buf.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm':
      // EBML header.
      return buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

/**
 * The declared MIME type comes from the client and can't be trusted, so check the
 * file signature ("magic bytes") as well before storing anything.
 */
export function hasImageSignature(buf: Buffer, mimetype: string): boolean {
  if (buf.length < 12) return false;
  switch (mimetype) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    case 'image/avif':
      return buf.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(buf.toString('ascii', 8, 12));
    default:
      return false;
  }
}
