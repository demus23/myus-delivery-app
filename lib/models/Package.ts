// lib/models/Package.ts
import mongoose, { Schema, models, model } from "mongoose";
const PackageSchema = new Schema({
  title: String,
  suiteId: String,
  courier: String,
  tracking: String,
  value: String,
  status: String,
  createdAt: Date,
  // ... any other fields
});
export default models.Package || model("Package", PackageSchema);
