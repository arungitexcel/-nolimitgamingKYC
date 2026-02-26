import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** SHA-256 hash of the raw key; raw key is only returned once on create */
    keyHash: { type: String, required: true, unique: true },
    /** First 8 chars of key for display (e.g. nlk_abcd); no secret value */
    prefix: { type: String, required: true, index: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
