'use client';

import { useCallback } from 'react';
import { useFleetData } from '@/hooks/useFleetData';
import PageHeader from '@/components/layout/PageHeader';
import KPICards from '@/components/dashboard/KPICards';
import ScoreCard from '@/components/dashboard/ScoreCard';
import DriverTable from '@/components/dashboard/DriverTable';
import WellnessCard from '@/components/dashboard/WellnessCard';
import FinancialCard from '@/components/dashboard/FinancialCard';
import AceInsights from '@/components/dashboard/AceInsights';
import { Shield, Loader2, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { overview, score, risks, wellness, loading, error, refresh } = useFleetData();
  const router = useRouter();

  const handleGenerateReport = useCallback(() => {
    window.open('/api/reports/latest', '_blank');
  }, []);

  const handleDriverClick = useCallback((driverId: string) => {
    router.push(`/operator/drivers/${driverId}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Loading fleet data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-500 mb-4">
            Could not connect to the FleetShield API. Make sure the backend server is running on port 3000.
          </p>
          <button onClick={refresh} className="px-4 py-2 bg-[#18202F] text-white rounded-xl text-sm font-medium hover:bg-[#2D3748] transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!overview || !score || !risks || !wellness) return null;

  return (
    <>
      <PageHeader
        title="Fleet Dashboard"
        subtitle="Real-time fleet risk intelligence"
        onRefresh={refresh}
        actions={
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-xl text-sm font-medium bg-[#18202F] text-white hover:bg-[#2D3748] transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Generate Report
          </button>
        }
      />

      <div className="p-8 space-y-8 max-w-[1520px]">
        <KPICards overview={overview} score={score} />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <ScoreCard score={score} />
          </div>
          <div className="col-span-7">
            <DriverTable risks={risks} onDriverClick={handleDriverClick} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <WellnessCard wellness={wellness} onDriverClick={handleDriverClick} />
          </div>
          <div className="col-span-7">
            <FinancialCard
              score={score}
              wellness={wellness}
              risks={risks}
              onGenerateReport={handleGenerateReport}
            />
          </div>
        </div>

        {/* Geotab Ace AI Insights */}
        <AceInsights />
      </div>
    </>
  );
}
