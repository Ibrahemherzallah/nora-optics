import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// In-memory; we stream straight to Cloudinary. 5MB cap, images only (review: upload constraints).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. الصور فقط (JPEG, PNG, WEBP).'));
  },
});

export function uploadBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'nora-optics', resource_type: 'image' },
      (err, result) => (err || !result ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}
