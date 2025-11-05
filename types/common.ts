// types/common.ts
export type MongoId = string;

export type TrackingEvent = {
  _id: MongoId;
  packageId: MongoId;
  trackingNo: string;
  status?: string;
  location?: string;
  note?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string | Date;
};

export type PackageStatus = "pending" | "in_transit" | "delivered" | "problem";

export type Package = {
  _id?: MongoId;
  tracking: string;
  courier: string;
  value: number;
  status: PackageStatus;
  userEmail?: string;
  suiteId?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
};
