import { useState, useEffect, useContext } from "react";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import { AlertTriangle, X } from "lucide-react";

const EmergencyOverlay = () => {
    const socket = useSocket();
    const { user } = useContext(AuthContext);
    const [broadcast, setBroadcast] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on("emergency_broadcast", (data) => {
            setBroadcast(data);
            setVisible(true);

            // Play a sound if available (optional)
            // const audio = new Audio('/alert.mp3');
            // audio.play().catch(e => console.log("Audio play failed", e));
        });

        return () => {
            socket.off("emergency_broadcast");
        };
    }, [socket]);

    // Don't show overlay for admins
    if (user?.role === "admin") return null;

    if (!visible || !broadcast) return null;

    const getPriorityStyles = (priority) => {
        switch (priority) {
            case "HIGH":
                return {
                    bg: "#ef4444",
                    border: "#b91c1c",
                    iconColor: "#fee2e2",
                    animation: "pulse-red"
                };
            case "MEDIUM":
                return {
                    bg: "#eab308",
                    border: "#a16207",
                    iconColor: "#fffbeb",
                    animation: "none"
                };
            case "LOW":
            default:
                return {
                    bg: "#3b82f6",
                    border: "#1d4ed8",
                    iconColor: "#eff6ff",
                    animation: "none"
                };
        }
    };

    const styles = getPriorityStyles(broadcast.priority);

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)"
        }}>
            <style>
                {`
          @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `}
            </style>

            <div style={{
                background: "white",
                width: "90%",
                maxWidth: "500px",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                animation: styles.animation === "pulse-red" ? "pulse-red 2s infinite" : "none"
            }}>
                <div style={{
                    background: styles.bg,
                    padding: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    color: "white"
                }}>
                    <div style={{
                        background: "rgba(255,255,255,0.2)",
                        padding: "12px",
                        borderRadius: "50%"
                    }}>
                        <AlertTriangle size={32} color="white" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>EMERGENCY ALERT</h2>
                        <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontWeight: "500" }}>
                            Priority: {broadcast.priority}
                        </p>
                    </div>
                </div>

                <div style={{ padding: "30px", textAlign: "center" }}>
                    <p style={{
                        fontSize: "1.25rem",
                        lineHeight: "1.6",
                        color: "#1f2937",
                        fontWeight: "500"
                    }}>
                        {broadcast.message}
                    </p>

                    <div style={{ marginTop: "10px", fontSize: "0.875rem", color: "#6b7280" }}>
                        {new Date(broadcast.createdAt).toLocaleString()}
                    </div>
                </div>

                <div style={{ padding: "0 20px 20px 20px" }}>
                    <button
                        onClick={() => setVisible(false)}
                        className="btn"
                        style={{
                            width: "100%",
                            justifyContent: "center",
                            background: "#374151",
                            color: "white",
                            padding: "14px",
                            fontSize: "1rem",
                            fontWeight: "600"
                        }}
                    >
                        ACKNOWLEDGE & DISMISS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmergencyOverlay;
