import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { CompanyGeofence, LocationData, Point2D } from '../types';
import {
  MapPin,
  X,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Crosshair,
  Sparkles,
  ShieldCheck,
  Building,
  RotateCcw,
} from 'lucide-react';
import { calculateDistanceMeters, isPointInPolygon, fetchAddressFromCoords } from '../utils/geolocation';

interface LiveLocationMapModalProps {
  location: LocationData;
  geofence: CompanyGeofence;
  onClose: () => void;
  onUpdateGeofence?: (updatedGeofence: CompanyGeofence) => void;
  onDirectPunch?: () => void;
}

export const LiveLocationMapModal: React.FC<LiveLocationMapModalProps> = ({
  location,
  geofence,
  onClose,
  onUpdateGeofence,
  onDirectPunch,
}) => {
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [address, setAddress] = useState<string>(location.address);
  const [distanceMeters, setDistanceMeters] = useState<number>(location.distanceMeters || 0);
  const [inGeofence, setInGeofence] = useState<boolean>(location.inGeofence);
  const [adjustedNotification, setAdjustedNotification] = useState<string | null>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  const points: Point2D[] =
    geofence.customPoints && geofence.customPoints.length >= 3
      ? geofence.customPoints
      : geofence.squarePerimeter?.points || [
          { lat: geofence.latitude + 0.0009, lng: geofence.longitude - 0.0010, label: 'Ponto 1' },
          { lat: geofence.latitude + 0.0009, lng: geofence.longitude + 0.0010, label: 'Ponto 2' },
          { lat: geofence.latitude - 0.0009, lng: geofence.longitude + 0.0010, label: 'Ponto 3' },
          { lat: geofence.latitude - 0.0009, lng: geofence.longitude - 0.0010, label: 'Ponto 4' },
        ];

  // Helper to re-evaluate inGeofence
  const evaluateInGeofence = (lat: number, lng: number, fencePts: Point2D[]) => {
    let inside = false;
    if (fencePts.length >= 3) {
      inside = isPointInPolygon(lat, lng, fencePts);
    }
    const dist = calculateDistanceMeters(lat, lng, geofence.latitude, geofence.longitude);
    if (!inside && dist <= (geofence.radiusMeters || 200)) {
      inside = true;
    }
    return { inside, dist };
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [userPos.lat, userPos.lng],
      zoom: 18,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Tile layer
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileUrl = mapType === 'satellite' ? satelliteUrl : osmUrl;

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: mapType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Draw Geofence Polygon
    const fenceLatLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    polygonRef.current = L.polygon(fenceLatLngs, {
      color: '#10b981',
      weight: 3,
      fillColor: '#10b981',
      fillOpacity: 0.3,
      dashArray: '6, 6',
    }).addTo(map);

    // Draw Line connecting User Blue Dot to Company Center
    const lineLatLngs: [number, number][] = [
      [userPos.lat, userPos.lng],
      [geofence.latitude, geofence.longitude],
    ];
    lineRef.current = L.polyline(lineLatLngs, {
      color: '#3b82f6',
      weight: 2,
      dashArray: '4, 4',
      opacity: 0.8,
    }).addTo(map);

    // Glowing Blue Dot Icon
    const blueDotHtml = `
      <div style="position: relative; width: 32px; height: 32px; transform: translate(-16px, -16px); pointer-events: none;">
        <div style="
          position: absolute;
          inset: 0;
          background: rgba(37, 99, 235, 0.4);
          border-radius: 50%;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          inset: 6px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        "></div>
        <div style="
          position: absolute;
          top: -26px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #60a5fa;
          font-weight: 800;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 8px;
          white-space: nowrap;
          border: 1px solid #3b82f6;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        ">
          📍 Você Está Aqui
        </div>
      </div>
    `;

    const blueDotIcon = L.divIcon({
      className: 'user-live-gps-dot',
      html: blueDotHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    userMarkerRef.current = L.marker([userPos.lat, userPos.lng], {
      icon: blueDotIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    // Fit map bounds to show both user marker and polygon
    const allLatLngs = [...fenceLatLngs, [userPos.lat, userPos.lng] as [number, number]];
    const bounds = L.latLngBounds(allLatLngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update tile layer on mapType switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileUrl = mapType === 'satellite' ? satelliteUrl : osmUrl;

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: mapType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap',
    }).addTo(mapInstanceRef.current);
  }, [mapType]);

  // Refresh exact user GPS from browser
  const handleRefreshGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserPos({ lat: uLat, lng: uLng });

        const { inside, dist } = evaluateInGeofence(uLat, uLng, points);
        setInGeofence(inside);
        setDistanceMeters(dist);

        const realAddr = await fetchAddressFromCoords(uLat, uLng);
        setAddress(realAddr);

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([uLat, uLng]);
        }
        if (lineRef.current) {
          lineRef.current.setLatLngs([
            [uLat, uLng],
            [geofence.latitude, geofence.longitude],
          ]);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([uLat, uLng]);
        }

        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Center map on user blue dot
  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userPos.lat, userPos.lng], 19, { duration: 1.2 });
    }
  };

  // Center map on company fence
  const handleCenterOnFence = () => {
    if (mapInstanceRef.current && polygonRef.current) {
      mapInstanceRef.current.fitBounds(polygonRef.current.getBounds(), { padding: [50, 50] });
    }
  };

  // One-click action to adjust company fence around user's current GPS spot!
  const handleAdjustFenceToUserPos = () => {
    const offsetLat = 0.0009; // ~100m
    const offsetLng = 0.0010;

    const newPts: Point2D[] = [
      { lat: userPos.lat + offsetLat, lng: userPos.lng - offsetLng, label: 'Ponto 1: Início Frente (Esq)' },
      { lat: userPos.lat + offsetLat, lng: userPos.lng + offsetLng, label: 'Ponto 2: Início Frente (Dir)' },
      { lat: userPos.lat - offsetLat, lng: userPos.lng + offsetLng, label: 'Ponto 3: Final Fundo (Dir)' },
      { lat: userPos.lat - offsetLat, lng: userPos.lng - offsetLng, label: 'Ponto 4: Final Fundo (Esq)' },
    ];

    const updatedGeofence: CompanyGeofence = {
      ...geofence,
      latitude: userPos.lat,
      longitude: userPos.lng,
      address,
      customPoints: newPts,
      squarePerimeter: {
        northLat: userPos.lat + offsetLat,
        southLat: userPos.lat - offsetLat,
        eastLng: userPos.lng + offsetLng,
        westLng: userPos.lng - offsetLng,
        widthMeters: 200,
        heightMeters: 200,
        points: newPts,
      },
      enforceGeofence: true,
    };

    try {
      localStorage.setItem('sistema_ponto_geofence', JSON.stringify(updatedGeofence));
    } catch (e) {
      console.warn('Storage save error:', e);
    }

    if (polygonRef.current) {
      polygonRef.current.setLatLngs(newPts.map((p) => [p.lat, p.lng]));
    }

    setInGeofence(true);
    setDistanceMeters(0);
    setAdjustedNotification('✨ Cerca da empresa reajustada com sucesso para sua localização atual!');

    if (onUpdateGeofence) {
      onUpdateGeofence(updatedGeofence);
    }

    setTimeout(() => {
      setAdjustedNotification(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Mapa de Localização GPS
              </h2>
              <p className="text-xs text-slate-400">
                Comparativo do seu Ponto Azul GPS com a Cerca da Empresa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Notification Banner */}
        {adjustedNotification && (
          <div className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-2 text-center animate-in slide-in-from-top flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{adjustedNotification}</span>
          </div>
        )}

        {/* Map Container */}
        <div className="relative flex-1 min-h-[360px] sm:min-h-[420px] bg-slate-950">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

          {/* Map Controls Floating Overlay */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            {/* Map Type Switcher */}
            <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  mapType === 'satellite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Satélite
              </button>
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Vetor
              </button>
            </div>

            {/* Quick Map Focus Buttons */}
            <button
              type="button"
              onClick={handleCenterOnUser}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xl transition flex items-center gap-1.5 cursor-pointer border border-blue-400/40"
              title="Focar no Ponto Azul"
            >
              <Crosshair className="w-4 h-4" /> Ponto Azul (GPS)
            </button>

            <button
              type="button"
              onClick={handleCenterOnFence}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-500/40"
              title="Focar na Cerca"
            >
              <Building className="w-4 h-4" /> Cerca Empresa
            </button>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2.5 rounded-2xl shadow-2xl text-[11px] space-y-1.5 max-w-xs">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-pulse shrink-0"></span>
              <span>Ponto Azul: Sua Posição Exata</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/40 border-2 border-emerald-400 shrink-0"></span>
              <span>Polígono Verde: Terreno Empresa</span>
            </div>
          </div>
        </div>

        {/* Footer Details & Action Panel */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3 shrink-0">
          
          {/* Location Status Bar */}
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 ${inGeofence ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {inGeofence ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-white">
                    {inGeofence ? 'Dentro da Cerca Virtual (OK)' : 'Fora da Cerca Virtual'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    inGeofence ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {distanceMeters}m de distância
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5">
                  {address}
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshGps}
              disabled={isLocating}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center"
              title="Atualizar GPS"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAdjustFenceToUserPos}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ajustar Cerca para Meu Ponto Azul</span>
            </button>

            {onDirectPunch && (
              <button
                type="button"
                onClick={() => {
                  onDirectPunch();
                  onClose();
                }}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Bater Ponto Nesta Posição</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
