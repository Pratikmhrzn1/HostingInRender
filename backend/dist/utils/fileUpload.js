"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFile = exports.deleteFile = exports.createUploadsDir = exports.UPLOADS_DIR = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.UPLOADS_DIR = path_1.default.join(process.cwd(), 'uploads');
const createUploadsDir = () => {
    if (!fs_1.default.existsSync(exports.UPLOADS_DIR)) {
        fs_1.default.mkdirSync(exports.UPLOADS_DIR, { recursive: true });
    }
};
exports.createUploadsDir = createUploadsDir;
const deleteFile = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Error deleting file:', error);
    }
};
exports.deleteFile = deleteFile;
const saveFile = (file, subfolder = '') => {
    if (!file) {
        throw new Error('No file provided');
    }
    const uploadPath = path_1.default.join(exports.UPLOADS_DIR, subfolder);
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path_1.default.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    const filePath = path_1.default.join(uploadPath, filename);
    try {
        if (file.buffer) {
            // Handle in-memory file (from multer.memoryStorage)
            fs_1.default.writeFileSync(filePath, file.buffer);
        }
        else if (file.path) {
            // Handle disk-stored file (from multer.diskStorage)
            const fileData = fs_1.default.readFileSync(file.path);
            fs_1.default.writeFileSync(filePath, fileData);
            // Optionally delete the temp file
            fs_1.default.unlinkSync(file.path);
        }
        else {
            throw new Error('No file data available to save');
        }
        return path_1.default.join(subfolder, filename).replace(/\\/g, '/');
    }
    catch (error) {
        console.error('Error saving file:', error);
        throw new Error('Failed to save file');
    }
};
exports.saveFile = saveFile;
