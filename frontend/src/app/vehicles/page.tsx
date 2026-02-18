'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, Calendar, Gauge } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type { Vehicle } from '@/types/fleet';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    api.vehicles().then(setVehicles).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.licensePlate.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const stats = useMemo(() => {
    const totalOdometer = vehicles.reduce((s, v) => s + v.odometer, 0);
    const avgAge = vehicles.length > 0 ? Math.round(vehicles.reduce((s, v) => s + (2026 - v.year), 0) / vehicles.length * 10) / 10 : 0;
    const makes = new Set(vehicles.map((v) => v.make));
    return { total: vehicles.length, totalOdometer, avgAge, makes: makes.size };
  }, [vehicles]);

  if (loading) {
    return (
      <>
        <PageHeader title="Fleet Vehicles" subtitle="Loading vehicle data..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D3]" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Fleet Vehicles" subtitle={`${vehicles.length} vehicles in fleet`} onRefresh={loadData} />

      <div className="p-6 space-y-4 max-w-[1400px]">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Vehicles', value: stats.total, icon: Truck, iconBg: 'bg-blue-50', iconColor: 'text-[#0078D3]' },
            { label: 'Total Odometer', value: `${(stats.totalOdometer / 1000000).toFixed(1)}M km`, icon: Gauge, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
            { label: 'Avg Vehicle Age', value: `${stats.avgAge} yrs`, icon: Calendar, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
            { label: 'Makes', value: stats.makes, icon: Truck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide">{card.label}</span>
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', card.iconBg)}>
                    <Icon className={clsx('w-4 h-4', card.iconColor)} />
                  </div>
                </div>
                <div className="text-[2rem] font-extrabold text-gray-900">{card.value}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0078D3]"
            />
          </div>
        </div>

        {/* Vehicle grid */}
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#0078D3]" />
                </div>
                <div>
                  <div className="text-[0.88rem] font-semibold text-gray-800">{v.name}</div>
                  <div className="text-[0.65rem] text-gray-400">{v.licensePlate}</div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Make/Model', value: `${v.year} ${v.make} ${v.model}` },
                  { label: 'Type', value: v.type },
                  { label: 'VIN', value: v.vin.slice(0, 11) + '...' },
                  { label: 'Odometer', value: `${v.odometer.toLocaleString()} km` },
                  { label: 'Active Since', value: new Date(v.activeFrom).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-[0.72rem]">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="font-medium text-gray-700">{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
