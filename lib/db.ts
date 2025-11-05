import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

declare global {
   
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose;
  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || undefined,
    } as any);
  }
  await global._mongooseConn;
  return mongoose;
}

// Provide BOTH named and default export (fixes “no default export” errors)
export default connectDB;
