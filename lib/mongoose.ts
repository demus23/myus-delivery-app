import mongoose from "mongoose";


const MONGODB_URI = process.env.MONGODB_URI as string;


if (!MONGODB_URI) {
throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}


declare global {
 
var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}


let cached = global.mongooseConn;
if (!cached) {
cached = global.mongooseConn = { conn: null, promise: null };
}


export async function dbConnect() {
if (cached!.conn) return cached!.conn;
if (!cached!.promise) {
cached!.promise = mongoose
.connect(MONGODB_URI, {
dbName: process.env.MONGODB_DB || undefined,
})
.then((m) => m);
}
cached!.conn = await cached!.promise;
return cached!.conn;
}