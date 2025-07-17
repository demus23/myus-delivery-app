// /pages/api/signup.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// --- Counter Model for auto-incrementing suiteId ---
const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 100000 }
});
const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { name, email, password, homeAddress } = req.body;
  if (!name || !email || !password || !homeAddress) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  await dbConnect();

  // Check if user exists
  const exists = await UserModel.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email already registered.' });

  // Get next suiteId number (atomic)
  let counter = await Counter.findOneAndUpdate(
    { name: "suiteId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  const suiteId = `AE-${counter.value}`;

  // Hash password
  const hash = await bcrypt.hash(password, 10);

  // Create user
  const user = await UserModel.create({
    name,
    email,
    password: hash,
    homeAddress,
    suiteId,
    role: "user",
    createdAt: new Date(),
  });

  // Never return password!
  res.status(201).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      suiteId: user.suiteId,
      homeAddress: user.homeAddress,
      createdAt: user.createdAt
    }
  });
}
