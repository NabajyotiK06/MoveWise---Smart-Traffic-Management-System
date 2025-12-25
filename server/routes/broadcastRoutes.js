import express from "express";
import Broadcast from "../models/Broadcast.js";

const router = express.Router();

// POST /api/broadcast - Create a new broadcast
router.post("/", async (req, res) => {
    try {
        const { message, priority } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const newBroadcast = new Broadcast({
            message,
            priority: priority || "HIGH",
            active: true
        });

        const savedBroadcast = await newBroadcast.save();

        // Emit socket event to all connected clients
        // req.io is attached in server/index.js
        if (req.io) {
            req.io.emit("emergency_broadcast", savedBroadcast);
        }

        res.status(201).json(savedBroadcast);
    } catch (error) {
        console.error("Error creating broadcast:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /api/broadcast/active - Get the latest active broadcast
router.get("/active", async (req, res) => {
    try {
        // Find the most recent active broadcast
        // In a real scenario, you might want to expire them after some time
        // For now, we just get the latest one created in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const activeBroadcast = await Broadcast.findOne({
            active: true,
            createdAt: { $gte: twentyFourHoursAgo }
        }).sort({ createdAt: -1 });

        res.json(activeBroadcast || null);
    } catch (error) {
        console.error("Error fetching active broadcast:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
