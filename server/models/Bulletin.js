import mongoose from "mongoose";

const bulletinSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// TTL Index: Delete document when `expiresAt` time is reached
bulletinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Bulletin", bulletinSchema);
