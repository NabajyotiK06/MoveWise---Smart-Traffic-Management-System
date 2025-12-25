import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import trafficRoutes from "./routes/trafficRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import bulletinRoutes from "./routes/bulletinRoutes.js";
import broadcastRoutes from "./routes/broadcastRoutes.js";

import simulateTraffic from "./simulation/trafficSimulator.js";

dotenv.config();
connectDB();

import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Attach Socket.IO to request
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/traffic", trafficRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/bulletin", bulletinRoutes);
app.use("/api/broadcast", broadcastRoutes);

// Start traffic simulation with Socket.IO
simulateTraffic(io);

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
