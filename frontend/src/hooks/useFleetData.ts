'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { FleetOverview, InsuranceScore, DriverRisk, WellnessSummary } from '@/types/fleet';

interface FleetData {
  overview: FleetOverview | null;
  score: InsuranceScore | null;
  risks: DriverRisk[] | null;
  wellness: WellnessSummary | null;
  loading: boolean;
  error: string | null;
  geotabConfigured: boolean;
  refresh: () => void;
}

export function useFleetData(): FleetData {
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [score, setScore] = useState<InsuranceScore | null>(null);
  const [risks, setRisks] = useState<DriverRisk[] | null>(null);
  const [wellness, setWellness] = useState<WellnessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geotabConfigured, setGeotabConfigured] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, o, s, r, w] = await Promise.all([
        api.health(),
        api.fleetOverview(),
        api.insuranceScore(),
        api.driverRisks(),
        api.wellness(),
      ]);
      setGeotabConfigured(h.geotabConfigured);
      setOverview(o);
      setScore(s);
      setRisks(r);
      setWellness(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return { overview, score, risks, wellness, loading, error, geotabConfigured, refresh: loadData };
}
