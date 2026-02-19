'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { LiveVehicle, SpeedingHotspot } from '@/types/fleet';
import {
  MapPin, Search, Loader2, X, Truck, Navigation, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';

declare global {
  interface Window { L: any; }
}

const riskColors: Record<string, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function MapPage() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [hotspots, setHotspots] = useState<SpeedingHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LiveVehicle | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showHotspots, setShowHotspots] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hotspotLayersRef = useRef<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [v, h] = await Promise.all([api.liveFleet(), api.hotspots()]);
      setVehicles(v);
      setHotspots(h);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  }, []);

  // Load Leaflet via CDN
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletReady(true);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([43.7, -79.4], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletReady]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletReady) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    vehicles.forEach((v) => {
      const color = v.isOnline ? riskColors[v.riskLevel] || '#6b7280' : '#6b7280';
      const radius = v.isDriving ? 8 : 6;
      const marker = L.circleMarker([v.latitude, v.longitude], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${v.name}</div>
          <div style="font-size:11px;color:#666;margin-bottom:6px">${v.driverName}</div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span><b>Speed:</b> ${v.speed} km/h</span>
            <span><b>Status:</b> ${v.isDriving ? 'Moving' : v.isOnline ? 'Idle' : 'Offline'}</span>
          </div>
          <div style="font-size:11px;margin-top:4px">
            <span style="color:${color};font-weight:600">Risk: ${v.riskLevel}</span>
            ${v.activeAlerts > 0 ? ` &middot; <span style="color:#ef4444">${v.activeAlerts} alerts</span>` : ''}
          </div>
        </div>
      `);

      marker.on('click', () => setSelected(v));
      markersRef.current.push(marker);
    });
  }, [vehicles, leafletReady]);

  // Hotspot overlay
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletReady) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    hotspotLayersRef.current.forEach((l) => map.removeLayer(l));
    hotspotLayersRef.current = [];

    if (showHotspots) {
      hotspots.forEach((h) => {
        const circle = L.circle([h.latitude, h.longitude], {
          radius: Math.max(2000, h.eventCount * 500),
          fillColor: '#ef4444',
          color: '#ef4444',
          weight: 1,
          opacity: 0.4,
          fillOpacity: 0.2,
        }).addTo(map);
        circle.bindPopup(`<b>${h.eventCount} speeding events</b><br/>Avg: ${h.avgSpeed} km/h`);
        hotspotLayersRef.current.push(circle);
      });
    }
  }, [showHotspots, hotspots, leafletReady]);

  // Load data
  useEffect(() => { load(); }, [load]);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const zoomTo = (v: LiveVehicle) => {
    setSelected(v);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([v.latitude, v.longitude], 12, { animate: true });
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      if (!v.name.toLowerCase().includes(q) && !v.driverName.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === 'moving') return v.isDriving;
    if (statusFilter === 'idle') return v.isOnline && !v.isDriving;
    if (statusFilter === 'offline') return !v.isOnline;
    return true;
  });

  const movingCount = vehicles.filter((v) => v.isDriving).length;
  const idleCount = vehicles.filter((v) => v.isOnline && !v.isDriving).length;
  const offlineCount = vehicles.filter((v) => !v.isOnline).length;

  return (
    <>
      <PageHeader title="Live Fleet Map" subtitle={`${vehicles.length} vehicles tracked`} onRefresh={load} />

      <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Side Panel */}
        <div className="w-[280px] border-r border-[#E5E2DC] bg-white flex flex-col flex-shrink-0">
          {/* Search */}
          <div className="p-3 border-b border-[#F0EDE7]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicles or drivers..."
                className="w-full bg-[#F5F3EF] border border-[#E5E2DC] rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-[#FBAF1A]"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 p-3 border-b border-[#F0EDE7]">
            {[
              { key: 'all', label: `All (${vehicles.length})` },
              { key: 'moving', label: `Moving (${movingCount})` },
              { key: 'idle', label: `Idle (${idleCount})` },
            ].map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  statusFilter === f.key ? 'bg-[#18202F] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{f.label}</button>
            ))}
          </div>

          {/* Hotspot toggle */}
          <div className="px-3 py-2 border-b border-[#F0EDE7]">
            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                showHotspots ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {showHotspots ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showHotspots ? 'Hide' : 'Show'} Speeding Hotspots
            </button>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : (
              filteredVehicles.map((v) => (
                <button key={v.id} onClick={() => zoomTo(v)}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 border-b border-gray-50 hover:bg-[#FFF8EB]/50 transition-colors text-left ${
                    selected?.id === v.id ? 'bg-[#FFF8EB] border-l-2 border-l-[#FBAF1A]' : ''
                  }`}>
                  <div className="relative">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white`}
                      style={{ backgroundColor: riskColors[v.riskLevel] || '#6b7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{v.name}</div>
                    <div className="text-xs text-gray-400 truncate">{v.driverName}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-gray-700">{v.speed} km/h</div>
                    <div className={`text-xs ${v.isDriving ? 'text-emerald-500' : v.isOnline ? 'text-amber-500' : 'text-gray-400'}`}>
                      {v.isDriving ? 'Moving' : v.isOnline ? 'Idle' : 'Offline'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          {!leafletReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="w-8 h-8 animate-spin text-[#FBAF1A]" />
            </div>
          )}

          {/* Selected Vehicle Detail */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-lg border border-[#E5E2DC] p-5 z-[1000]"
              >
                <button onClick={() => setSelected(null)} className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="text-lg font-bold text-gray-900">{selected.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">{selected.driverName}</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Speed</span>
                    <span className="font-medium">{selected.speed} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bearing</span>
                    <span className="font-medium">{selected.bearing}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${selected.isDriving ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selected.isDriving ? 'Moving' : selected.isOnline ? 'Idle' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk Level</span>
                    <span className="font-semibold" style={{ color: riskColors[selected.riskLevel] }}>
                      {selected.riskLevel}
                    </span>
                  </div>
                  {selected.activeAlerts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Active Alerts</span>
                      <span className="font-semibold text-red-600">{selected.activeAlerts}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Update</span>
                    <span className="text-xs">{new Date(selected.lastUpdate).toLocaleTimeString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
