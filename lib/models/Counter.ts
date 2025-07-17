import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 100000 },
});

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
