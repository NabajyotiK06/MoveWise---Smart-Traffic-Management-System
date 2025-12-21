import React, { useMemo } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
} from "chart.js";
import { Bar, Pie, Doughnut, PolarArea } from "react-chartjs-2";
import { TrendingUp, AlertCircle, Car, Activity, Wind, Zap } from "lucide-react";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
);

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ padding: "12px", borderRadius: "10px", background: `${color}20` }}>
            <Icon size={24} color={color} />
        </div>
        <div>
            <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>{title}</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>{value}</div>
            {subtext && <div style={{ fontSize: "12px", color: color }}>{subtext}</div>}
        </div>
    </div>
);

const AnalyticsPanel = ({ signals, incidents }) => {
    // 1. Calculate Summary Stats
    const totalVehicles = useMemo(() => signals.reduce((acc, s) => acc + s.vehicles, 0), [signals]);
    const activeIncidents = useMemo(() => incidents.filter(i => i.status !== "RESOLVED").length, [incidents]);
    const avgSystemSpeed = useMemo(() => {
        if (!signals.length) return 0;
        return (signals.reduce((acc, s) => acc + (s.avgSpeed || 0), 0) / signals.length).toFixed(1);
    }, [signals]);
    const maxAqi = useMemo(() => Math.max(...signals.map(s => s.aqi || 0), 0), [signals]);
    const criticalSignals = useMemo(() => signals.filter(s => s.congestion === "HIGH").length, [signals]);

    // 2. Prepare Chart Data

    // Congestion Distribution (Doughnut)
    const congestionData = useMemo(() => {
        const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
        signals.forEach(s => {
            const level = s.congestion || "LOW";
            if (counts[level] !== undefined) counts[level]++;
        });

        return {
            labels: ["High", "Medium", "Low"],
            datasets: [{
                data: [counts.HIGH, counts.MEDIUM, counts.LOW],
                backgroundColor: ["#ef4444", "#eab308", "#22c55e"],
                borderWidth: 0
            }]
        };
    }, [signals]);

    // Signal Phase Distribution (Pie)
    const phaseData = useMemo(() => {
        const counts = { RED: 0, GREEN: 0, YELLOW: 0 };
        signals.forEach(s => {
            if (counts[s.currentLight] !== undefined) counts[s.currentLight]++;
        });
        return {
            labels: ["Red Phase", "Green Phase", "Yellow Phase"],
            datasets: [{
                data: [counts.RED, counts.GREEN, counts.YELLOW],
                backgroundColor: ["#ef4444", "#22c55e", "#eab308"],
                borderWidth: 0
            }]
        };
    }, [signals]);

    // AQI Leaderboard (Bar)
    const aqiData = useMemo(() => {
        const sorted = [...signals].sort((a, b) => b.aqi - a.aqi).slice(0, 5);
        return {
            labels: sorted.map(s => s.name || `Signal ${s.id}`),
            datasets: [{
                label: "Air Quality Index (AQI)",
                data: sorted.map(s => s.aqi),
                backgroundColor: "#a855f7",
                borderRadius: 4
            }]
        };
    }, [signals]);

    // Busiest Intersections (Bar)
    const vehicleVolumeData = useMemo(() => {
        const sorted = [...signals].sort((a, b) => b.vehicles - a.vehicles).slice(0, 5);
        return {
            labels: sorted.map(s => s.name || `Signal ${s.id}`),
            datasets: [{
                label: "Real-time Vehicle Count",
                data: sorted.map(s => s.vehicles),
                backgroundColor: "#3b82f6",
                borderRadius: 4
            }]
        };
    }, [signals]);

    // Incident Status (Doughnut)
    const incidentData = useMemo(() => {
        const counts = { RESOLVED: 0, LIVE: 0 };
        incidents.forEach(i => {
            if (i.status === "RESOLVED") counts.RESOLVED++;
            else counts.LIVE++;
        });
        return {
            labels: ["Active", "Resolved"],
            datasets: [{
                data: [counts.LIVE, counts.RESOLVED],
                backgroundColor: ["#f97316", "#10b981"],
                borderWidth: 0
            }]
        };
    }, [incidents]);

    // Polar Area (Traffic Density Distribution)
    const polarData = useMemo(() => {
        // Buckets: 0-50, 50-100, 100-150, 150+
        const buckets = [0, 0, 0, 0];
        signals.forEach(s => {
            if (s.vehicles < 50) buckets[0]++;
            else if (s.vehicles < 100) buckets[1]++;
            else if (s.vehicles < 150) buckets[2]++;
            else buckets[3]++;
        });
        return {
            labels: ["< 50 Vehicles", "50-100 Vehicles", "100-150 Vehicles", "150+ Vehicles"],
            datasets: [{
                label: 'Signal Count',
                data: buckets,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(234, 179, 8, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderWidth: 1
            }]
        };
    }, [signals]);


    return (
        <div className="fade-in" style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
            <h2 className="section-title" style={{ marginBottom: "20px" }}>System Operational Analytics</h2>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <StatCard
                    title="Total Vehicles"
                    value={totalVehicles}
                    icon={Car}
                    color="#3b82f6"
                    subtext="Across monitored zones"
                />
                <StatCard
                    title="Avg System Speed"
                    value={`${avgSystemSpeed} km/h`}
                    icon={TrendingUp}
                    color="#8b5cf6"
                    subtext="Flow Efficiency"
                />
                <StatCard
                    title="Peak AQI Level"
                    value={maxAqi}
                    icon={Wind}
                    color="#a855f7"
                    subtext="Highest recorded pollution"
                />
                <StatCard
                    title="Critical Junctions"
                    value={criticalSignals}
                    icon={AlertCircle}
                    color="#ef4444"
                    subtext="Signals at High Capacity"
                />
                <StatCard
                    title="Active Incidents"
                    value={activeIncidents}
                    icon={Zap}
                    color="#f97316"
                    subtext="Requires Attention"
                />
                <StatCard
                    title="System Health"
                    value="98.5%"
                    icon={Activity}
                    color="#10b981"
                    subtext="Operational Status"
                />
            </div>

            {/* Row 1: Distributions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                {/* Congestion Chart */}
                <div className="card">
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Congestion Levels</h3>
                    <div style={{ height: "200px", display: "flex", justifyContent: "center" }}>
                        <Doughnut data={congestionData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                    </div>
                </div>

                {/* Phase Chart */}
                <div className="card">
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Live Signal Phases</h3>
                    <div style={{ height: "200px", display: "flex", justifyContent: "center" }}>
                        <Pie data={phaseData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                    </div>
                </div>

                {/* Incident Chart */}
                <div className="card">
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Incident Resolution</h3>
                    <div style={{ height: "200px", display: "flex", justifyContent: "center" }}>
                        <Doughnut data={incidentData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                    </div>
                </div>
            </div>

            {/* Row 2: Heavy Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                {/* AQI Bar Chart */}
                <div className="card">
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Highest Pollution Zones (AQI)</h3>
                    <div style={{ height: "250px" }}>
                        <Bar
                            data={aqiData}
                            options={{
                                maintainAspectRatio: false,
                                responsive: true,
                                scales: { y: { beginAtZero: true } }
                            }}
                        />
                    </div>
                </div>

                {/* Traffic Density Polar */}
                <div className="card">
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Traffic Density Distribution</h3>
                    <div style={{ height: "250px", display: "flex", justifyContent: "center" }}>
                        <PolarArea
                            data={polarData}
                            options={{ maintainAspectRatio: false }}
                        />
                    </div>
                </div>
            </div>

            {/* Final Row: Top Volume */}
            <div className="card">
                <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "#374151" }}>Busiest Intersections (Top 5)</h3>
                <div style={{ height: "250px" }}>
                    <Bar
                        data={vehicleVolumeData}
                        options={{
                            maintainAspectRatio: false,
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPanel;
