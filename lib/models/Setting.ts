import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ISetting extends Document {
  companyName?: string;
  supportEmail?: string;
  address?: string;
  logoUrl?: string;
}

const SettingSchema = new Schema<ISetting>({
  companyName: { type: String, default: "LastMileX" },
  supportEmail: { type: String, default: "" },
  address: { type: String, default: "" },
  logoUrl: { type: String, default: "" },
});

export default models.Setting || model<ISetting>("Setting", SettingSchema);
