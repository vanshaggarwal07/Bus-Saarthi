import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Bus, Users, Clock, XCircle, Circle, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import { io } from "socket.io-client";


// --- Configuration ---
mapboxgl.accessToken = 'pk.eyJ1Ijoic3RhcmsxMjM0IiwiYSI6ImNtZmh5cWVubzBqMXoyaXF0aDNneGg5OWQifQ._dySBvjJtseB2Y6t_iquUA';
const API_URL = 'http://localhost:5000/buses';
const POLLING_INTERVAL_MS = 10000;
const BASE_INTERVAL = 2000;

// --- TypeScript Interfaces ---
interface Location {
  name: string;
  coords: [number, number];
}

interface BusData {
  _id: string;
  busNumber: string;
  source: Location;
  destination: Location;
  stops: Location[];
  status: 'On Time' | 'Delayed' | 'Early' | 'At Stop' | 'Inactive' | 'Arriving';
  passengers: string;
  coordinates: [number, number];
  heading: number;
  speed: number;
  nextStop: string;
  eta: string;
  isActive: boolean;
  isAtStop: boolean;
  currentStopIndex: number;
  routeGeometry?: {
    coordinates: [number, number][];
  };
}

interface AnimationState {
  from: [number, number];
  to: [number, number];
  startTime: number;
  rotation: number;
}

// --- Helper Functions ---
const getStatusColor = (status?: string, isAtStop?: boolean) => {
  if (isAtStop) return '#f59e0b'; // amber for stopped
  switch ((status || '').toLowerCase()) {
    case 'delayed': return '#dc3545';
    case 'early': return '#10b981';
    case 'arriving': return '#0ea5a4';
    case 'on time':
    default: return '#007bff';
  }
};

