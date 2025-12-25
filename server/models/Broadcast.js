import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "HIGH",
        required: true,
    },
    active: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Broadcast = mongoose.model("Broadcast", broadcastSchema);

export default Broadcast;
