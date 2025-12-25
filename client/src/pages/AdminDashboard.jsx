import { useEffect, useState, useContext, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import Map, { Marker, NavigationControl } from "react-map-gl";
import { LocationContext } from "../context/LocationContext";
import { useSocket } from "../context/SocketContext";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  CheckCircle,
  AlertTriangle,
  Flame,
  Shield,
  Stethoscope,
  Search,
  List,
  MapPin,
  Maximize2,
  Clock,
  BarChart2
} from "lucide-react";
import AnalyticsPanel from "../components/AnalyticsPanel";
import "../styles/layout.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Helper Component for Admin Signal Marker
const AdminTrafficMarker = ({ signal, onClick }) => {
  const { currentLight, timer } = signal;
  const color = currentLight === "RED" ? "#ef4444" : currentLight === "YELLOW" ? "#eab308" : "#22c55e";

  return (
    <div onClick={onClick} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        background: "#1f2937", border: "2px solid white", borderRadius: "12px",
        padding: "4px 8px", display: "flex", gap: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
      }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "RED" ? "#ef4444" : "#374151" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "YELLOW" ? "#eab308" : "#374151" }} />
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: currentLight === "GREEN" ? "#22c55e" : "#374151" }} />
      </div>
      <div style={{ marginTop: "2px", background: color, color: "white", fontSize: "10px", fontWeight: "bold", padding: "1px 4px", borderRadius: "4px" }}>
        {timer}s
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const socket = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [signals, setSignals] = useState([]); // Traffic Signals
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null); // Selected Signal for Control
  const [activeTab, setActiveTab] = useState("LIVE");
  const [alertedDepartments, setAlertedDepartments] = useState([]);

  // Emergency Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState("HIGH");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const { searchedLocation } = useContext(LocationContext);
  const mapRef = useRef(null);

  // SOCKET: Listen for traffic updates
  useEffect(() => {
    if (!socket) return;

    socket.on("trafficUpdate", (data) => {
      setSignals(data);
      // Update selected signal if it exists
      if (selectedSignal) {
        const updated = data.find(s => s.id === selectedSignal.id);
        if (updated) setSelectedSignal(updated);
      }
    });

    return () => {
      socket.off("trafficUpdate");
    };
  }, [socket, selectedSignal]);

  // Handle Signal Override
  const overrideSignal = (action, duration = 30) => {
    if (!socket || !selectedSignal) return;
    socket.emit("adminSignalUpdate", { id: selectedSignal.id, action, duration });
    // Optimistic update handled by incoming socket event
  };

  // Fly to searched location
  useEffect(() => {
    if (searchedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [searchedLocation.lng, searchedLocation.lat],
        zoom: 14,
        duration: 1500
      });
    }
  }, [searchedLocation]);

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/incidents");
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // 🔁 Reset department locks when new incident selected
  useEffect(() => {
    if (selectedIncident) {
      setAlertedDepartments(selectedIncident.alertedDepartments || []);
    } else {
      setAlertedDepartments([]);
    }
  }, [selectedIncident]);

  // Update incident status
  const updateIncidentStatus = async (status) => {
    if (!selectedIncident) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/incidents/${selectedIncident._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );

      const updatedIncident = await res.json();

      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === updatedIncident._id ? updatedIncident : inc
        )
      );

      if (status === "RESOLVED") {
        setSelectedIncident(null);
      } else {
        setSelectedIncident(updatedIncident);
      }
    } catch (err) {
      console.error("Failed to update incident", err);
    }
  };

  // 🔔 Alert department (LOCK AFTER CLICK)
  const alertDepartment = async (department) => {
    if (!selectedIncident) return;
    if (alertedDepartments.includes(department)) return;

    try {
      const newAlerts = [...(selectedIncident.alertedDepartments || []), department];

      const res = await fetch(
        `http://localhost:5000/api/incidents/${selectedIncident._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertedDepartments: newAlerts })
        }
      );

      const updatedIncident = await res.json();

      // Update local state
      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === updatedIncident._id ? updatedIncident : inc
        )
      );
      setSelectedIncident(updatedIncident);
      setAlertedDepartments(updatedIncident.alertedDepartments || []);

      alert(`${department} department alerted for ${selectedIncident.type}`);
    } catch (err) {
      console.error("Failed to alert department", err);
      alert("Failed to update status");
    }
  };

  // 📢 Handle Emergency Broadcast
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return alert("Please enter a message");

    setIsBroadcasting(true);
    try {
      const res = await fetch("http://localhost:5000/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMessage,
          priority: broadcastPriority
        })
      });

      if (res.ok) {
        alert("Emergency Broadcast Sent Successfully!");
        setBroadcastMessage("");
      } else {
        alert("Failed to send broadcast");
      }
    } catch (err) {
      console.error("Broadcast failed", err);
      alert("Error sending broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const liveIncidents = incidents.filter(
    (inc) => inc.status !== "RESOLVED"
  );

  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === "RESOLVED"
  );

  const isLocked = (dept) => alertedDepartments.includes(dept);

  return (
    <div className="app-layout">
      <Sidebar role="admin" />

      <div className="main-content">
        <Topbar />

        <div className="page-body">
          {/* Map */}
          <div className="dashboard-map-container">
            {activeTab === "LIVE" ? (
              <Map
                initialViewState={{
                  latitude: 22.4969,
                  longitude: 88.3702,
                  zoom: 12
                }}
                ref={mapRef}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={() => {
                  setSelectedIncident(null);
                  setSelectedSignal(null);
                }}
              >
                <NavigationControl position="bottom-right" />

                {/* Signals Markers */}
                {signals.map((s) => (
                  <Marker
                    key={s.id}
                    longitude={s.lng}
                    latitude={s.lat}
                    anchor="center"
                  >
                    <AdminTrafficMarker
                      signal={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSignal(s);
                        setSelectedIncident(null);
                        setActiveTab("LIVE");
                      }}
                    />
                  </Marker>
                ))}

                {/* Incident Markers */}
                {liveIncidents.map((inc) => (
                  <Marker
                    key={inc._id}
                    longitude={inc.lng}
                    latitude={inc.lat}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedIncident(inc);
                      setSelectedSignal(null);
                    }}
                  >
                    <div style={{ cursor: "pointer", fontSize: "28px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                      {/* Use simple emoji markers or custom divs based on status */}
                      {inc.status === "UNDER_INVESTIGATION" ? "🟡" : "🔴"}
                    </div>
                  </Marker>
                ))}
              </Map>
            ) : activeTab === "HISTORY" ? (
              <div style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
                <h2 className="section-title">Resolved History</h2>

                {resolvedIncidents.length === 0 && <p style={{ color: "#6b7280" }}>No resolved incidents found.</p>}

                {resolvedIncidents.map((inc) => (
                  <div
                    key={inc._id}
                    className="card"
                    style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between" }}
                  >
                    <div>
                      <div style={{ fontWeight: "700", color: "#1f2937" }}>{inc.type}</div>
                      <p style={{ margin: "4px 0", color: "#4b5563" }}>{inc.description}</p>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {new Date(inc.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="status-badge">
                      resolved
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnalyticsPanel signals={signals} incidents={incidents} />
            )}
          </div>

          {/* Right Panel */}
          <div className="dashboard-sidebar">
            <div className="dashboard-scroll-area">

              {/* TABS */}
              {/* TABS */}
              <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", display: "flex", flexWrap: "wrap", gap: "8px", background: "white", position: "sticky", top: 0, zIndex: 10 }}>
                <button
                  onClick={() => setActiveTab("LIVE")}
                  className={`btn ${activeTab === "LIVE" ? "btn-primary" : ""}`}
                  style={{ flex: "1 0 auto", border: activeTab !== "LIVE" ? "1px solid #e5e7eb" : "none", background: activeTab !== "LIVE" ? "white" : "", padding: "8px 12px" }}
                >
                  <MapPin size={16} style={{ marginRight: "6px" }} />
                  Live Map
                </button>

                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={`btn ${activeTab === "HISTORY" ? "btn-primary" : ""}`}
                  style={{ flex: "1 0 auto", border: activeTab !== "HISTORY" ? "1px solid #e5e7eb" : "none", background: activeTab !== "HISTORY" ? "white" : "", padding: "8px 12px" }}
                >
                  <List size={16} style={{ marginRight: "6px" }} />
                  History
                </button>

                <button
                  onClick={() => setActiveTab("ANALYTICS")}
                  className={`btn ${activeTab === "ANALYTICS" ? "btn-primary" : ""}`}
                  style={{ flex: "1 0 auto", border: activeTab !== "ANALYTICS" ? "1px solid #e5e7eb" : "none", background: activeTab !== "ANALYTICS" ? "white" : "", padding: "8px 12px" }}
                >
                  <BarChart2 size={16} style={{ marginRight: "6px" }} />
                  Analytics
                </button>
              </div>

              <div className="panel-container">
                {/* SIGNAL CONTROL PANEL */}
                {selectedSignal && (
                  <div className="fade-in">
                    <div style={{ paddingBottom: "16px", borderBottom: "1px solid #e5e7eb", marginBottom: "16px" }}>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>🚦 {selectedSignal.name}</h2>
                      <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>Control Traffic Flow</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                      <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Current Phase</span>
                        <div style={{ fontWeight: "bold", color: selectedSignal.currentLight === "RED" ? "#ef4444" : selectedSignal.currentLight === "GREEN" ? "#22c55e" : "#eab308" }}>
                          {selectedSignal.currentLight} ({selectedSignal.timer}s)
                        </div>
                      </div>
                      <div style={{ background: "#f3f4f6", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>Congestion</span>
                        <div style={{ fontWeight: "bold", color: selectedSignal.congestion === "HIGH" ? "#ef4444" : "#22c55e" }}>
                          {selectedSignal.congestion}
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "10px" }}>Manual Override</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <button
                        onClick={() => overrideSignal("forceGreen", 45)}
                        className="btn"
                        style={{ background: "#dcfce7", color: "#166534", border: "1px solid #22c55e", justifyContent: "center" }}
                      >
                        Force GREEN (45s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceYellow", 5)}
                        className="btn"
                        style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #ca8a04", justifyContent: "center" }}
                      >
                        Force YELLOW (5s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceRed", 45)}
                        className="btn"
                        style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #ef4444", justifyContent: "center" }}
                      >
                        Force RED (45s)
                      </button>
                      <button
                        onClick={() => overrideSignal("forceGreen", 10)}
                        className="btn"
                        style={{ background: "#fff", border: "1px solid #d1d5db", color: "#374151", justifyContent: "center", marginTop: "10px" }}
                      >
                        Short Green (10s)
                      </button>
                    </div>

                    <div style={{ marginTop: "20px", padding: "12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fcd34d", display: "flex", alignItems: "start", gap: "8px" }}>
                      <AlertTriangle size={16} color="#d97706" style={{ marginTop: "3px" }} />
                      <div style={{ fontSize: "12px", color: "#b45309" }}>
                        Overrides apply immediately to all users. System will resume automatic scheduling after the forced phase ends.
                      </div>
                    </div>
                  </div>
                )}


                {/* INCIDENT DETAILS PANEL */}
                {!selectedSignal && selectedIncident && activeTab === "LIVE" && (
                  <div className="fade-in">
                    <div style={{ marginBottom: "24px" }}>
                      <div style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "4px"
                      }}>
                        INCIDENT DETAILS
                      </div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#111827", margin: "0 0 8px 0" }}>
                        {selectedIncident.type}
                      </h2>
                      <p style={{ color: "#4b5563", lineHeight: "1.5" }}>{selectedIncident.description}</p>

                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.875rem", minWidth: "60px" }}>Status:</span>
                          <span className="status-badge" style={{
                            background: selectedIncident.status === "PENDING" ? "#fef3c7" : "#ecfdf5",
                            color: selectedIncident.status === "PENDING" ? "#d97706" : "#059669"
                          }}>
                            {selectedIncident.status}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.875rem", minWidth: "60px" }}>Priority:</span>
                          <span className="status-badge" style={{
                            background: selectedIncident.priority === "HIGH" ? "#fee2e2" : selectedIncident.priority === "LOW" ? "#dbeafe" : "#fef3c7",
                            color: selectedIncident.priority === "HIGH" ? "#b91c1c" : selectedIncident.priority === "LOW" ? "#1e40af" : "#d97706"
                          }}>
                            {selectedIncident.priority || "MEDIUM"}
                          </span>
                        </div>
                      </div>

                      {selectedIncident.image && (
                        <div style={{ marginTop: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                          <img src={selectedIncident.image} alt="Incident" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }} />
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px", marginBottom: "24px" }}>
                      <h4 className="section-title">Update Status</h4>

                      <div style={{ display: "grid", gap: "10px" }}>
                        <button
                          className="btn"
                          onClick={() => updateIncidentStatus("UNDER_INVESTIGATION")}
                          style={{
                            justifyContent: "flex-start",
                            background: "#fff",
                            border: "1px solid #fbbf24",
                            color: "#b45309"
                          }}
                        >
                          <Search size={18} style={{ marginRight: "10px" }} />
                          Mark as Under Investigation
                        </button>

                        <button
                          className="btn"
                          onClick={() => updateIncidentStatus("RESOLVED")}
                          style={{
                            justifyContent: "flex-start",
                            background: "#fff",
                            border: "1px solid #34d399",
                            color: "#059669"
                          }}
                        >
                          <CheckCircle size={18} style={{ marginRight: "10px" }} />
                          Mark as Resolved
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="section-title">Dispatch Teams</h4>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "12px" }}>
                        Select departments to alert immediately.
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                          disabled={isLocked("Fire")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("Fire") ? "#fee2e2" : "#ef4444",
                            color: "white",
                            opacity: isLocked("Fire") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("Fire")}
                        >
                          <Flame size={18} style={{ marginRight: "10px" }} />
                          {isLocked("Fire") ? "Fire Dept. Dispatched" : "Dispatch Fire Department"}
                        </button>

                        <button
                          disabled={isLocked("EMS")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("EMS") ? "#d1fae5" : "#10b981",
                            color: isLocked("EMS") ? "#065f46" : "white",
                            opacity: isLocked("EMS") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("EMS")}
                        >
                          <Stethoscope size={18} style={{ marginRight: "10px" }} />
                          {isLocked("EMS") ? "EMS Dispatched" : "Dispatch Medical (EMS)"}
                        </button>

                        <button
                          disabled={isLocked("Police")}
                          className="btn"
                          style={{
                            justifyContent: "flex-start",
                            background: isLocked("Police") ? "#dbeafe" : "#3b82f6",
                            color: isLocked("Police") ? "#1e40af" : "white",
                            opacity: isLocked("Police") ? 0.7 : 1,
                            border: "none"
                          }}
                          onClick={() => alertDepartment("Police")}
                        >
                          <Shield size={18} style={{ marginRight: "10px" }} />
                          {isLocked("Police") ? "Police Dispatched" : "Dispatch Police"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EMPTY STATE */}
                {!selectedIncident && !selectedSignal && activeTab === "LIVE" && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                    <Search size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
                    <p>Select a signal or incident on the map.</p>
                  </div>
                )}

                {/* 📢 EMERGENCY BROADCAST PANEL */}
                {activeTab === "LIVE" && (
                  <div className="fade-in" style={{ marginTop: "20px" }}>
                    <div className="card" style={{ border: "1px solid #fee2e2", background: "#fffafa" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#dc2626" }}>
                        <AlertTriangle size={24} />
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>Emergency Broadcast</h3>
                      </div>

                      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "16px" }}>
                        Send an alert to all connected users immediately.
                      </p>

                      <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                          Priority Level
                        </label>
                        <select
                          value={broadcastPriority}
                          onChange={(e) => setBroadcastPriority(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            background: "white",
                            fontSize: "0.875rem"
                          }}
                        >
                          <option value="HIGH">High (Flashing Red)</option>
                          <option value="MEDIUM">Medium (Yellow Warning)</option>
                          <option value="LOW">Low (Info Blue)</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <textarea
                          rows="4"
                          placeholder="Type emergency alert message..."
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            fontSize: "0.875rem",
                            resize: "none"
                          }}
                        />
                      </div>

                      <button
                        onClick={handleBroadcast}
                        disabled={isBroadcasting}
                        className="btn"
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          background: "#ef4444",
                          color: "white",
                          fontWeight: "bold",
                          border: "none",
                          padding: "12px",
                          opacity: isBroadcasting ? 0.7 : 1
                        }}
                      >
                        {isBroadcasting ? "SENDING..." : "BROADCAST ALERT"}
                      </button>
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
