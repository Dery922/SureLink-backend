import mongoose from "mongoose";
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    provider_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },

    // 📸 Work Images Array added here
    gallery: [
      {
        url: { type: String, required: true }, // Main high-res image URL
        thumb: String, // Small thumbnail URL for fast loading
        caption: String, // Optional: "Before / After description"
        uploaded_at: { type: Date, default: Date.now },
      },
    ],

    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Service", serviceSchema);
