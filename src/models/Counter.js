import mongoose from "mongoose";

// Atomic sequence generator for human-readable references (e.g. VER-3001).
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

// Returns the next value for a named sequence, creating it on first use.
export async function nextSequence(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc.seq;
}

export default Counter;