const createBusMarkerElement = (status?: string, isAtStop?: boolean, rotation = 0) => {
    const el = document.createElement('div');
    el.className = 'bus-marker-wrapper';
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bus-marker-icon">
          <path d="M18.9 2.1C18.4.8 17.1.1 15.8.1H8.2c-1.3 0-2.6.7-3.1 1.9L2 10.4v8.1c0 1.3 1.1 2.4 2.4 2.4h1.2c1.3 0 2.4-1.1 2.4-2.4V17h8.1v1.5c0 1.3 1.1 2.4 2.4 2.4h1.2c1.3 0 2.4-1.1 2.4-2.4v-8L18.9 2.1zM8 12.6c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5S8.8 12.6 8 12.6zm8 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5S16.8 12.6 16 12.6zM4.1 8l1.8-4.5h12.3L20 8H4.1z"></path>
        </svg>
        <div class="bus-status-label" style="margin-top:6px;padding:2px 6px;border-radius:6px;font-size:11px;color:#fff;background:${getStatusColor(status, isAtStop)}">${(isAtStop ? 'STOPPED' : (status || 'MOVING')).toUpperCase()}</div>
      </div>
    `;
    el.style.color = getStatusColor(status, isAtStop);
    el.style.setProperty('--rotation', `${rotation}deg`);
    return el;
};

const createStopMarkerElement = (isPast: boolean) => {
    const el = document.createElement('div');
    el.className = `stop-marker ${isPast ? 'past' : ''}`;
    return el;
};

export default function MapView() {
  // --- Refs ---
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const selectedBusMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const busMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routeAnimatorRef = useRef<{ raf?: number; cancelled?: boolean; posMeters?: number; totalMeters?: number } | null>(null);
  const animationStateRef = useRef<{ [key: string]: AnimationState }>({});
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const isFetching = useRef(false);
  const lastEtag = useRef<string | null>(null);
  const backoff = useRef(BASE_INTERVAL);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const searchFitBoundsDone = useRef(false);
const lastDrawnRouteRef = useRef<string | null>(null);

  // --- State ---
  const [buses, setBuses] = useState<BusData[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [searchSource, setSearchSource] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const location = useLocation();
  const [isFiltered, setIsFiltered] = useState(false);
  const filteredRef = useRef(false);
  const [routeSteps, setRouteSteps] = useState<{ instruction: string; distance: number }[]>([]);
  const [routeSummary, setRouteSummary] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [showRouteInsights, setShowRouteInsights] = useState(false);

class LocationControl {
  _map: mapboxgl.Map | null = null;
  _container: HTMLDivElement | null = null;
  _callback: () => void;

  constructor(callback: () => void) {
    this._callback = callback;
  }

  onAdd(map: mapboxgl.Map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `
      <button class="mapboxgl-ctrl-icon" type="button" title="Show my location" style="padding:6px">
        <svg viewBox="0 0 24 24" style="width:20px;height:20px">
          <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
        </svg>
      </button>
    `;
    this._container.addEventListener('click', this._callback);
    return this._container;
  }

  onRemove() {
    this._container?.removeEventListener('click', this._callback);
    this._container?.parentNode?.removeChild(this._container);
    this._map = null;
  }
}

useEffect(() => {
  if (map.current || !mapContainer.current) return;

  map.current = new mapboxgl.Map({
    container: mapContainer.current,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [77.1025, 28.7041], // fallback center
    zoom: 12,
  });

  map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  const handleLocationRequest = () => {
    if (!map.current) return;
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }

          const el = document.createElement('div');
          el.className = 'location-marker';
          el.innerHTML = `
            <div style="
              width: 24px;
              height: 24px;
              background: #4dabf7;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 0 2px #4dabf7;
              position: relative;
            ">
              <div style="
                position: absolute;
                width: 24px;
                height: 24px;
                background: #4dabf7;
                border-radius: 50%;
                opacity: 0.4;
                animation: pulse 2s ease-out infinite;
              "></div>
            </div>
          `;

          if (!document.querySelector('#location-marker-style')) {
            const style = document.createElement('style');
            style.id = 'location-marker-style';
            style.textContent = `
              @keyframes pulse {
                0% { transform: scale(1); opacity: 0.4; }
                70% { transform: scale(3); opacity: 0; }
                100% { transform: scale(1); opacity: 0; }
              }
            `;
            document.head.appendChild(style);
          }

          userLocationMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            speed: 1.5
          });

          setUserLocation([longitude, latitude]);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Could not get your location. Please ensure you have granted permission.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  map.current.addControl(new LocationControl(handleLocationRequest), 'bottom-right');

  map.current.on('load', () => {
    if (!map.current) return;
    
    if (!map.current.getSource('route')) {
      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }

    if (!map.current.getLayer('route')) {
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1E90FF', 'line-width': 6, 'line-opacity': 1 }
      });
    }

   try { map.current.moveLayer('route'); } catch (e) { /* ignore if not movable */ }
 
    map.current.resize();
  // });
  });

  return () => {
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }
    map.current?.remove();
    map.current = null;
  };
}, []);

const toRad = (v: number) => (v * Math.PI) / 180;
const haversineMeters = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon), Math.sqrt(1 - (sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon)));
  return R * c;
};

const findNearestPointOnRoute = (routeCoords: [number, number][], pt: [number, number]) => {
  let best = { dist: Infinity, segIdx: 0, t: 0, point: routeCoords[0] as [number, number] };
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = routeCoords[i];
    const b = routeCoords[i + 1];
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const wx = pt[0] - a[0];
    const wy = pt[1] - a[1];
    const denom = vx * vx + vy * vy;
    let t = denom === 0 ? 0 : (vx * wx + vy * wy) / denom;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const proj: [number, number] = [a[0] + vx * t, a[1] + vy * t];
    const d = haversineMeters(proj, pt);
    if (d < best.dist) best = { dist: d, segIdx: i, t, point: proj };
  }
  return best;
};

useEffect(() => {
  if (!selectedBus) return;
  const updated = buses.find(b => b._id === selectedBus._id || b.busNumber === selectedBus.busNumber);
  if (updated) {
    const changed = JSON.stringify(updated) !== JSON.stringify(selectedBus);
    if (changed) setSelectedBus(updated);
  }
}, [buses, selectedBus]);

function buildRouteMetrics(routeCoords: [number, number][]) {
  const segLens: number[] = [];
  const cum: number[] = [0];
  let total = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a: [number, number] = routeCoords[i];
    const b: [number, number] = routeCoords[i + 1];
    const d = haversineMeters([a[0], a[1]], [b[0], b[1]]);
    segLens.push(d);
    total += d;
    cum.push(total);
  }
  return { segLens, cum, total };
}

function pointAtDistance(routeCoords: [number, number][], cum: number[], segLens: number[], distanceMeters: number): [number, number] {
  if (distanceMeters <= 0) return routeCoords[0];
  const total = cum[cum.length - 1];
  if (distanceMeters >= total) return routeCoords[routeCoords.length - 1];
  let i = 0;
  while (i < segLens.length && cum[i + 1] < distanceMeters) i++;
  const segStart = routeCoords[i];
  const segEnd = routeCoords[i + 1];
  const segStartDist = cum[i];
  const within = distanceMeters - segStartDist;
  const t = segLens[i] === 0 ? 0 : within / segLens[i];
  const lng = segStart[0] + (segEnd[0] - segStart[0]) * t;
  const lat = segStart[1] + (segEnd[1] - segStart[1]) * t;
  return [lng, lat];
}

function startRouteAnimation(routeCoords: [number, number][], marker: mapboxgl.Marker, startPos: [number, number], speedMetersPerSec = 10) {
  if (routeAnimatorRef.current?.raf) cancelAnimationFrame(routeAnimatorRef.current.raf);
  routeAnimatorRef.current = { cancelled: false };

  const { segLens, cum, total } = buildRouteMetrics(routeCoords);
  routeAnimatorRef.current.totalMeters = total;

  const nearest = findNearestPointOnRoute(routeCoords, startPos);
  const startDist = cum[nearest.segIdx] + nearest.t * (segLens[nearest.segIdx] ?? 0);
  routeAnimatorRef.current.posMeters = startDist;

  let lastTs = performance.now();
  function tick(ts: number) {
    if (!routeAnimatorRef.current || routeAnimatorRef.current.cancelled) return;
    const dt = Math.max(0.0001, (ts - lastTs) / 1000);
    lastTs = ts;
    routeAnimatorRef.current.posMeters = (routeAnimatorRef.current.posMeters ?? 0) + speedMetersPerSec * dt;
    if ((routeAnimatorRef.current.posMeters ?? 0) >= total) {
      marker.setLngLat(routeCoords[routeCoords.length - 1]);
      return;
    }
    const pt = pointAtDistance(routeCoords, cum, segLens, routeAnimatorRef.current.posMeters ?? 0);
    marker.setLngLat(pt);
    routeAnimatorRef.current.raf = requestAnimationFrame(tick);
  }
  routeAnimatorRef.current.raf = requestAnimationFrame(tick);
  return () => {
    if (routeAnimatorRef.current?.raf) cancelAnimationFrame(routeAnimatorRef.current.raf);
    routeAnimatorRef.current = null;
  };
}
 // ...existing code...
// add helper (near haversineMeters / findNearestPointOnRoute helpers)
const coordsAlmostEqual = (a?: [number, number] | null, b?: [number, number] | null, toleranceMeters = 50) => {
  if (!a || !b) return false;
  try {
    return haversineMeters(a, b) <= toleranceMeters;
  } catch {
    return false;
  }
};
// ...existing code...

// Replace the existing effect that syncs selectedBus with buses with this:
useEffect(() => {
  if (!selectedBus) return;
  const updated = buses.find(b => b._id === selectedBus._id || b.busNumber === selectedBus.busNumber);
  if (updated) {
    const coordsChanged = !coordsAlmostEqual(updated.coordinates as [number, number], selectedBus.coordinates as [number, number], 5);
    const headingChanged = Math.abs((updated.heading || 0) - (selectedBus.heading || 0)) > 2;
    const statusChanged = updated.isAtStop !== selectedBus.isAtStop || updated.status !== selectedBus.status;
    if (coordsChanged || headingChanged || statusChanged) {
      setSelectedBus(updated);
    }
  }
}, [buses, selectedBus]);

useEffect(() => {
  if (!selectedBus) {
    setRouteSteps([]);
    setRouteSummary(null);
    setShowRouteInsights(false);
    (async () => {
      const routeSourceClear = await ensureRouteSource();
      routeSourceClear?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
    })();
    return;
  }
  // ...existing code...
}, [selectedBus]);
// Replace the existing effect that moves/creates selectedBusMarker to guard map moves:
useEffect(() => {
  if (!map.current) return;
  if (!selectedBus) {
    if (selectedBusMarkerRef.current) {
      selectedBusMarkerRef.current.remove();
      selectedBusMarkerRef.current = null;
    }
    return;
  }
  const routeCoords = selectedBus.routeGeometry?.coordinates as [number, number][] | undefined;
  const driverPos = selectedBus.coordinates as [number, number] | undefined;
  if (!driverPos || driverPos.length !== 2) return;
  let displayPosition = driverPos;
  if (routeCoords && routeCoords.length >= 2) {
    const snap = findNearestPointOnRoute(routeCoords, driverPos);
    displayPosition = snap.point;
  }
  if (!selectedBusMarkerRef.current) {
    const el = createBusMarkerElement(selectedBus.status, selectedBus.isAtStop, selectedBus.heading);
    selectedBusMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(displayPosition)
      .addTo(map.current);
    selectedBusMarkerRef.current.getElement().addEventListener('click', () => handleBusSelect(selectedBus));
  } else {
    selectedBusMarkerRef.current.setLngLat(displayPosition);
    const el = selectedBusMarkerRef.current.getElement();
    if (el) {
      const label = el.querySelector<HTMLElement>('.bus-status-label');
      if (label) {
        label.textContent = (selectedBus.isAtStop ? 'STOPPED' : (selectedBus.status || 'MOVING')).toUpperCase();
        label.style.background = getStatusColor(selectedBus.status, selectedBus.isAtStop);
      }
      el.style.color = getStatusColor(selectedBus.status, selectedBus.isAtStop);
      const icon = el.querySelector<HTMLElement>('.bus-marker-icon');
      if (icon) icon.style.transform = `rotate(${selectedBus.heading ?? 0}deg)`;
    }
  }

  // Only move the map if the center is far from the target or zoom is below threshold
  try {
    if (selectedBus && map.current) {
      const center = map.current.getCenter();
      const centerArr: [number, number] = [center.lng, center.lat];
      const distMeters = haversineMeters(centerArr, displayPosition);
      const currentZoom = map.current.getZoom();
      const ZOOM_TARGET = 14;
      const DIST_THRESHOLD = 50; // meters

      if (distMeters > DIST_THRESHOLD || currentZoom < ZOOM_TARGET) {
        map.current.easeTo({ center: displayPosition, zoom: Math.max(currentZoom, ZOOM_TARGET), duration: 800 });
      } else {
        // do not refocus — keep current view
      }
    }
  } catch (e) { /* ignore */ }
}, [selectedBus, buses, handleBusSelect]);

// Replace handleBusSelect to avoid unnecessary flyTo when already close
function handleBusSelect(bus: BusData) {
  setSelectedBus(bus);
  searchFitBoundsDone.current = true;
  try {
    const center = normalizeCoords(bus.coordinates);
    if (center && map.current) {
      const currentCenter = map.current.getCenter();
      const centerArr: [number, number] = [currentCenter.lng, currentCenter.lat];
      const distMeters = haversineMeters(centerArr, center);
      const ZOOM_TARGET = 14;
      if (distMeters > 50 || map.current.getZoom() < ZOOM_TARGET) {
        map.current.flyTo({ center, zoom: ZOOM_TARGET, speed: 1.2 });
      }
    } else {
      if (map.current && userLocation) map.current.flyTo({ center: userLocation, zoom: 12, speed: 1.2 });
    }
  } catch (err) {
    console.error('handleBusSelect flyTo error', err);
  }
}
// ...existing code...

  // const handleBusSelect = useCallback((bus: BusData) => {
  //   setSelectedBus(bus);
  //   searchFitBoundsDone.current = true;
  //   try {
  //     const center = normalizeCoords(bus.coordinates);
  //     if (center && map.current) {
  //       map.current.flyTo({ center, zoom: 14, speed: 1.2 });
  //     } else {
  //       if (map.current && userLocation) map.current.flyTo({ center: userLocation, zoom: 12, speed: 1.2 });
  //     }
  //   } catch (err) {
  //     console.error('handleBusSelect flyTo error', err);
  //   }
  // }, [userLocation]);

useEffect(() => {
    if (!map.current) return;
    if (!selectedBus) {
        if (selectedBusMarkerRef.current) {
            selectedBusMarkerRef.current.remove();
            selectedBusMarkerRef.current = null;
        }
        return;
    }
    const routeCoords = selectedBus.routeGeometry?.coordinates as [number, number][] | undefined;
    const driverPos = selectedBus.coordinates as [number, number] | undefined;
    if (!driverPos || driverPos.length !== 2) return;
    let displayPosition = driverPos;
    if (routeCoords && routeCoords.length >= 2) {
        const snap = findNearestPointOnRoute(routeCoords, driverPos);
        displayPosition = snap.point;
    }
    if (!selectedBusMarkerRef.current) {
        const el = createBusMarkerElement(selectedBus.status, selectedBus.isAtStop, selectedBus.heading);
        selectedBusMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat(displayPosition)
            .addTo(map.current);
        selectedBusMarkerRef.current.getElement().addEventListener('click', () => handleBusSelect(selectedBus));
    } else {
        selectedBusMarkerRef.current.setLngLat(displayPosition);
        const el = selectedBusMarkerRef.current.getElement();
        if (el) {
            const label = el.querySelector<HTMLElement>('.bus-status-label');
            if (label) {
                label.textContent = (selectedBus.isAtStop ? 'STOPPED' : (selectedBus.status || 'MOVING')).toUpperCase();
                label.style.background = getStatusColor(selectedBus.status, selectedBus.isAtStop);
            }
            el.style.color = getStatusColor(selectedBus.status, selectedBus.isAtStop);
            const icon = el.querySelector<HTMLElement>('.bus-marker-icon');
            if (icon) icon.style.transform = `rotate(${selectedBus.heading ?? 0}deg)`;
        }
    }
    if (selectedBus && map.current) {
        try {
            map.current.easeTo({ center: displayPosition, zoom: Math.max(map.current.getZoom(), 14), duration: 800 });
        } catch (e) { /* ignore */ }
    }
}, [selectedBus, buses, handleBusSelect]);

 const normalizeCoords = (coords?: [number, number] | null): [number, number] | null => {
    if (!coords || coords.length !== 2) return null;
    const a = coords[0], b = coords[1];
    if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) return [a, b];
    if (Math.abs(b) > 90 && Math.abs(b) <= 180 && Math.abs(a) <= 90) return [b, a];
    if (Math.abs(b) <= 90) return [a, b];
    return [b, a];
  };

  const handleBusNumberSearch = useCallback(async (busNumber?: string) => {
    const num = (busNumber || '').trim();
    if (!num) return;
    setSearching(true);
      filteredRef.current = true;
    setIsFiltered(true);
    searchFitBoundsDone.current = false;
    try {
      const resp = await fetch(`${API_URL}/search/bus/${encodeURIComponent(num)}`);
      if (resp.status === 404) {
        setBuses([]);
        setSelectedBus(null);
        setSearchError('Bus not found.');
        const routeSource = await ensureRouteSource();
        routeSource?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
        stopMarkersRef.current.forEach(m=>m.remove());
        stopMarkersRef.current = [];  
        return;
      }
      if (!resp.ok) throw new Error(`Server ${resp.status}`);
      const data = await resp.json();
      const bus = data?.bus ?? null;
      if (bus) {
        setBuses([bus]);
        setSelectedBus(bus);
       try {
        
         const rawCoords = bus.routeGeometry?.coordinates || [];
          const coordsNormalized = (rawCoords || []).map((c: any) => normalizeCoords(c as [number, number])).filter(Boolean) as [number, number][];
         const routeSource = map.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined;
        if (routeSource && bus.routeGeometry?.coordinates && bus.routeGeometry.coordinates.length > 1) {
          // use routeSource which comes from ensureRouteSource
          await routeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: bus.routeGeometry.coordinates }
          });
         try { map.current?.moveLayer('route'); } catch (e) {}
            const bounds = new mapboxgl.LngLatBounds(coordsNormalized[0], coordsNormalized[0]);
            coordsNormalized.forEach((c: any) => bounds.extend(c));
          } else {
          const routeSource = await ensureRouteSource();
          routeSource?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
          stopMarkersRef.current.forEach(m=>m.remove());
          stopMarkersRef.current = [];
 if (map.current && Array.isArray(bus.coordinates)) {
           const center = normalizeCoords(bus.coordinates as [number, number]) ?? (bus.coordinates as [number, number]);
            map.current.flyTo({ center: bus.coordinates as [number, number], zoom: 13 });
          }
        }
      } catch (err) {
        console.error('Failed to draw route for bus search', err);
      }
    }
    } catch (err) {
      console.error('Bus search error:', err);
      setSearchError('Failed to search for bus.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(async (e?: React.FormEvent, srcParam?: string, dstParam?: string) => {
    if (e) e.preventDefault();
    const src = (srcParam ?? searchSource).trim();
    const dst = (dstParam ?? searchDestination).trim();
    if (!src || !dst) {
        setSearchError('Please enter source and destination');
        return;
    }
    setSearchError(null);
    setSearching(true);
    filteredRef.current = true;
    searchFitBoundsDone.current = false;
    try {
        const url = `${API_URL}/search/route?source=${encodeURIComponent(src)}&destination=${encodeURIComponent(dst)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Server error ${resp.status}`);
        const data = await resp.json();
        const found = Array.isArray(data.buses) ? data.buses : (data?.buses || []);
        
        setBuses(found);
        setSelectedBus(null);
        setIsFiltered(true);

       // pick first bus that has route geometry and draw it
   const routeBus = found.find((b: any) => b.routeGeometry?.coordinates && b.routeGeometry.coordinates.length > 1);
    const routeSource = await ensureRouteSource();
    if (routeBus && routeSource) {
      try {
        const rawCoords = routeBus.routeGeometry.coordinates as [number, number][];
        const coords = (rawCoords || []).map(c => normalizeCoords(c as [number, number])).filter(Boolean) as [number, number][];
        if (coords.length > 1) {
          routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
          try { map.current?.moveLayer('route'); } catch (e) {}
          const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
          coords.forEach(c => bounds.extend(c));
          map.current?.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 50, right: 450 } });
        } else {
          routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
          if (found.length === 0) setSearchError('No buses found for that route');
        }
      } catch (err) {
        console.error('Failed to draw route for search', err);
      }
    } else {
      // nothing to draw — clear route and show message
      routeSource?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      stopMarkersRef.current.forEach(m=>m.remove());
      stopMarkersRef.current = [];
      if (found.length === 0) setSearchError('No drivers found for that route');
    }
    } catch (err: any) {
        console.error('Route search error:', err);
        setSearchError(err?.message || 'Failed to search');
    } finally {
        setSearching(false);
    }
  }, [searchSource, searchDestination]);

  const pollOnce = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const headers: Record<string, string> = {};
      if (lastEtag.current) headers['If-None-Match'] = lastEtag.current;
      const resp = await fetch(API_URL, { headers });
      if (resp.status === 304) {
        backoff.current = BASE_INTERVAL;
      } else if (resp.ok) {
        const data = await resp.json();
          if (!filteredRef.current) {
            setBuses(Array.isArray(data.buses) ? data.buses : []);
          } else {
            console.debug('Poll skipped updating buses because filtered mode is active');
          }
        const etag = resp.headers.get('ETag');
        if (etag) lastEtag.current = etag;
        backoff.current = BASE_INTERVAL;
      } else {
        backoff.current = Math.min(backoff.current * 2, 30000);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
      backoff.current = Math.min(backoff.current * 2, 30000);
    } finally {
      isFetching.current = false;
      setTimeout(() => pollOnce(), backoff.current);
    }
  }, []);
async function ensureRouteSource(): Promise<mapboxgl.GeoJSONSource | null> {
  if (!map.current) return null;
  try {
    // wait for style to be ready if needed
    if (!map.current.isStyleLoaded || !map.current.isStyleLoaded()) {
      await new Promise<void>((resolve) => map.current!.once('load', () => resolve()));
    }
    // if source already present return it
    const existing = map.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;
    if (existing) return existing;
    // create source + layer (guarded against double-add)
    try {
      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1E90FF', 'line-width': 6, 'line-opacity': 1 }
      });
    } catch (e) {
      // adding source/layer may throw if concurrently added; ignore
    }
    return map.current.getSource('route') as mapboxgl.GeoJSONSource | null;
  } catch (err) {
    console.warn('ensureRouteSource failed', err);
    return null;
  }
}

  
  const clearSelection = useCallback(() => {
    setSelectedBus(null);
    if(userLocation) map.current?.flyTo({ center: userLocation, zoom: 12, speed: 1.2 });
  }, [userLocation]);

  const handleClearSearch = useCallback(() => {
    setSearchSource('');
    setSearchDestination('');
    setSearchError(null);
    window.history.pushState({}, '', window.location.pathname);
    filteredRef.current = false;
    setIsFiltered(false);
    setSelectedBus(null);
    searchFitBoundsDone.current = false;
    if (!isFetching.current) {
        lastEtag.current = null;
        pollOnce();
    }
  }, [pollOnce]);
useEffect(() => {
    if (!selectedBus) {
      setRouteSteps([]);
      setRouteSummary(null);
      setShowRouteInsights(false);
      // Clear route on map when no selection
      const routeSourceClear = map.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      routeSourceClear?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      return;
    }
    const src = selectedBus.source?.coords;
    const dst = selectedBus.destination?.coords;
    if (!src || !dst || src.length < 2 || dst.length < 2) {
      setRouteSteps([]);
      setRouteSummary(null);
      setShowRouteInsights(false);
      // clear route if locations not usable
      const routeSourceClear = map.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      routeSourceClear?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      return;
    }

    // helper: set route GeoJSON on map and fit bounds
    const setRouteOnMap = (coordsRaw: [number, number][]) => {
      if (!map.current) return;
      const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      if (!routeSource) return;
      // ensure coords are [lng,lat] and valid
      const coords = (coordsRaw || []).map(c => normalizeCoords(c as [number, number]) ?? null).filter(Boolean) as [number, number][];
      if (coords.length <= 1) {
        routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
        return;
      }
      routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
      try { map.current.moveLayer('route'); } catch (e) { /* ignore */ }
      const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
      coords.forEach(c => bounds.extend(c));
      try { map.current.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 50, right: 450 } }); } catch (e) { /* ignore */ }
    };

    const start = `${src[1]},${src[0]}`;
    const end = `${dst[1]},${dst[0]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?steps=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
    let aborted = false;
    (async () => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Directions ${resp.status}`);
        const data = await resp.json();
        const route = data.routes && data.routes[0];
        if (!route || !route.legs || !route.legs[0]) {
          setRouteSteps([]);
          setRouteSummary(null);
          setShowRouteInsights(false);
          // clear route if directions empty
          setRouteOnMap([]);
          return;
        }
        const leg = route.legs[0];
        const steps = (leg.steps || []).map((s: any) => ({
          instruction: s.maneuver?.instruction || s.name || '',
          distance: s.distance || 0
        }));
        if (aborted) return;
        setRouteSteps(steps);
        setRouteSummary({ distanceKm: +(route.distance / 1000).toFixed(1), durationMin: Math.round(route.duration / 60) });
        setShowRouteInsights(true);

        // DRAW route geometry returned by Mapbox Directions
        const geometryCoords: [number, number][] = (route.geometry && route.geometry.coordinates) || [];
        if (geometryCoords && geometryCoords.length > 1) {
          setRouteOnMap(geometryCoords);
        } else {
          // fallback: if selectedBus has server-side routeGeometry, draw that
          const fallback = selectedBus.routeGeometry?.coordinates || [];
          setRouteOnMap(fallback);
        }
      } catch (err) {
        console.error('Directions fetch failed', err);
        setRouteSteps([]);
        setRouteSummary(null);
        setShowRouteInsights(false);
        // clear route on error
        const routeSourceClear = map.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined;
        routeSourceClear?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      }
    })();
    return () => { aborted = true; };
  }, [selectedBus]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const busParam = params.get('bus');
    const srcParam = params.get('source');
    const dstParam = params.get('destination');
    if (busParam) {
      handleBusNumberSearch(busParam);
    } else if (srcParam && dstParam) {
      setSearchSource(srcParam);
      setSearchDestination(dstParam);
      handleSearchSubmit(undefined, srcParam, dstParam);
    } else {
      pollOnce();
    }
  }, [location.search, handleBusNumberSearch, handleSearchSubmit, pollOnce]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude]);
      },
      () => {
        const fallback: [number, number] = [77.1025, 28.7041];
        setUserLocation(fallback);
      }
    );
  }, []);

  useEffect(() => {
    if (!map.current || !userLocation) return;
    try {
      map.current.flyTo({ center: userLocation, zoom: 12 });
    } catch (e) {
      console.error('flyTo error', e);
    }
  }, [userLocation]);
  
  useEffect(() => {
    const now = Date.now();
    const newAnimationState: { [key: string]: AnimationState } = {};
    buses.forEach(bus => {
        const oldState = animationStateRef.current[bus._id];
        const marker = busMarkersRef.current[bus._id];
        const currentPosition = marker
            ? [marker.getLngLat().lng, marker.getLngLat().lat] as [number, number]
            : (oldState ? oldState.to : bus.coordinates);
        let targetPosition = bus.coordinates;
        const routeCoords = bus.routeGeometry?.coordinates;
        if (routeCoords && routeCoords.length >= 2 && bus.coordinates) {
            const snap = findNearestPointOnRoute(routeCoords as [number, number][], bus.coordinates);
            targetPosition = snap.point;
        }
        newAnimationState[bus._id] = {
            from: currentPosition,
            to: targetPosition,
            startTime: now,
            rotation: bus.heading,
        };
    });
    animationStateRef.current = newAnimationState;
  }, [buses]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      const now = Date.now();
      Object.keys(busMarkersRef.current).forEach(busId => {
        const marker = busMarkersRef.current[busId];
        const animState = animationStateRef.current[busId];
        if (!marker || !animState) return;
        const progress = Math.min((now - animState.startTime) / POLLING_INTERVAL_MS, 1);
        const lng = animState.from[0] + (animState.to[0] - animState.from[0]) * progress;
        const lat = animState.from[1] + (animState.to[1] - animState.from[1]) * progress;
        marker.setLngLat([lng, lat]);
        const element = marker.getElement();
        const icon = element.querySelector<HTMLElement>('.bus-marker-icon');
        if (icon) {
            icon.style.transform = `rotate(${animState.rotation}deg)`;
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (!map.current) return;
      const activeBuses = buses.filter(b => b.isActive && Array.isArray(b.coordinates) && b.coordinates.length === 2);
    const currentMarkerIds = Object.keys(busMarkersRef.current);
    const newBusIds = new Set(activeBuses.map(b => b._id));
    currentMarkerIds.forEach(id => {
        if (!newBusIds.has(id)) {
            if (busMarkersRef.current[id]) {
                busMarkersRef.current[id].remove();
                delete busMarkersRef.current[id];
            }
        }
    });
    activeBuses.forEach(bus => {
        let displayPosition = bus.coordinates;
        const routeCoords = bus.routeGeometry?.coordinates;
        if (routeCoords && routeCoords.length >= 2) {
            const snap = findNearestPointOnRoute(routeCoords as [number,number][], bus.coordinates);
            displayPosition = snap.point;
        }
        if (busMarkersRef.current[bus._id]) {
            const marker = busMarkersRef.current[bus._id];
            const el = marker.getElement();
            const label = el.querySelector<HTMLElement>('.bus-status-label');
            if (label) {
                label.textContent = (bus.isAtStop ? 'STOPPED' : (bus.status || 'MOVING')).toUpperCase();
                label.style.background = getStatusColor(bus.status, bus.isAtStop);
            }
            el.style.color = getStatusColor(bus.status, bus.isAtStop);
        } else {
            const el = createBusMarkerElement(bus.status, bus.isAtStop, bus.heading);
            const newMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat(displayPosition)
                .addTo(map.current!);
            el.addEventListener('click', () => handleBusSelect(bus));
            busMarkersRef.current[bus._id] = newMarker;
        }
    });
    Object.keys(busMarkersRef.current).forEach(busId => {
        const markerElement = busMarkersRef.current[busId].getElement();
        if (!markerElement) return;
        if (selectedBus && busId === selectedBus._id) {
            markerElement.style.display = 'none';
        } else {
            markerElement.style.display = 'block';
        }
        if (selectedBus?._id === busId) {
            markerElement.classList.add('selected');
        } else {
            markerElement.classList.remove('selected');
        }
    });
  }, [buses, selectedBus, handleBusSelect]);

 useEffect(() => {
  if (!map.current) return;
  (async () => {
    const routeSource = await ensureRouteSource();
    if (!routeSource) return; // style/source not ready yet
    // --- existing effect logic below unchanged, but now safe to call routeSource.setData() ---
    // decide which route we should draw (selectedBus preferred, then a bus from search results)
    let routeToDraw: [number, number][] | null = null;
    let busForStops: BusData | null = null;
    if (selectedBus && selectedBus.routeGeometry?.coordinates?.length > 1) {
      routeToDraw = selectedBus.routeGeometry.coordinates as [number, number][];
      busForStops = selectedBus;
    } else if (isFiltered && buses.length > 0) {
      const busWithRoute = buses.find(b => b.routeGeometry?.coordinates?.length > 1);
      if (busWithRoute) {
        routeToDraw = busWithRoute.routeGeometry!.coordinates as [number, number][];
        busForStops = busWithRoute;
      }
    }

    const newKey = routeToDraw ? JSON.stringify(routeToDraw) : null;
    if (newKey && lastDrawnRouteRef.current === newKey) {
      if (stopMarkersRef.current.length === 0 && busForStops) {
        const allStops = [busForStops.source, ...busForStops.stops, busForStops.destination];
        allStops.forEach((stop, index) => {
          if (stop?.coords) {
            const isPast = busForStops!.currentStopIndex > index;
            const el = createStopMarkerElement(isPast);
            const coords = normalizeCoords(stop.coords as [number, number]);
            if (coords) {
              const stopMarker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
              stopMarkersRef.current.push(stopMarker);
            }
          }
        });
      }
      return;
    }

    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    if (routeToDraw) {
      try {
        routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeToDraw } });
      } catch (e) {
        console.warn('Failed to set route source data', e);
      }

      if (busForStops) {
        const allStops = [busForStops.source, ...busForStops.stops, busForStops.destination];
        allStops.forEach((stop, index) => {
          if (stop?.coords) {
            const isPast = busForStops!.currentStopIndex > index;
            const el = createStopMarkerElement(isPast);
            const coords = normalizeCoords(stop.coords as [number, number]);
            if (coords) {
              const stopMarker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
              stopMarkersRef.current.push(stopMarker);
            }
          }
        });
      }

      if (isFiltered && !searchFitBoundsDone.current) {
        const coordsNormalized = (routeToDraw || []).map(c => normalizeCoords(c)).filter(Boolean) as [number, number][];
        if (coordsNormalized.length > 1) {
          const bounds = new mapboxgl.LngLatBounds(coordsNormalized[0], coordsNormalized[0]);
          coordsNormalized.forEach(c => bounds.extend(c));
          try { map.current?.fitBounds(bounds, { padding: { top: 100, bottom: 50, left: 50, right: 450 } }); } catch (e) {}
          searchFitBoundsDone.current = true;
        }
      }

      lastDrawnRouteRef.current = newKey;
    } else {
      if (lastDrawnRouteRef.current) {
        routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
        lastDrawnRouteRef.current = null;
      }
    }
  })();
}, [selectedBus, buses, isFiltered]);

 


useEffect(() => {
 const socket = io("http://localhost:5000", { transports: ['websocket', 'polling'] });

  // helper: animate a marker between two positions over duration (ms)
 const animateMarker = (marker: mapboxgl.Marker | undefined, from: [number, number], to: [number, number], duration = 1000) => {
   if (!marker) return;
   let start = performance.now();
   const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const lng = from[0] + (to[0] - from[0]) * t;
      const lat = from[1] + (to[1] - from[1]) * t;
      marker.setLngLat([lng, lat]);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  socket.on("connect", () => console.debug('socket connected', socket.id));

  socket.on("bus-location-update", (payload: { busNumber: string; coordinates: [number, number]; ts?: string }) => {
    const { busNumber, coordinates, ts } = payload;
    setBuses(prev => {
      // locate previous bus record to get marker id and DB _id
      const prevBus = prev.find(b => b.busNumber === busNumber);
      const updated = prev.map(b => (b.busNumber === busNumber ? { ...b, coordinates, lastUpdated: ts ?? new Date().toISOString() } : b));

      // animate marker (if it exists) from its current screen pos to new coords
      if (prevBus) {
        const marker = busMarkersRef.current[prevBus._id];
        // derive 'from' position from marker if present otherwise from prevBus.coordinates
        const from: [number, number] = marker ? [marker.getLngLat().lng, marker.getLngLat().lat] : (prevBus.coordinates as [number, number]);
        const to: [number, number] = coordinates;
        if (marker) animateMarker(marker, from, to, 800); // 800ms smooth move
      }
      return updated;
    });

    setSelectedBus(prev => {
      if (!prev) return prev;
      if (prev.busNumber !== busNumber) return prev;
      const recent = Array.isArray((prev as any).recentLocations) ? (prev as any).recentLocations.slice(-49) : [];
      return { ...(prev as any), coordinates, lastUpdated: ts ?? new Date().toISOString(), recentLocations: [...recent, { coordinates, ts }] } as any;
    });
  });

  socket.on("bus-status-update", (payload: { busNumber: string; isActive: boolean; status: string; }) => {
    const { busNumber, isActive, status } = payload;
    setBuses(prev => prev.map(b => (b.busNumber === busNumber ? { ...b, isActive, status: status as BusData['status'] } : b)));
  });

  socket.on("connect_error", (err) => console.error('socket connect_error', err));
  socket.on('disconnect', reason => console.debug('socket disconnected', reason));

  return () => {
    socket.off("bus-location-update");
    socket.off("bus-status-update");
    socket.disconnect();
  };
 }, []);

  const displayBuses = selectedBus ? buses.filter(b => b._id === selectedBus._id) : buses;

  return (
    <>
      {/* <div className="absolute top-0 right-0 z-10 w-full max-w-md"> */}
        <div
    className="absolute top-0 right-0 w-full max-w-md"
    // ensure overlay sits above map and receives pointer events
    style={{ zIndex: 1100, pointerEvents: 'auto' }}>
        <Card>
          <CardContent className="p-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <Input
                value={searchSource}
                onChange={e => setSearchSource(e.target.value)}
               onFocus={() => { /* prevent accidental map interactions while typing */ }}
              tabIndex={0}
                placeholder="Source"
                aria-label="source"
                className="flex-1"
              />
              <Input
                value={searchDestination}
                onChange={e => setSearchDestination(e.target.value)}
                onFocus={() => { /* prevent accidental map interactions while typing */ }}
              tabIndex={0}
                placeholder="Destination"
                aria-label="destination"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  // focus source input after clearing for immediate editing
                  const firstInput = document.querySelector<HTMLInputElement>('input[aria-label="source"]');
                  firstInput?.focus();
                }}
                variant="ghost"
                size="icon"
                aria-label="Clear Search"
              > <X className="h-4 w-4" />
              </Button>
            </form>
            {searchError && <p className="mt-2 text-xs text-destructive">{searchError}</p>}
          </CardContent>
        </Card>
      </div>
  
      <div className="h-screen flex bg-background text-foreground">
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
          {showRouteInsights && (
          <aside
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 320,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              zIndex: 1000,
              padding: '12px 14px',
              fontSize: 13
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Route Insights</div>
              <button
                onClick={() => { setShowRouteInsights(false); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {routeSummary && (
              <div style={{ marginTop: 8, color: '#444' }}>
                <div style={{ fontSize: 13, color: '#222', fontWeight: 600 }}>
                  {selectedBus?.source?.name || 'Source'} → {selectedBus?.destination?.name || 'Destination'}
                </div>
                <div style={{ marginTop: 6, color: '#666', fontSize: 12 }}>
                  {routeSummary.distanceKm} km, {routeSummary.durationMin} min
                </div>
              </div>
            )}

            <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <ol style={{ paddingLeft: 14, margin: 0 }}>
              {routeSteps.length === 0 && <li style={{ color: '#777' }}>No steps available</li>}
              {routeSteps.map((s, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: '#111', fontSize: 13 }}>{s.instruction}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{Math.round(s.distance)} m</div>
                </li>
              ))}
            </ol>
          </aside>
          )}
          <style>{`
            .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-top-right { z-index: 5; }
            .bus-marker-wrapper { cursor: pointer; }
            .bus-marker-icon { 
              width: 32px; height: 32px;
              color: #007bff;
              filter: drop-shadow(0 0 3px rgba(0,0,0,0.5));
              transition: transform 0.2s ease-out;
            }
            .bus-marker-wrapper.selected .bus-marker-icon {
              transform: scale(1.8) rotate(var(--rotation, 0deg));
              color: #dc3545;
            }
            .stop-marker { 
              background-color: #fff; border: 2px solid #007bff;
              border-radius: 50%; width: 12px; height: 12px;
            }
            .stop-marker.past { border-color: #6c757d; background-color: #6c757d; }
          `}</style>
          {selectedBus && (
              <div className="absolute bottom-4 right-4 z-10">
                  <Button onClick={clearSelection} variant="secondary" className="gap-2 shadow-lg">
                      <XCircle className="h-4 w-4"/>
                      Show All Buses
                  </Button>
              </div>
          )}
        </div>
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bus className="h-5 w-5 text-primary" /> 
              {selectedBus ? `Tracking: ${selectedBus.busNumber}` : `Live Buses (${buses.length})`}
            </h2>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {displayBuses.map((bus) => {
              const allStops = [bus.source, ...bus.stops, bus.destination];
              return (
                <Card 
                  key={bus.busNumber} 
                  onClick={() => handleBusSelect(bus)} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${selectedBus?._id === bus._id ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-primary">{bus.busNumber}</div>
                      <Badge variant={bus.status === 'Delayed' ? 'destructive' : 'default'}>{bus.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">{bus.source.name} → {bus.destination.name}</div>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2"><Clock className="h-3 w-3" /><span>ETA to Destination: {bus.eta}</span></div>
                        <div className="flex items-center gap-2"><Users className="h-3 w-3" /><span>{bus.passengers}</span></div>
                        <div className="flex items-center gap-2"><Navigation className="h-3 w-3" /><span className="truncate">Next Stop: {bus.nextStop}</span></div>
                    </div>
                  </CardContent>

                  {selectedBus?._id === bus._id && (
                    <div className="px-3 pb-3 pt-1 border-t">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Route Details</h4>
                      <ul className="space-y-0">
                        {allStops.map((stop, index) => {
                          const isPast = bus.currentStopIndex > index;
                          const isCurrent = bus.currentStopIndex === index;
                          const isBetweenStops = isCurrent && !bus.isAtStop;
                          return (
                            <React.Fragment key={`${stop.name}-${index}`}>
                              <li className="flex items-start gap-3 text-sm py-2">
                                <div className="flex flex-col items-center">
                                  <div
                                    className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center mt-1", 
                                      isCurrent ? "border-primary" : "border-muted",
                                      isPast ? "bg-primary border-primary" : "bg-background"
                                    )}
                                  >
                                    {isCurrent && bus.isAtStop && <Circle className="h-1.5 w-1.5 fill-primary text-primary" />}
                                  </div>
                                  {index < allStops.length - 1 && <div className="w-px h-6 bg-border" />}
                                </div>
                                <div className="flex-1">
                                  <p className={cn("font-medium",
                                      isCurrent ? "text-primary" : "text-foreground",
                                      isPast ? "text-muted-foreground line-through" : ""
                                  )}>
                                    {stop.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                      {isCurrent && bus.isAtStop ? <span className="text-primary font-semibold">Currently at stop</span> : (isPast ? "Completed" : "Upcoming")}
                                  </p>
                                </div>
                              </li>
                              {isBetweenStops && index < allStops.length -1 && (
                                  <li className="relative h-8 ml-[6px]">
                                      <div className="absolute top-0 left-0 w-px h-full bg-border" />
                                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg animate-bounce">🚌</div>
                                      <div className="absolute top-1/2 -translate-y-1/2 left-8 text-xs text-muted-foreground italic">
                                          En route to {allStops[index + 1]?.name}...
                                      </div>
                                  </li>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </>
  );
}


