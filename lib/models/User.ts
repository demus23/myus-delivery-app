// lib/models/User.ts
import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IAddress {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface IStore {
  name: string;
  url?: string;
  logo?: string;
  favorite?: boolean;
}

export interface IUserDocumentFile {
  label: string;          // e.g., "Passport", "Invoice"
  filename: string;       // stored filename
  url?: string;           // public URL if any
  uploadedAt?: Date;
}

export interface IPaymentMethod {
  _id?: mongoose.Types.ObjectId;                 // keep subdoc id so API can delete by id
  type: "card" | "paypal" | "wire" | string;
  details: string;                               // token / masked card / email / IBAN
  isDefault?: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  membership?: string;                           // "Free" | "Premium" | "Pro" | etc.
  subscribed?: boolean;
  suiteId?: string | null;
  role?: string;                                 // "user" | "admin" | etc.
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  trackingEmails?: boolean;

  addresses?: IAddress[];
  stores?: IStore[];
  documents?: IUserDocumentFile[];
  paymentMethods?: IPaymentMethod[];
  createdAt?: Date;
  updatedAt?: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    label: { type: String, required: true },
    address: { type: String, required: true },
    city: String,
    country: String,
    postalCode: String,
  },
  { _id: false }
);

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true },
    url: String,
    logo: String,
    favorite: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserDocumentFileSchema = new Schema<IUserDocumentFile>(
  {
    label: { type: String, required: true },
    filename: { type: String, required: true },
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  // keep subdoc _id (default) — useful if you want to reference/delete by id later
);

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: { type: String, required: true, enum: ["card", "paypal", "wire"], default: "card" },
    details: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  // keep subdoc _id (default)
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    phone: String,
    membership: { type: String, default: "Free" },
    subscribed: { type: Boolean, default: false },
    suiteId: { type: String, default: null, index: true, unique: true, sparse: true },
    role: { type: String, default: "user" },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    
    addresses: { type: [AddressSchema], default: [] },
    stores: { type: [StoreSchema], default: [] },
    documents: { type: [UserDocumentFileSchema], default: [] },
    paymentMethods: { type: [PaymentMethodSchema], default: [] },
     trackingEmails: { type: Boolean, default: true },
  },
  { timestamps: true }
);


// Strip password from JSON outputs
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
     
    const { password, __v, ...rest } = ret;
    return rest;
  },
});

export default models.User || mongoose.model<IUser>("User", UserSchema);
