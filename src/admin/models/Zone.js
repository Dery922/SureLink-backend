import mongoose from "mongoose";

const { Schema } = mongoose;

const zoneSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, default: 20 },
    active_drivers: { type: Number, default: 0 },
  },
  { timestamps: true },
);

zoneSchema.virtual("utilisation_pct").get(function () {
  if (!this.capacity) return 0;
  return Math.round((this.active_drivers / this.capacity) * 100);
});

zoneSchema.set("toJSON", { virtuals: true });
zoneSchema.set("toObject", { virtuals: true });

export default mongoose.model("Zone", zoneSchema);
