// lib/suite.ts
import User from "@/lib/models/User";

export async function generateUniqueSuiteId(prefix = "UAE") {
  for (let i = 0; i < 20; i++) {
    const n = Math.floor(10000 + Math.random() * 90000);
    const candidate = `${prefix}-${n}`;
    const taken = await User.findOne({ suiteId: candidate }).select("_id").lean();
    if (!taken) return candidate;
  }
  return `${prefix}-${Date.now().toString().slice(-5)}`;
}

export async function reassignSuiteForUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const previous = user.suiteId ?? null;
  user.suiteId = await generateUniqueSuiteId("UAE");
  await user.save();
  return { userId: user._id.toString(), previousSuiteId: previous, suiteId: user.suiteId };
}
