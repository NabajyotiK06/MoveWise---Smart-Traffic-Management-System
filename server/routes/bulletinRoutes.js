import express from "express";
import Bulletin from "../models/Bulletin.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all bulletins (Public/Protected? User said "visible for both". Let's protect it so only logged in users see it)
router.get("/", protect, async (req, res) => {
    try {
        const bulletins = await Bulletin.find().sort({ createdAt: -1 });
        res.json(bulletins);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// Create bulletin (Admin only)
router.post("/", protect, adminOnly, async (req, res) => {
    const { title, content, expiresAt } = req.body;
    try {
        const newBulletin = new Bulletin({
            title,
            content,
            expiresAt: expiresAt || null
        });
        const saved = await newBulletin.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: "Failed to create bulletin" });
    }
});

// Update bulletin (Admin only)
router.put("/:id", protect, adminOnly, async (req, res) => {
    try {
        const updated = await Bulletin.findByIdAndUpdate(
            req.params.id,
            req.body, // req.body now contains expiresAt if sent
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

// Delete bulletin (Admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
    try {
        await Bulletin.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

export default router;
