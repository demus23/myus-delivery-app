import mongoose, { Schema, model, models, Document } from "mongoose";

export interface INotificationSetting extends Document {
  type: string;
  enabled: boolean;
  subject: string;
  template: string;
}

const NotificationSettingSchema = new Schema<INotificationSetting>({
  type: { type: String, required: true, unique: true }, // e.g. 'welcome', 'packageShipped'
  enabled: { type: Boolean, default: true },
  subject: { type: String, default: "" },
  template: { type: String, default: "" },
});

export default models.NotificationSetting || model<INotificationSetting>("NotificationSetting", NotificationSettingSchema);
