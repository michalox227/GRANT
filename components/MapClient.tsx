"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { ProgramDTO } from "@/lib/types";

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 4, { duration: 0.6 });
  }, [center, map]);
  return null;
}

const REGION_COLOR = {
  PL: "#dc2626",
  EU: "#2563eb",
  WORLD: "#059669",
} as const;

export default function MapClient({
  programs,
  onSelect,
  selectedId,
  focus,
}: {
  programs: ProgramDTO[];
  onSelect: (p: ProgramDTO) => void;
  selectedId?: string;
  focus?: [number, number] | null;
}) {
  return (
    <MapContainer
      center={[30, 15]}
      zoom={2}
      minZoom={2}
      worldCopyJump
      className="h-full w-full rounded-xl overflow-hidden"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={focus ?? null} />
      {programs.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.latitude, p.longitude]}
          radius={selectedId === p.id ? 12 : 8}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: REGION_COLOR[p.region],
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: () => onSelect(p) }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{p.name}</div>
              <div className="text-slate-600">{p.country} · {p.organizer}</div>
              {p.applyDeadline && (
                <div className="mt-1">Deadline: {new Date(p.applyDeadline).toLocaleDateString("pl-PL")}</div>
              )}
              <button className="mt-2 text-brand-600 underline" onClick={() => onSelect(p)}>
                Zobacz szczegóły →
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
