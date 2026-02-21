'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, ChevronDown, ChevronUp, Check, X, AlertTriangle, Clock } from 'lucide-react';
import type { ActionItem, DriverTrainingProgram } from '@/types/fleet';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function tierColor(tier?: string) {
  switch (tier) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

interface TrainingTabProps {
  programs: DriverTrainingProgram[];
  actionItems: ActionItem[];
  allActionItems: ActionItem[];
  onCompleteAction: (actionId: string) => void;
  onDismissAction: (actionId: string) => void;
}

export function TrainingTab({ programs, actionItems, allActionItems, onCompleteAction, onDismissAction }: TrainingTabProps) {
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const completedItems = allActionItems.filter(a => a.status === 'completed');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Training Programs from Missions */}
      {programs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#FBAF1A]" />
            Training Programs
          </h3>
          <div className="space-y-3">
            {programs.map((prog) => {
              const isExpanded = expandedProgram === prog.missionId;
              return (
                <motion.div
                  key={prog.missionId}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-[#18202F] rounded-2xl border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedProgram(isExpanded ? null : prog.missionId)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          prog.missionType === 'coaching_sweep' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}>
                          {prog.source}
                        </span>
                        {prog.tier && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${tierColor(prog.tier)}`}>
                            {prog.tier} risk
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 ml-auto">{timeAgo(prog.completedAt)}</span>
                      </div>
                      <div className="text-sm font-medium text-white mt-1.5">
                        {prog.coachingActions.length} coaching actions assigned
                      </div>
                      {prog.topIssues && prog.topIssues.length > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Top issues: {prog.topIssues.map(i => i.type).join(', ')}
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-500 mt-1" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                          {/* Risk context */}
                          {prog.riskScore !== undefined && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500">Risk Score:</span>
                              <span className={`font-bold ${prog.riskScore >= 70 ? 'text-red-400' : prog.riskScore >= 50 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                {prog.riskScore}/100
                              </span>
                              {prog.wellnessScore !== undefined && (
                                <>
                                  <span className="text-gray-600">|</span>
                                  <span className="text-gray-500">Wellness:</span>
                                  <span className="font-bold text-gray-300">{prog.wellnessScore}/100</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Coaching actions */}
                          <div className="space-y-2">
                            {prog.coachingActions.map((action, i) => {
                              const matchingItem = actionItems.find(a => a.text === action && a.missionId === prog.missionId);
                              const isComplete = !matchingItem; // Already completed/dismissed
                              return (
                                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${isComplete ? 'bg-emerald-500/5' : 'bg-[#0F1520]'}`}>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isComplete ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                                  }`}>
                                    {isComplete && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-xs leading-relaxed flex-1 ${isComplete ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                    {action}
                                  </span>
                                  {matchingItem && (
                                    <button
                                      onClick={() => onCompleteAction(matchingItem.id)}
                                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex-shrink-0"
                                    >
                                      Done
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Timeline */}
                          {prog.timeline.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Timeline
                              </div>
                              {prog.timeline.map((t, i) => (
                                <div key={i} className="text-xs text-gray-400 pl-4 border-l border-white/5">{t}</div>
                              ))}
                            </div>
                          )}

                          {/* Expected improvement & savings */}
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-emerald-400">{prog.expectedImprovement}</span>
                            {prog.estimatedSavings && (
                              <span className="text-[#FBAF1A]">{prog.estimatedSavings}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Action Items */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Pending Actions
          {actionItems.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{actionItems.length}</span>
          )}
        </h3>
        {actionItems.length === 0 ? (
          <div className="bg-[#18202F] rounded-2xl border border-white/10 p-6 text-center">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actionItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-[#18202F] rounded-xl border border-white/10 px-4 py-3 flex items-start gap-3"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  item.priority === 'urgent' ? 'bg-red-500' :
                  item.priority === 'high' ? 'bg-orange-400' :
                  item.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 leading-relaxed">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.category === 'coaching' ? 'bg-blue-500/20 text-blue-400' :
                      item.category === 'wellness' ? 'bg-green-500/20 text-green-400' :
                      item.category === 'safety' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onCompleteAction(item.id)}
                    className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button onClick={() => onDismissAction(item.id)}
                    className="w-8 h-8 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Completed ({completedItems.length})</h3>
          <div className="space-y-1">
            {completedItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
                <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="line-through">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
