'use client';

import { motion } from 'framer-motion';
import { Package, MapPin, ArrowRight, Clock, Phone, Mic, MessageCircle, Loader2 } from 'lucide-react';
import type { DriverSession, DispatchMessage } from '@/types/fleet';

interface LoadTabProps {
  session: DriverSession;
  onCallDispatch: (intent: string) => void;
  onAskTasha: (msg: string) => void;
}

const dispatchIntents = [
  { label: 'ETA update', intent: 'I need an ETA update for my current load' },
  { label: 'Report issue', intent: 'I need to report an issue with my current load' },
  { label: 'Route info', intent: 'I need route information and directions for my delivery' },
  { label: 'Load change', intent: 'I need to request a change to my current load assignment' },
];

function statusColor(status: string) {
  switch (status) {
    case 'assigned': return 'bg-blue-500/20 text-blue-400';
    case 'en_route': return 'bg-amber-500/20 text-amber-400';
    case 'at_pickup': return 'bg-purple-500/20 text-purple-400';
    case 'loaded': return 'bg-emerald-500/20 text-emerald-400';
    case 'in_transit': return 'bg-cyan-500/20 text-cyan-400';
    case 'at_delivery': return 'bg-green-500/20 text-green-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export function LoadTab({ session, onCallDispatch, onAskTasha }: LoadTabProps) {
  const load = session.currentLoad;
  const messages = session.recentMessages || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {load ? (
        <>
          {/* Load Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#FBAF1A]" />
                <span className="text-lg font-bold text-white">{load.id}</span>
              </div>
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${statusColor(load.status)}`}>
                {load.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Route */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />
                  <div className="w-0.5 h-8 bg-white/10" />
                  <div className="w-3 h-3 rounded-full border-2 border-red-400 bg-red-400/20" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="text-sm font-medium text-white">{load.origin.city}, {load.origin.state}</div>
                    <div className="text-xs text-gray-500">{load.origin.address}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Pickup: {new Date(load.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{load.destination.city}, {load.destination.state}</div>
                    <div className="text-xs text-gray-500">{load.destination.address}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Delivery: {new Date(load.deliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0F1520] rounded-xl p-3">
                <div className="text-gray-500">Commodity</div>
                <div className="text-white font-medium mt-0.5">{load.commodity}</div>
              </div>
              <div className="bg-[#0F1520] rounded-xl p-3">
                <div className="text-gray-500">Weight</div>
                <div className="text-white font-medium mt-0.5">{load.weight.toLocaleString()} lbs</div>
              </div>
              <div className="bg-[#0F1520] rounded-xl p-3">
                <div className="text-gray-500">Distance</div>
                <div className="text-white font-medium mt-0.5">{load.distance} km</div>
              </div>
              <div className="bg-[#0F1520] rounded-xl p-3">
                <div className="text-gray-500">Rate</div>
                <div className="text-[#FBAF1A] font-bold mt-0.5">${load.rate.toLocaleString()}</div>
              </div>
            </div>

            {/* Broker */}
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Phone className="w-3 h-3" />
              <span>{load.broker.name} &middot; {load.broker.phone}</span>
            </div>

            {/* Notes */}
            {load.notes && (
              <div className="mt-3 text-xs text-gray-400 bg-[#0F1520] rounded-xl p-3 italic">
                {load.notes}
              </div>
            )}
          </motion.div>

          {/* Dispatch Actions */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-[#FBAF1A]" />
              <span className="text-sm font-semibold">Quick Dispatch</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {dispatchIntents.map((d) => (
                <button
                  key={d.label}
                  onClick={() => onCallDispatch(d.intent)}
                  className="px-3 py-2.5 rounded-xl bg-[#0F1520] border border-white/5 text-xs text-gray-400 hover:border-[#FBAF1A]/30 hover:text-[#FBAF1A] transition-all text-left"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => onCallDispatch('General check-in with dispatch about my current status')}
              className="w-full mt-3 py-3 rounded-xl bg-[#FBAF1A]/10 border border-[#FBAF1A]/20 text-[#FBAF1A] text-sm font-medium hover:bg-[#FBAF1A]/20 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Call Dispatch
            </button>
          </motion.div>

          {/* Recent Messages */}
          {messages.length > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
            >
              <h3 className="text-sm font-semibold mb-3">Recent Messages</h3>
              <div className="space-y-2">
                {messages.slice(0, 5).map((m) => (
                  <div key={m.id} className={`text-xs p-3 rounded-xl ${
                    m.from === 'dispatch' ? 'bg-blue-500/10 border border-blue-500/10' :
                    m.from === 'system' ? 'bg-gray-500/10 border border-gray-500/10' :
                    'bg-emerald-500/10 border border-emerald-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold uppercase ${
                        m.from === 'dispatch' ? 'text-blue-400' :
                        m.from === 'system' ? 'text-gray-500' : 'text-emerald-400'
                      }`}>{m.from}</span>
                      <span className="text-[10px] text-gray-600">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      ) : (
        /* No Load State */
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-8 text-center"
        >
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">No Load Assigned</h3>
          <p className="text-sm text-gray-500 mb-4">You don&apos;t have an active load right now.</p>
          <button
            onClick={() => onAskTasha('Check with dispatch if there are any loads available for me')}
            className="px-6 py-3 rounded-xl bg-[#FBAF1A] text-[#18202F] text-sm font-semibold hover:bg-[#BF7408] transition-colors inline-flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Ask Tasha
          </button>
        </motion.div>
      )}
    </div>
  );
}
