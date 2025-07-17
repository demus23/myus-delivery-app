import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name?: string;
  status?: string;
  password?: string;
  createdAt?: Date;
  role?: string;     // <--- Add this
  suiteId?: string;  // <--- Add this (if you use suiteId)
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  status: { type: String, default: "Active" },
  password: { type: String },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "user" },      // <--- Add this
  suiteId: { type: String, default: null },     // <--- Add this (optional)
});

export default models.User || model<IUser>("User", UserSchema);
