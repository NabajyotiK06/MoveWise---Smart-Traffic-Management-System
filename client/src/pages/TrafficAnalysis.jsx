import { useContext, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AnalyticsPanel from "../components/AnalyticsPanel";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "../styles/layout.css";

const TrafficAnalysis = () => {
    const { user } = useContext(AuthContext);
    const socket = useSocket();
    const [signals, setSignals] = useState([]);
    const [incidents, setIncidents] = useState([]);

    // Fetch Signals via Socket
    useEffect(() => {
        if (!socket) return;

        socket.on("trafficUpdate", (data) => {
            setSignals(data);
        });

        return () => {
            socket.off("trafficUpdate");
        };
    }, [socket]);

    // Fetch Incidents
    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/incidents");
                const data = await res.json();
                setIncidents(data);
            } catch (err) {
                console.error("Failed to fetch incidents", err);
            }
        };
        fetchIncidents();
    }, []);

    return (
        <div className="app-layout">
            <Sidebar role={user?.role || "user"} />
            <div className="main-content">
                <Topbar />
                <div className="page-body">
                    <AnalyticsPanel signals={signals} incidents={incidents} />
                </div>
            </div>
        </div>
    );
};

export default TrafficAnalysis;
