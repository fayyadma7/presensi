"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Search } from "lucide-react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function isValidLat(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function isValidLng(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

interface MapPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
}

function DraggableMarker({
  lat,
  lng,
  onMove,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (isValidLat(lat) && isValidLng(lng)) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);

  return (
    <Marker
      position={[lat, lng]}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onMove(pos.lat, pos.lng);
        },
      }}
    />
  );
}

function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  const parsedLat = parseFloat(lat) || -7.4212;
  const parsedLng = parseFloat(lng) || 109.4418;
  const [validLat, setValidLat] = useState(parsedLat);
  const [validLng, setValidLng] = useState(parsedLng);

  useEffect(() => {
    const pl = parseFloat(lat) || -7.4212;
    const pn = parseFloat(lng) || 109.4418;
    if (isValidLat(pl) && isValidLng(pn)) {
      setValidLat(pl);
      setValidLng(pn);
    }
  }, [lat, lng]);

  const handleMove = useCallback(
    (newLat: number, newLng: number) => {
      setValidLat(newLat);
      setValidLng(newLng);
      onLocationChange(newLat.toFixed(6), newLng.toFixed(6));
    },
    [onLocationChange]
  );

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps?q=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-3">
      <div className="h-[300px] rounded-2xl overflow-hidden border-2 border-border/50 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <MapContainer
          center={[validLat, validLng]}
          zoom={17}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMove} />
          <DraggableMarker lat={validLat} lng={validLng} onMove={handleMove} />
        </MapContainer>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono font-medium text-foreground">
            {lat}, {lng}
          </span>
        </div>
        <button
          type="button"
          onClick={openGoogleMaps}
          className="text-primary hover:text-primary/80 underline font-medium flex items-center gap-1 cursor-pointer clay-transition"
        >
          <Search className="h-3 w-3" />
          Buka di Google Maps
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Geser pin atau klik pada peta untuk memilih lokasi sekolah.
      </p>
    </div>
  );
}
