import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

export const uploadConfig = {
  /** Root directory for all KYC uploads (at project root) */
  rootPath: path.join(projectRoot, "upload"),
  /** Max file size per file in bytes (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  /** Allowed MIME types for ID documents and selfie */
  allowedMimeTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ],
};

/** Fixed field names for multer (must match form field names) */
export const uploadFieldNames = {
  passport: "passport",
  driver_front: "driver_front",
  driver_back: "driver_back",
  aadhaar_front: "aadhaar_front",
  aadhaar_back: "aadhaar_back",
  pan_front: "pan_front",
  selfie: "selfie",
};
