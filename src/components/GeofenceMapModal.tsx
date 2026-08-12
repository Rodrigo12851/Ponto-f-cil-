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
  Wifi,
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
  const [isSearchingAddress, setIsSearchingAddress] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isClickPlacementActive, setIsClickPlacementActive] = useState<boolean>(false);
  const [enforceGeofence, setEnforceGeofence] = useState<boolean>(geofence.enforceGeofence ?? true);
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(geofence.wifiEnabled ?? true);
  const [wifiSsid, setWifiSsid] = useState<string>(geofence.wifiSsid || 'WIFI_EMPRESA_SEDE');
  const [wifiPassword, setWifiPassword] = useState<string>(geofence.wifiPassword || '');
  const [trustedWifiEnabled, setTrustedWifiEnabled] = useState<boolean>(
    geofence.trustedWifiEnabled ?? geofence.wifiEnabled ?? true
  );
  const [trustedWifiSsid, setTrustedWifiSsid] = useState<string>(
    geofence.trustedWifiSsid || geofence.wifiSsid || 'WIFI_EMPRESA_SEDE'
  );
  const [trustedWifiSsids, setTrustedWifiSsids] = useState<string[]>(
    geofence.trustedWifiSsids && geofence.trustedWifiSsids.length > 0
      ? geofence.trustedWifiSsids
      : ['WIFI_EMPRESA_SEDE', 'REDE_ESCRITORIO_5G', 'SUPERMERCADO_CAIXAS_WIFI']
  );
  const [newSsidInput, setNewSsidInput] = useState<string>('');

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

  // References to keep state synced inside Leaflet event callbacks
  const pointsRef = useRef<Point2D[]>(defaultPoints);
  const activePointIndexRef = useRef<number>(0);
  const isClickPlacementActiveRef = useRef<boolean>(false);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    activePointIndexRef.current = activePointIndex;
  }, [activePointIndex]);

  useEffect(() => {
    isClickPlacementActiveRef.current = isClickPlacementActive;
  }, [isClickPlacementActive]);

  // Map DOM reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);

  // Helper to render pulsing blue dot for user exact GPS position
  const renderUserGpsMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    const blueDotHtml = `
      <div style="position: relative; width: 32px; height: 32px; pointer-events: none; transform: translate(-16px, -16px);">
        <div style="
          position: absolute;
          inset: 0;
          background: rgba(37, 99, 235, 0.45);
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
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #60a5fa;
          font-weight: 800;
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
          border: 1px solid #3b82f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        ">
          📍 Seu Ponto GPS Exato
        </div>
      </div>
    `;

    const blueDotIcon = L.divIcon({
      className: 'user-live-gps-dot',
      html: blueDotHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (userGpsMarkerRef.current) {
      userGpsMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userGpsMarkerRef.current = L.marker([lat, lng], {
        icon: blueDotIcon,
        zIndexOffset: 1000,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Calculate live dimensions from points state
  const widthMeters = getDistanceMeters(points[0].lat, points[0].lng, points[1].lat, points[1].lng);
  const heightMeters = getDistanceMeters(points[0].lat, points[0].lng, points[3].lat, points[3].lng);
  const totalAreaM2 = widthMeters * heightMeters;

  // Helper to update all Leaflet layers when points array changes non-interactively
  const syncLeafletLayers = (newPts: Point2D[]) => {
    pointsRef.current = newPts;
    setPoints(newPts);

    const latLngs = newPts.map((p) => [p.lat, p.lng] as [number, number]);

    if (polygonRef.current) {
      polygonRef.current.setLatLngs(latLngs);
    }

    markersRef.current.forEach((marker, idx) => {
      if (newPts[idx]) {
        marker.setLatLng([newPts[idx].lat, newPts[idx].lng]);
      }
    });

    if (mapInstanceRef.current && latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });
    }
  };

  // Initialize Leaflet Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance or container state if present
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Map cleanup warning:', e);
      }
      mapInstanceRef.current = null;
    }

    const container = mapContainerRef.current as any;
    if (container) {
      delete container._leaflet_id;
      container.innerHTML = '';
    }

    const initialLat = pointsRef.current.reduce((acc, p) => acc + p.lat, 0) / pointsRef.current.length;
    const initialLng = pointsRef.current.reduce((acc, p) => acc + p.lng, 0) / pointsRef.current.length;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat || centerLat, initialLng || centerLng],
      zoom: 18,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Tile Layer
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileUrl = mapType === 'satellite' ? satelliteUrl : osmUrl;
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: mapType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Draw Polygon
    const latLngs = pointsRef.current.map((p) => [p.lat, p.lng] as [number, number]);
    polygonRef.current = L.polygon(latLngs, {
      color: '#10b981',
      weight: 3,
      fillColor: '#10b981',
      fillOpacity: 0.35,
      dashArray: '6, 6',
    }).addTo(map);

    // Create 4 Draggable Markers
    markersRef.current = [];
    pointsRef.current.forEach((p, idx) => {
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker-wrapper',
        html: `
          <div style="
            background: #0f172a;
            color: #34d399;
            border: 2px solid #10b981;
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

      // On Dragging: update polygon path directly in real-time WITHOUT re-creating Leaflet markers
      marker.on('drag', (e) => {
        const newLatLng = (e.target as L.Marker).getLatLng();
        const updatedPts = [...pointsRef.current];
        updatedPts[idx] = {
          ...updatedPts[idx],
          lat: newLatLng.lat,
          lng: newLatLng.lng,
        };
        pointsRef.current = updatedPts;

        if (polygonRef.current) {
          polygonRef.current.setLatLngs(updatedPts.map((pt) => [pt.lat, pt.lng]));
        }
      });

      // On Drag End: commit final position to React state
      marker.on('dragend', () => {
        setPoints([...pointsRef.current]);
      });

      marker.on('click', () => {
        setActivePointIndex(idx);
      });

      markersRef.current.push(marker);
    });

    // Handle Map Click ONLY if explicitly activated
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isClickPlacementActiveRef.current) return; // Ignore map clicks if click placement is not enabled!

      const { lat, lng } = e.latlng;
      const targetIdx = activePointIndexRef.current;

      const updatedPts = [...pointsRef.current];
      updatedPts[targetIdx] = {
        ...updatedPts[targetIdx],
        lat,
        lng,
      };

      syncLeafletLayers(updatedPts);
      setIsClickPlacementActive(false); // Turn off click mode after placing
    });

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Leaflet map destroy error:', err);
        }
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        const container = mapContainerRef.current as any;
        delete container._leaflet_id;
        container.innerHTML = '';
      }
    };
  }, []);

  // Handle Leaflet Map resize updates
  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 500);

    const handleResize = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
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
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch (err) {
        console.warn('Remove tile layer error:', err);
      }
    }

    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileUrl = mapType === 'satellite' ? satelliteUrl : osmUrl;
    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: mapType === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap',
    }).addTo(mapInstanceRef.current);
  }, [mapType]);

  // Update marker icons when activePointIndex changes
  useEffect(() => {
    markersRef.current.forEach((marker, idx) => {
      const isActive = idx === activePointIndex;
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker-wrapper',
        html: `
          <div style="
            background: ${isActive ? '#059669' : '#0f172a'};
            color: ${isActive ? '#ffffff' : '#34d399'};
            border: 2px solid ${isActive ? '#34d399' : '#10b981'};
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
      marker.setIcon(customIcon);
    });
  }, [activePointIndex]);

  // Reset 4 points around initial center
  const handleResetPoints = () => {
    syncLeafletLayers(defaultPoints);
    setActivePointIndex(0);
    setIsClickPlacementActive(false);
  };

  // Search Address on Map via Nominatim Geocoding
  const handleSearchAddress = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address.trim()) return;

    setIsSearchingAddress(true);
    setLocationError(null);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      .then((res) => res.json())
      .then((data) => {
        setIsSearchingAddress(false);
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          const searchedPoints: Point2D[] = [
            { lat: lat + offsetLat, lng: lon - offsetLng, label: 'Ponto 1: Início Frente (Esq)' },
            { lat: lat + offsetLat, lng: lon + offsetLng, label: 'Ponto 2: Início Frente (Dir)' },
            { lat: lat - offsetLat, lng: lon + offsetLng, label: 'Ponto 3: Final Fundo (Dir)' },
            { lat: lat - offsetLat, lng: lon - offsetLng, label: 'Ponto 4: Final Fundo (Esq)' },
          ];

          if (data[0].display_name) {
            setAddress(data[0].display_name);
          }

          syncLeafletLayers(searchedPoints);
        } else {
          setLocationError('Endereço não encontrado no mapa. Tente digitar nome da cidade ou rua.');
        }
      })
      .catch(() => {
        setIsSearchingAddress(false);
        setLocationError('Erro ao buscar endereço no servidor de mapas.');
      });
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

        renderUserGpsMarker(latitude, longitude);

        const gpsPoints: Point2D[] = [
          { lat: latitude + offsetLat, lng: longitude - offsetLng, label: 'Ponto 1: Início Frente (Esq)' },
          { lat: latitude + offsetLat, lng: longitude + offsetLng, label: 'Ponto 2: Início Frente (Dir)' },
          { lat: latitude - offsetLat, lng: longitude + offsetLng, label: 'Ponto 3: Final Fundo (Dir)' },
          { lat: latitude - offsetLat, lng: longitude - offsetLng, label: 'Ponto 4: Final Fundo (Esq)' },
        ];

        syncLeafletLayers(gpsPoints);
        setActivePointIndex(0);
        setIsLocating(false);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.display_name) {
              setAddress(data.display_name);
            }
          })
          .catch(() => {});
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Permissão de GPS negada. Permita o acesso à localização no navegador.');
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
      wifiEnabled,
      wifiSsid,
      wifiPassword,
      trustedWifiEnabled,
      trustedWifiSsid: wifiSsid || trustedWifiSsid,
      trustedWifiSsids,
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
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
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
                <MapIcon className="w-3 h-3 text-emerald-600" /> Delimitação de Terreno por GPS
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
              Marque os 4 Pontos da Empresa no Mapa
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

        {/* Address Input & Map Search Controls */}
        <form onSubmit={handleSearchAddress} className="grid grid-cols-1 md:grid-cols-12 gap-1.5 mb-1.5 shrink-0">
          <div className="md:col-span-6 relative flex items-center gap-1">
            <div className="relative flex-1">
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
            <button
              type="submit"
              disabled={isSearchingAddress}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Buscar este endereço no mapa"
            >
              {isSearchingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
            </button>
          </div>

          <div className="md:col-span-6 flex items-center gap-1.5 justify-end flex-wrap">
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
              <span>{isLocating ? 'Obtendo GPS...' : 'Usar Meu GPS Atual'}</span>
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
              title="Resetar os 4 pontos"
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
        </form>

        {locationError && (
          <div className="bg-rose-50 text-rose-700 border border-rose-200 p-2 rounded-xl text-xs font-bold mb-1.5 flex items-center gap-2 shrink-0">
            <Info className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Click Step Selector Banner */}
        <div className="bg-slate-900 text-white p-2 rounded-xl text-[11px] font-bold flex flex-wrap items-center justify-between gap-2 mb-1.5 border border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Arraste os marcadores <strong className="text-emerald-400">(1, 2, 3, 4)</strong> diretamente no mapa para delimitar o terreno:
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsClickPlacementActive(!isClickPlacementActive)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border ${
                isClickPlacementActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isClickPlacementActive ? '👉 MODO CLIQUE ATIVO (Clique no Mapa)' : '🎯 Mover no Clique'}
            </button>

            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActivePointIndex(i);
                  }}
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
        </div>

        {/* MAIN MAP CONTAINER WITH ADAPTIVE HEIGHT */}
        <div className="relative w-full h-[260px] sm:h-[350px] md:h-[420px] rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-slate-900 mb-1.5 shrink-0">
          {/* Leaflet DOM Node */}
          <div ref={mapContainerRef} className="w-full h-full z-10"></div>
        </div>

        {/* Live Metrics & Point Coordinates Panel */}
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 space-y-1 mb-1.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
              <Building className="w-4 h-4 text-emerald-600" /> Área Delimitada:
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
                onClick={() => {
                  setActivePointIndex(idx);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo([p.lat, p.lng]);
                  }
                }}
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

        {/* Wi-Fi Validation & Restriction Settings */}
        <div className="space-y-2 mb-2 shrink-0">
          {/* Wi-Fi Setup Card */}
          <div className="bg-blue-900/10 border border-blue-500/30 p-3 rounded-2xl text-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-black text-slate-900 text-xs">Validação por Wi-Fi Confiável (Trusted Wi-Fi)</p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Cadastre os nomes das redes Wi-Fi da empresa (SSID). Quando o dispositivo do funcionário estiver conectado a uma destas redes no momento da batida, a localização é validada como <strong>Confiável (Trusted)</strong>, contornando qualquer oscilação ou desvio de GPS (GPS drift).
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={wifiEnabled}
                  onChange={(e) => {
                    setWifiEnabled(e.target.checked);
                    setTrustedWifiEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {wifiEnabled && (
              <div className="space-y-2.5 pt-2 border-t border-blue-200/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-800 mb-0.5">
                      Nome da Rede Wi-Fi Principal (SSID):
                    </label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => {
                        setWifiSsid(e.target.value);
                        setTrustedWifiSsid(e.target.value);
                      }}
                      placeholder="Ex: WIFI_EMPRESA_SEDE"
                      className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-800 mb-0.5">
                      Senha ou Token de Validação da Rede (Opcional):
                    </label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="Ex: empresa123"
                      className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Additional Trusted SSIDs list */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-800 mb-1">
                    Outras Redes Wi-Fi Confiáveis Autorizadas (SSIDs Secundários):
                  </label>

                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSsidInput}
                      onChange={(e) => setNewSsidInput(e.target.value)}
                      placeholder="Ex: REDE_ESCRITORIO_5G ou SUPERMERCADO_CAIXAS_WIFI"
                      className="flex-1 text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSsidInput.trim()) {
                            setTrustedWifiSsids((prev) => [...prev, newSsidInput.trim()]);
                            setNewSsidInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSsidInput.trim()) {
                          setTrustedWifiSsids((prev) => [...prev, newSsidInput.trim()]);
                          setNewSsidInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>

                  {/* Registered SSIDs chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([wifiSsid, ...trustedWifiSsids])).filter(Boolean).map((ssid) => (
                      <span
                        key={ssid}
                        className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-extrabold px-2.5 py-1 rounded-lg"
                      >
                        <Wifi className="w-3 h-3 text-blue-600" />
                        <span>{ssid}</span>
                        {ssid !== wifiSsid && (
                          <button
                            type="button"
                            onClick={() =>
                              setTrustedWifiSsids((prev) => prev.filter((s) => s !== ssid))
                            }
                            className="text-blue-700 hover:text-rose-600 font-black cursor-pointer ml-1"
                            title="Remover rede confiável"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Restriction Enforce Switch */}
          <div className="bg-emerald-900/10 border border-emerald-500/30 p-2 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-extrabold text-slate-900 text-xs">Obrigatório Bater Ponto Apenas no Local ou Wi-Fi</p>
                <p className="text-[10px] text-slate-500 font-medium">Quando ativado, os funcionários devem estar na área GPS ou conectados ao Wi-Fi configurado.</p>
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
