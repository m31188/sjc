const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Year/month subfolder organization
function getUploadPath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dir = path.join(UPLOAD_DIR, String(year), month);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return { dir, relPath: `/uploads/${year}/${month}` };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { dir } = getUploadPath();
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const random = crypto.randomBytes(8).toString('hex');
    const safe = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    cb(null, `${safe}-${random}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ไฟล์ประเภทนี้ไม่ได้รับอนุญาต กรุณาอัปโหลดเฉพาะ JPG, PNG, GIF, WEBP, PDF หรือ MP4'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }  // 50MB to allow videos; image flow doesn't care
});

// Process uploaded image with Sharp - optimize and create webp version
async function processImage(filePath, options = {}) {
  if (!filePath) return null;
  const { maxWidth = 2000, quality = 85 } = options;

  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null;

    const meta = await sharp(filePath).metadata();
    if (meta.width > maxWidth) {
      const buffer = await sharp(filePath)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(filePath, buffer);
    }
    return { width: meta.width, height: meta.height };
  } catch (err) {
    console.error('Image processing error:', err.message);
    return null;
  }
}

// Get file relative path for storage in DB - derives from actual file location
function getRelativePath(file) {
  if (!file || !file.path) return null;
  // file.path is like /home/claude/sjc-website/public/uploads/2026/04/foo.jpg
  // We want /uploads/2026/04/foo.jpg
  const publicIdx = file.path.indexOf(path.sep + 'public' + path.sep);
  if (publicIdx === -1) {
    // Fallback to current month structure
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `/uploads/${y}/${m}/${file.filename}`;
  }
  // Convert to URL path (forward slashes, no leading /public)
  const relativePath = file.path.substring(publicIdx + '/public'.length);
  return relativePath.split(path.sep).join('/');
}

module.exports = { upload, processImage, getRelativePath, UPLOAD_DIR };
