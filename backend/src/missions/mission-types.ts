/**
 * Mission Agent System - Type definitions and metadata.
 * Autonomous background missions that Tasha can deploy for deep fleet analysis.
 */

export type MissionType =
  | 'coaching_sweep'
  | 'wellness_check'
  | 'safety_investigation'
  | 'insurance_optimization'
  | 'preshift_sweep';

export type MissionPhase =
  | 'queued'
  | 'starting'
  | 'running'
  | 'summarizing'
  | 'complete'
  | 'failed'
  | 'cancelled';

export interface MissionConfig {
  type: MissionType;
  params?: {
    topN?: number;
    driverId?: string;
    driverName?: string;
  };
  sessionId?: string;
}

export interface MissionProgress {
  missionId: string;
  type: MissionType;
  phase: MissionPhase;
  step: number;
  totalSteps: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface MissionFinding {
  missionId: string;
  category: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, unknown>;
}

export interface MissionResult {
  missionId: string;
  type: MissionType;
  status: 'complete' | 'failed' | 'cancelled';
  displayName: string;
  summary: string;
  findings: MissionFinding[];
  recommendations: string[];
  duration: number;
  data: Record<string, unknown>;
  completedAt: string;
  error?: string;
}

export interface MissionMeta {
  displayName: string;
  description: string;
  estimatedSeconds: number;
  icon: string;
}

export const MISSION_META: Record<MissionType, MissionMeta> = {
  coaching_sweep: {
    displayName: 'Coaching Sweep',
    description: 'Analyze top riskiest drivers, generate personalized coaching plans with risk scores and wellness data',
    estimatedSeconds: 6,
    icon: 'GraduationCap',
  },
  wellness_check: {
    displayName: 'Wellness Check',
    description: 'Scan all drivers for burnout signals, flag high-risk individuals, estimate retention costs',
    estimatedSeconds: 5,
    icon: 'Heart',
  },
  safety_investigation: {
    displayName: 'Safety Investigation',
    description: 'Deep-dive a driver\'s safety events, patterns, and root causes with pre-shift risk assessment',
    estimatedSeconds: 4,
    icon: 'Search',
  },
  insurance_optimization: {
    displayName: 'Insurance Optimization',
    description: 'Analyze score components, find quick wins, estimate potential premium savings',
    estimatedSeconds: 5,
    icon: 'Shield',
  },
  preshift_sweep: {
    displayName: 'Pre-Shift Sweep',
    description: 'Pre-shift risk assessment for all drivers, flag high-risk shifts for today',
    estimatedSeconds: 5,
    icon: 'Sunrise',
  },
};
