import express from "express";
import fetch from "node-fetch";
import { getTrafficState } from "../simulation/trafficSimulator.js";
import Incident from "../models/Incident.js";

const router = express.Router();

// Helper: Calculate distance between two coords (Haversine not strictly needed for small deltas, but good for simple proximity)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// POST /api/traffic/optimize-route
router.post("/optimize-route", async (req, res) => {
  const { start, end, type } = req.body;

  if (!start || !end) {
    return res.status(400).json({ message: "Start and End coordinates required" });
  }

  try {
    // 1. Fetch Routes from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=true&steps=true&overview=full&geometries=geojson`;
    console.log("Fetching OSRM:", osrmUrl);

    const response = await fetch(osrmUrl);
    const data = await response.json();
    console.log("OSRM Response Code:", data.code);

    if (!data.routes || data.routes.length === 0) {
      console.log("OSRM No Routes:", data);
      return res.status(404).json({ message: "No routes found" });
    }

    const trafficSignals = getTrafficState();

    // Fetch active incidents (created in the last 24 hours, effectively active)
    const activeIncidents = await Incident.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Example: last 24h
      status: { $ne: "RESOLVED" }
    });

    // 2. Analyze Routes against Live Traffic & Incidents
    const analyzedRoutes = data.routes.map((route, index) => {
      let congestionPenalty = 0;
      let congestionDetails = [];

      // Check route geometry against signal locations
      // For simplicity, we check a subset of points (e.g., every 10th point) against all signals
      // Or check if any signal is "close" to the line.
      // Better: Step through route steps.

      const routeCoords = route.geometry.coordinates; // [lng, lat]

      // We will sample the route to check for proximity to congestion
      const sampleRate = Math.max(1, Math.floor(routeCoords.length / 20)); // Sample ~20 points

      for (let i = 0; i < routeCoords.length; i += sampleRate) {
        const [rLng, rLat] = routeCoords[i];

        // Check Traffic Signals
        trafficSignals.forEach(signal => {
          const dist = getDistance(rLat, rLng, signal.lat, signal.lng);
          if (dist < 0.5) { // Within 500m of a signal
            // Add penalty based on congestion
            if (signal.congestion === "HIGH") {
              congestionPenalty += 50;
              if (!congestionDetails.includes(signal.name)) congestionDetails.push(signal.name);
            } else if (signal.congestion === "MEDIUM") {
              congestionPenalty += 20;
            }
          }
        });

        // Check Incidents
        activeIncidents.forEach(incident => {
          // incident.location might be String "lat,lng" or Object. Assuming logic based on Schema.
          // Schema wasn't shown, but usually lat/lng are separate or in a string.
          // Let's assume incident has lat/lng properties or we parse them.
          // Based on typical schema in this project: lat, lng might be direct properties.
          const iLat = incident.lat || (incident.location && incident.location.lat);
          const iLng = incident.lng || (incident.location && incident.location.lng);

          if (iLat && iLng) {
            const dist = getDistance(rLat, rLng, iLat, iLng);
            // 0.2 km (200m) is better for city blocks. 1km was too wide and blocked parallel roads.
            if (dist < 0.2) {
              congestionPenalty += 500; // Large penalty for incidents
              const incidentLabel = `Incident: ${incident.type}`;
              if (!congestionDetails.includes(incidentLabel)) congestionDetails.push(incidentLabel);
            }
          }
        });
      }

      // Base Score = Duration (mins) + Penalty
      const durationMins = route.duration / 60;
      const score = durationMins + congestionPenalty;

      return {
        ...route,
        aiScore: score,
        congestionPenalty,
        congestionDetails,
        formattedDuration: durationMins.toFixed(1),
        formattedDistance: (route.distance / 1000).toFixed(2)
      };
    });

    // 3. Sort by AI Score (Ascending) or Duration based on type
    if (type === "shortest") {
      // Even in shortest mode, avoid severe incidents (penalty > 400 means incident)
      analyzedRoutes.sort((a, b) => {
        const aEffectiveDuration = a.duration + (a.congestionPenalty >= 400 ? 10000 : 0);
        const bEffectiveDuration = b.duration + (b.congestionPenalty >= 400 ? 10000 : 0);
        return aEffectiveDuration - bEffectiveDuration;
      });
    } else {
      analyzedRoutes.sort((a, b) => a.aiScore - b.aiScore);
    }

    // 4. Add "AI Reasoning"
    const bestRoute = analyzedRoutes[0];
    let aiReasoning = "";

    if (type === "shortest") {
      if (bestRoute.congestionPenalty >= 400) {
        aiReasoning = "Even the shortest route has a reported incident. Use caution.";
      } else {
        aiReasoning = "We selected the route with the absolute shortest travel time, regardless of potential congestion.";
      }
    } else {
      // Optimal Logic
      aiReasoning = "This is the best balance of speed and traffic avoidance.";

      if (analyzedRoutes.length > 1) {
        const alternative = analyzedRoutes[1];
        if (bestRoute.congestionPenalty < alternative.congestionPenalty) {
          aiReasoning = `AI recommended this route to avoid heavy congestion detected at ${alternative.congestionDetails.slice(0, 2).join(", ") || "key intersections"}.`;
        } else if (bestRoute.duration < alternative.duration) {
          aiReasoning = "Traffic conditions are stable, so the shortest route is also the optimal one.";
        }
      } else if (bestRoute.congestionPenalty > 0) {
        aiReasoning = `Heavy traffic detected at ${bestRoute.congestionDetails.slice(0, 2).join(", ")}, but this remains the most efficient option.`;
      }
    }

    res.json({
      routes: analyzedRoutes.map((r, index) => ({
        geoJsonCoords: r.geometry.coordinates,
        distance: r.formattedDistance,
        duration: r.formattedDuration,
        steps: r.legs[0].steps,
        summary: r.legs[0].summary,
        congestionPenalty: r.congestionPenalty,
        aiReasoning: index === 0 ? aiReasoning : null // Only attach reasoning to best route logic for now, or all? 
        // Let's refine: Return the sorted list, Client can display "Recommended" tag.
      })),
      bestRouteIndex: 0,
      aiReasoning
    });

  } catch (error) {
    console.error("Optimizer Error:", error);
    res.status(500).json({ message: "Failed to optimize route" });
  }
});

export default router;
