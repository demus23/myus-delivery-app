// scripts/seedAdmin.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dbConnect from '../lib/dbConnect';
import User from '../lib/models/User';

async function seedAdmin() {
  await dbConnect();

  const adminEmail = 'admin@example.com';
  const adminPassword = 'StrongPass123';

  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    existing.role = 'admin';
    existing.password = await bcrypt.hash(adminPassword, 12);
    await existing.save();
    console.log('Updated existing user to admin');
  } else {
    await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 12),
      role: 'admin',
    });
    console.log('Admin user created');
  }

  mongoose.disconnect();
}

seedAdmin();
