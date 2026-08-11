import React, { useState, useEffect, useRef } from 'react';
import { CompanyGeofence, GeofenceSquarePerimeter, Point2D } from '../types';
import L from 'leaflet';
import {
  MapPin,
  X,
  Check,
  Map as MapIcon,
  ExternalLink,
  Layers,
  RotateCcw,
  MousePointerClick,
  Info,
  Building,
  CheckCircle2,
  Navigation,
  Loader2,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';

interface GeofenceMapModalProps {
  geofence: CompanyGeofence;
  onSave: (updatedGeofence: CompanyGeofence) => void;
  onClose: () => void;
}

// Calculate distance in meters between two lat/lng points using Haversine
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const GeofenceMapModal: React.FC<GeofenceMapModalProps> = ({
  geofence,
  onSave,
  onClose,
}) => {
  const [address, setAddress] = useState<string>(geofence.address);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [enforceGeofence, setEnforceGeofence] = useState<boolean>(geofence.enforceGeofence ?? true);

  // Default company center
  const centerLat = geofence.latitude || -23.561684;
  const centerLng = geofence.longitude || -46.655981;

  // Initialize 4 default corner points around center lat/lng (~100 meters offset)
  const offsetLat = 0.0009; // ~100m lat
  const offsetLng = 0.0010; // ~100m lng

  const defaultPoints: Point2D[] = (() => {
    if (geofence.customPoints && geofence.customPoints.length === 4) {
      return geofence.customPoints;
    }
    if (geofence.squarePerimeter?.points && geofence.squarePerimeter.points.length === 4) {
      return geofence.squarePerimeter.points;
    }
    return [
      {
        lat: geofence.squarePerimeter?.northLat || centerLat + offsetLat,
        lng: geofence.squarePerimeter?.westLng || centerLng - offsetLng,
        label: 'Ponto 1: Início Frente (Esq)',
      },
      {
        lat: geofence.squarePerimeter?.northLat || centerLat + offsetLat,
        lng: geofence.squarePerimeter?.eastLng || centerLng + offsetLng,
        label: 'Ponto 2: Início Frente (Dir)',
      },
      {
        lat: geofence.squarePerimeter?.southLat || centerLat - offsetLat,
        lng: geofence.squarePerimeter?.eastLng || centerLng + offsetLng,
        label: 'Ponto 3: Final Fundo (Dir)',
      },
      {
        lat: geofence.squarePerimeter?.southLat || centerLat - offsetLat,
        lng: geofence.squarePerimeter?.westLng || centerLng - offsetLng,
        label: 'Ponto 4: Final Fundo (Esq)',
      },
    ];
  })();

  const [points, setPoints] = useState<Point2D[]>(defaultPoints);

  // Map DOM reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Calculate dimensions and perimeter from points
  const widthMeters = getDistanceMeters(points[0].lat, points[0].lng, points[1].lat, points[1].lng);
  const heightMeters = getDistanceMeters(points[0].lat, points[0].lng, points[3].lat, points[3].lng);
  const totalAreaM2 = widthMeters * heightMeters;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Compute center from initial points if available
    const initialLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const initialLng = points.reduce((acc, p) => acc + p.lng, 0) / points.length;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat || centerLat, initialLng || centerLng],
      zoom: 18,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Tile Layer: Satellite (Esri) vs Standard (OpenStreetMap)
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileUrl = mapType === 'satellite' ? satelliteUrl : osmUrl;
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: mapType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Leaflet Map resize updates
  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 500);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update Tile Layer when mapType changes
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

  // Update Polygon & Draggable Markers on map when points state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Remove existing polygon
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    // Draw Polygon between the 4 points
    const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    if (latLngs.length >= 3) {
      polygonRef.current = L.polygon(latLngs, {
        color: '#10b981', // Emerald green border
        weight: 3,
        fillColor: '#10b981',
        fillOpacity: 0.35,
        dashArray: '6, 6',
      }).addTo(map);
    }

    // Add draggable markers for each corner point
    points.forEach((p, idx) => {
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker-wrapper',
        html: `
          <div style="
            background: ${idx === activePointIndex ? '#059669' : '#0f172a'};
            color: ${idx === activePointIndex ? '#ffffff' : '#34d399'};
            border: 2px solid ${idx === activePointIndex ? '#34d399' : '#10b981'};
            border-radius: 12px;
            padding: 4px 8px;
            font-weight: 800;
            font-size: 11px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            gap: 5px;
            transform: translate(-50%, -50%);
            cursor: move;
          ">
            <span style="
              background: #10b981;
              color: #000000;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 10px;
            ">
              ${idx + 1}
            </span>
            <span>Ponto ${idx + 1}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([p.lat, p.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      // On Dragging marker, update point coordinates in real time
      marker.on('drag', (e) => {
        const newLatLng = (e.target as L.Marker).getLatLng();
        setPoints((prevPoints) => {
          const next = [...prevPoints];
          next[idx] = {
            ...next[idx],
            lat: newLatLng.lat,
            lng: newLatLng.lng,
          };
          return next;
        });
      });

      marker.on('click', () => {
        setActivePointIndex(idx);
      });

      markersRef.current.push(marker);
    });

    // Handle Map Clicks to move the currently selected active point
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPoints((prev) => {
        const next = [...prev];
        next[activePointIndex] = {
          ...next[activePointIndex],
          lat,
          lng,
        };
        return next;
      });
      // Move to next point automatically for quick 4-click setup
      setActivePointIndex((prev) => (prev + 1) % 4);
    };

    map.off('click');
    map.on('click', handleMapClick);
  }, [points, activePointIndex]);

  // Reset to auto square around center
  const handleResetPoints = () => {
    setPoints(defaultPoints);
    setActivePointIndex(0);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([centerLat, centerLng], 18);
    }
  };

  // Get User's Current GPS Location & center map/points around it
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada neste dispositivo.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Position 4 corner points around user's GPS position
        const gpsPoints: Point2D[] = [
          {
            lat: latitude + offsetLat,
            lng: longitude - offsetLng,
            label: 'Ponto 1: Início Frente (Esq)',
          },
          {
            lat: latitude + offsetLat,
            lng: longitude + offsetLng,
            label: 'Ponto 2: Início Frente (Dir)',
          },
          {
            lat: latitude - offsetLat,
            lng: longitude + offsetLng,
            label: 'Ponto 3: Final Fundo (Dir)',
          },
          {
            lat: latitude - offsetLat,
            lng: longitude - offsetLng,
            label: 'Ponto 4: Final Fundo (Esq)',
          },
        ];

        setPoints(gpsPoints);
        setActivePointIndex(0);
        setIsLocating(false);

        // Center Leaflet Map on user GPS position
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 19);
        }

        // Try reverse geocoding via OpenStreetMap Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.display_name) {
              setAddress(data.display_name);
            }
          })
          .catch(() => {
            // Keep existing address if request fails
          });
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Permissão de GPS negada. Por favor, permita o acesso à localização no navegador.');
        } else {
          setLocationError('Não foi possível obter sua localização GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const northLat = Math.max(...points.map((p) => p.lat));
    const southLat = Math.min(...points.map((p) => p.lat));
    const eastLng = Math.max(...points.map((p) => p.lng));
    const westLng = Math.min(...points.map((p) => p.lng));

    const computedCenterLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const computedCenterLng = points.reduce((acc, p) => acc + p.lng, 0) / points.length;

    const squarePerimeter: GeofenceSquarePerimeter = {
      northLat,
      southLat,
      eastLng,
      westLng,
      widthMeters,
      heightMeters,
      points,
    };

    const newGeofence: CompanyGeofence = {
      ...geofence,
      address,
      latitude: computedCenterLat,
      longitude: computedCenterLng,
      shapeType: 'SQUARE',
      radiusMeters: Math.max(widthMeters, heightMeters) / 2,
      squarePerimeter,
      customPoints: points,
      enforceGeofence,
    };

    try {
      localStorage.setItem('sistema_ponto_geofence', JSON.stringify(newGeofence));
    } catch (err) {
      console.warn('LocalStorage save error', err);
    }

    onSave(newGeofence);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 animate-in fade-in overflow-y-auto">
      <div
        className={`bg-white text-slate-900 rounded-3xl w-full shadow-2xl relative border border-slate-200 transition-all duration-300 flex flex-col my-auto ${
          isFullscreen
            ? 'fixed inset-0 rounded-none z-50 h-full p-2 sm:p-4 overflow-y-auto'
            : 'max-w-5xl max-h-[96vh] p-2 sm:p-4 overflow-y-auto'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <MapIcon className="w-3 h-3 text-emerald-600" /> Google Maps & Delimitação por Pontos
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              Marque os 4 Pontos do Terreno da Empresa no Mapa
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Address Input & Map Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 mb-1.5 shrink-0">
          <div className="md:col-span-5 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Endereço da sede da empresa..."
              required
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-7 flex items-center gap-1.5 justify-end flex-wrap">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow border border-emerald-500 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Obter minha localização GPS atual para posicionar o terreno"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>{isLocating ? 'Obtendo GPS...' : 'Usar Minha Localização GPS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-slate-900 text-emerald-400 border-slate-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{mapType === 'satellite' ? 'Satélite' : 'Ruas'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetPoints}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
              title="Resetar 4 pontos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" /> Reset
            </button>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1 transition shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Google
            </a>
          </div>
        </div>

        {locationError && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2 rounded-xl text-xs font-bold mb-1.5 flex items-center gap-2 shrink-0">
            <Info className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Click Step Selector Banner */}
        <div className="bg-emerald-950 text-emerald-300 p-2 rounded-xl text-[11px] font-bold flex flex-wrap items-center justify-between gap-2 mb-1.5 border border-emerald-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span>
              Clique no mapa ou <strong>arraste os marcadores</strong> para delimitar o terreno:
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePointIndex(i)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  activePointIndex === i
                    ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Ponto {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN MAP CONTAINER WITH ADAPTIVE HEIGHT */}
        <div className="relative w-full h-[250px] sm:h-[350px] md:h-[420px] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-slate-900 mb-1.5 shrink-0">
          {/* Leaflet DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full z-10"></div>
        </div>

        {/* Live Metrics & Point Coordinates Panel */}
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 space-y-1 mb-1.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
              <Building className="w-4 h-4 text-emerald-600" /> Terreno Delimitado:
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-300 font-extrabold text-[11px]">
                {widthMeters}m larg. x {heightMeters}m fundo
              </span>
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg font-extrabold text-[11px]">
                {totalAreaM2} m²
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-0.5">
            {points.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePointIndex(idx)}
                className={`p-1 rounded-xl border text-left transition cursor-pointer ${
                  activePointIndex === idx
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/50'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] font-extrabold flex items-center justify-between">
                  <span>Ponto {idx + 1}</span>
                  {activePointIndex === idx && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-[9px] font-mono opacity-80 truncate">
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Restriction Enforce Switch */}
        <div className="bg-emerald-900/10 border border-emerald-500/30 p-2 rounded-2xl flex items-center justify-between gap-3 text-xs mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-slate-900 text-xs">Obrigatório Bater Ponto Apenas neste Local</p>
              <p className="text-[10px] text-slate-500 font-medium">Quando ativado, os funcionários só conseguirão bater ponto dentro dessa área marcada.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enforceGeofence}
              onChange={(e) => setEnforceGeofence(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Submit Actions (Sticky at bottom on mobile) */}
        <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white pt-2 border-t border-slate-100 flex items-center gap-2 shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" /> SALVAR QUADRANTE DA EMPRESA NO MAPA
          </button>
        </form>
      </div>
    </div>
  );
};
