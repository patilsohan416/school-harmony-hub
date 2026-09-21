import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'students');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Only JPG and PNG photo formats are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadStudentPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('photo');

// ── Staff photos (Add Staff form's profile image upload) ──
const STAFF_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'staff');

if (!fs.existsSync(STAFF_UPLOAD_DIR)) {
  fs.mkdirSync(STAFF_UPLOAD_DIR, { recursive: true });
}

const staffStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, STAFF_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

// NOTE: field name changed from 'photo' to 'profileImage' to match what
// the Add Staff frontend actually sends via
// formDataToSend.append('profileImage', formData.profileImage)
export const uploadStaffPhoto = multer({
  storage: staffStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('profileImage');

// ── Generic module attachments (e.g. Dispatch Register's document /
// acknowledgement receipt uploads). Stored per-module so files from
// different generic modules don't collide, and served from
// /uploads/generic/<module>/<filename>.
const GENERIC_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'generic');
const GENERIC_ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const GENERIC_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const genericStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const moduleSlug = (req.params as { module?: string }).module || 'misc';
    const dir = path.join(GENERIC_UPLOAD_ROOT, moduleSlug);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const genericFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (!GENERIC_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    return;
  }
  cb(null, true);
};

// Accepts any file field names (up to 10 files total) so this one
// middleware works for any generic module's attachment fields, whatever
// they're named (e.g. "document", "acknowledgementReceipt").
export const uploadGenericAttachments = multer({
  storage: genericStorage,
  fileFilter: genericFileFilter,
  limits: { fileSize: GENERIC_MAX_FILE_SIZE },
}).any();

// ── Study Material uploads (teacher-uploaded notes/assignments) ──
const STUDY_MATERIAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'study-material');
if (!fs.existsSync(STUDY_MATERIAL_UPLOAD_DIR)) {
  fs.mkdirSync(STUDY_MATERIAL_UPLOAD_DIR, { recursive: true });
}

const STUDY_MATERIAL_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const STUDY_MATERIAL_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const studyMaterialStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, STUDY_MATERIAL_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const studyMaterialFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (!STUDY_MATERIAL_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Only PDF, Word, PowerPoint, JPG, and PNG files are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadStudyMaterialFile = multer({
  storage: studyMaterialStorage,
  fileFilter: studyMaterialFileFilter,
  limits: { fileSize: STUDY_MATERIAL_MAX_FILE_SIZE },
}).single('file');