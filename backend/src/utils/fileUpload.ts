import fs from 'fs';
import path from 'path';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const createUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

export const deleteFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

interface UploadedFile extends Express.Multer.File {}

export const saveFile = (file: UploadedFile, subfolder = ''): string => {
  if (!file) {
    throw new Error('No file provided');
  }

  const uploadPath = path.join(UPLOADS_DIR, subfolder);
  
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname);
  const filename = `${uniqueSuffix}${ext}`;
  const filePath = path.join(uploadPath, filename);
  
  try {
    if (file.buffer) {
      // Handle in-memory file (from multer.memoryStorage)
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      // Handle disk-stored file (from multer.diskStorage)
      const fileData = fs.readFileSync(file.path);
      fs.writeFileSync(filePath, fileData);
      // Optionally delete the temp file
      fs.unlinkSync(file.path);
    } else {
      throw new Error('No file data available to save');
    }
    
    return path.join(subfolder, filename).replace(/\\/g, '/');
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
};
