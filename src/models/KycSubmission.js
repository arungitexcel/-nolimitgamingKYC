import mongoose from "mongoose";

const DOCUMENT_TYPES = ["passport", "drivers_license", "aadhaar", "pan"];
const STATUSES = ["draft", "submitted", "pending_review", "approved", "rejected"];

const filePathsSchema = new mongoose.Schema(
  {
    passport: { type: String, default: null },
    driver_front: { type: String, default: null },
    driver_back: { type: String, default: null },
    aadhaar_front: { type: String, default: null },
    aadhaar_back: { type: String, default: null },
    pan_front: { type: String, default: null },
    selfie: { type: String, default: null },
  },
  { _id: false }
);

const kycSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    documentType: {
      type: String,
      required: true,
      enum: DOCUMENT_TYPES,
    },
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    idNumber: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: STATUSES,
      default: "submitted",
    },
    filePaths: {
      type: filePathsSchema,
      default: () => ({}),
    },
    rejectionReason: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const KycSubmission = mongoose.model(
  "KycSubmission",
  kycSubmissionSchema
);
export { DOCUMENT_TYPES, STATUSES };
