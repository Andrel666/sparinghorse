// A run's route on OpenStreetMap tiles (Leaflet). Draws only; the path comes from the server.
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRunMap } from "../lib/api";

export function RunMap({ id }: { id: number }) {
  const q = useRunMap(id), el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const path = q.data?.path;
    if (!el.current || !path?.length) return;
    const map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    const line = L.polyline(path, { color: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2b59c3", weight: 4 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [16, 16] });
    return () => { map.remove(); };
  }, [q.data]);
  if (q.data && !q.data.has_gps) return <span className="muted">No GPS for this run.</span>;
  return <div ref={el} className="map" aria-label="Route map" />;
}
