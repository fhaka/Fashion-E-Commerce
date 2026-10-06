import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';
import { randomToken } from '../../utils/helpers';

export interface StoredFile {
  url: string;
  publicId: string;
}

export interface StorageProvider {
  readonly name: 'local' | 'cloudinary';
  upload(file: { buffer: Buffer; mimetype: string; originalname: string }, folder: string): Promise<StoredFile>;
  remove(publicId: string): Promise<void>;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** Development storage: writes to apps/api/uploads and serves via /uploads. Use Cloudinary or S3 in production. */
class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;
  private root = path.resolve(__dirname, '..', '..', '..', 'uploads');

  async upload(file: { buffer: Buffer; mimetype: string }, folder: string): Promise<StoredFile> {
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '');
    const dir = path.join(this.root, safeFolder);
    await fs.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomToken(8)}.${EXT[file.mimetype] ?? 'bin'}`;
    await fs.writeFile(path.join(dir, name), file.buffer);
    const publicId = `${safeFolder}/${name}`;
    return { url: `${env.API_URL}/uploads/${publicId}`, publicId };
  }

  async remove(publicId: string): Promise<void> {
    // Prevent path traversal: resolved path must stay inside the uploads root.
    const target = path.resolve(this.root, publicId);
    if (!target.startsWith(this.root + path.sep)) return;
    await fs.rm(target, { force: true });
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  readonly name = 'cloudinary' as const;

  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  upload(file: { buffer: Buffer; mimetype: string }, folder: string): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${env.CLOUDINARY_FOLDER}/${folder}`, resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  async remove(publicId: string): Promise<void> {
    // Videos are uploaded to the "videos" folder and must be deleted as video resources.
    await cloudinary.uploader.destroy(publicId, { resource_type: publicId.includes('/videos/') ? 'video' : 'image' });
  }
}

let provider: StorageProvider | null = null;
export function getStorageProvider(): StorageProvider {
  provider ??= env.cloudinaryEnabled ? new CloudinaryStorageProvider() : new LocalStorageProvider();
  return provider;
}
