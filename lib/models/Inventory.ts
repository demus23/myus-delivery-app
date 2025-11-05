import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IInventory extends Document {
  itemName: string;
  sku: string;
  quantity: number;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const InventorySchema = new Schema<IInventory>({
  itemName: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default models.Inventory || model<IInventory>("Inventory", InventorySchema);
