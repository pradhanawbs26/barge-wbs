import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Fuel,
  Gauge,
  Layers,
  Timer,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { BargeRecord, EfficiencyRecord } from '../types';

interface EquipmentEfficiencyViewProps {
  efficiencyRecords: EfficiencyRecord[];
  barges: BargeRecord[];
}

type Granularity = 'Daily' | 'Weekly' | 'Monthly';

export const EquipmentEfficiencyView: React.FC<EquipmentEfficiencyViewProps> = ({
  efficiencyRecords,
  barges,
}) => {
  const [granularity, setGranularity] = useState<Granularity>('Daily');

  // Aggregate series based on selected granularity (Daily, Weekly, Monthly)
  const aggregatedSeries = useMemo(() => {
    if (granularity === 'Daily') {
      return efficiencyRecords.map((r) => ({
        label: r.dateStr.replace('-2026', ''),
        tonnage: r.tonnageLoaded,
        fuelPlan: r.loadingFuelRatioPlan,
        fuelActual: r.loadingFuelRatioActual,
        hmPlan: r.loadingHmRatioPlan,
        hmActual: r.loadingHmRatioActual,
        isAnomaly: r.isAnomaly,
      }));
    }

    if (granularity === 'Weekly') {
      const groups = new Map<string, EfficiencyRecord[]>();
      for (const r of efficiencyRecords) {
        const list = groups.get(r.weekLabel) || [];
        list.push(r);
        groups.set(r.weekLabel, list);
      }
      return Array.from(groups.entries()).map(([week, list]) => {
        const avgFuel = list.reduce((s, x) => s + x.loadingFuelRatioActual, 0) / list.length;
        const avgHm = list.reduce((s, x) => s + x.loadingHmRatioActual, 0) / list.length;
        const totalTon = list.reduce((s, x) => s + x.tonnageLoaded, 0);
        return {
          label: `${week} (Okt 26)`,
          tonnage: totalTon,
          fuelPlan: 33.68,
          fuelActual: Number(avgFuel.toFixed(2)),
          hmPlan: 2.89,
          hmActual: Number(avgHm.toFixed(2)),
          isAnomaly: avgFuel > 33.68,
        };
      });
    }

    // Monthly 2026 summary combining barge monthly history + Rasio CY
    const months = [
      { label: 'Apr 26', tonnage: 522040, fuelPlan: 33.68, fuelActual: 32.15, hmPlan: 2.89, hmActual: 2.68, isAnomaly: false },
      { label: 'Mei 26', tonnage: 642580, fuelPlan: 33.68, fuelActual: 31.4, hmPlan: 2.89, hmActual: 2.54, isAnomaly: false },
      { label: 'Jun 26', tonnage: 650940, fuelPlan: 33.68, fuelActual: 30.85, hmPlan: 2.89, hmActual: 2.49, isAnomaly: false },
      { label: 'Jul 26', tonnage: 514972, fuelPlan: 33.68, fuelActual: 33.92, hmPlan: 2.89, hmActual: 2.91, isAnomaly: true },
      { label: 'Agu 26', tonnage: 613080, fuelPlan: 33.68, fuelActual: 32.75, hmPlan: 2.89, hmActual: 2.74, isAnomaly: false },
      { label: 'Sep 26', tonnage: 558311, fuelPlan: 33.68, fuelActual: 34.85, hmPlan: 2.89, hmActual: 3.04, isAnomaly: true },
      {
        label: 'Okt 26',
        tonnage: efficiencyRecords.reduce((s, x) => s + x.tonnageLoaded, 0) || 515871,
        fuelPlan: 33.68,
        fuelActual: Number(
          (
            efficiencyRecords.reduce((s, x) => s + x.loadingFuelRatioActual, 0) /
            Math.max(efficiencyRecords.length, 1)
          ).toFixed(2)
        ),
        hmPlan: 2.89,
        hmActual: Number(
          (
            efficiencyRecords.reduce((s, x) => s + x.loadingHmRatioActual, 0) /
            Math.max(efficiencyRecords.length, 1)
          ).toFixed(2)
        ),
        isAnomaly: false,
      },
    ];
    return months;
  }, [efficiencyRecords, granularity]);

  // Contribution of "Loading to Barge" vs Total Port Operation (5 Activities)
  const operationShareData = useMemo(() => {
    const count = Math.max(efficiencyRecords.length, 1);
    const avgUnloadingFuel = efficiencyRecords.reduce((s, r) => s + r.unloadingCyFuelActual, 0) / count;
    const avgHaulingFuel = efficiencyRecords.reduce((s, r) => s + r.coalHaulingFuelActual, 0) / count;
    const avgStockpileFuel = efficiencyRecords.reduce((s, r) => s + r.stockpileFuelActual, 0) / count;
    const avgMovingFuel = efficiencyRecords.reduce((s, r) => s + r.movingCargoFuelActual, 0) / count;
    const avgLoadingFuel = efficiencyRecords.reduce((s, r) => s + r.loadingFuelRatioActual, 0) / count;

    const avgUnloadingHm = efficiencyRecords.reduce((s, r) => s + r.unloadingCyHmActual, 0) / count;
    const avgHaulingHm = efficiencyRecords.reduce((s, r) => s + r.coalHaulingHmActual, 0) / count;
    const avgStockpileHm = efficiencyRecords.reduce((s, r) => s + r.stockpileHmActual, 0) / count;
    const avgMovingHm = efficiencyRecords.reduce((s, r) => s + r.movingCargoHmActual, 0) / count;
    const avgLoadingHm = efficiencyRecords.reduce((s, r) => s + r.loadingHmRatioActual, 0) / count;

    const totalFuel = avgUnloadingFuel + avgHaulingFuel + avgStockpileFuel + avgMovingFuel + avgLoadingFuel || 1;
    const totalHm = avgUnloadingHm + avgHaulingHm + avgStockpileHm + avgMovingHm + avgLoadingHm || 1;

    return [
      {
        activity: 'Coal Hauling',
        fuelRatio: Number(avgHaulingFuel.toFixed(2)),
        fuelSharePct: Number(((avgHaulingFuel / totalFuel) * 100).toFixed(1)),
        hmRatio: Number(avgHaulingHm.toFixed(2)),
        hmSharePct: Number(((avgHaulingHm / totalHm) * 100).toFixed(1)),
        isFocus: false,
      },
      {
        activity: 'Moving Cargo',
        fuelRatio: Number(avgMovingFuel.toFixed(2)),
        fuelSharePct: Number(((avgMovingFuel / totalFuel) * 100).toFixed(1)),
        hmRatio: Number(avgMovingHm.toFixed(2)),
        hmSharePct: Number(((avgMovingHm / totalHm) * 100).toFixed(1)),
        isFocus: false,
      },
      {
        activity: 'Loading to Barge (FOKUS)',
        fuelRatio: Number(avgLoadingFuel.toFixed(2)),
        fuelSharePct: Number(((avgLoadingFuel / totalFuel) * 100).toFixed(1)),
        hmRatio: Number(avgLoadingHm.toFixed(2)),
        hmSharePct: Number(((avgLoadingHm / totalHm) * 100).toFixed(1)),
        isFocus: true,
      },
      {
        activity: 'Stockpile Handling',
        fuelRatio: Number(avgStockpileFuel.toFixed(2)),
        fuelSharePct: Number(((avgStockpileFuel / totalFuel) * 100).toFixed(1)),
        hmRatio: Number(avgStockpileHm.toFixed(2)),
        hmSharePct: Number(((avgStockpileHm / totalHm) * 100).toFixed(1)),
        isFocus: false,
      },
      {
        activity: 'Unloading CY',
        fuelRatio: Number(avgUnloadingFuel.toFixed(2)),
        fuelSharePct: Number(((avgUnloadingFuel / totalFuel) * 100).toFixed(1)),
        hmRatio: Number(avgUnloadingHm.toFixed(2)),
        hmSharePct: Number(((avgUnloadingHm / totalHm) * 100).toFixed(1)),
        isFocus: false,
      },
    ];
  }, [efficiencyRecords]);

  const avgLoadingFuelActual =
    efficiencyRecords.length > 0
      ? efficiencyRecords.reduce((s, r) => s + r.loadingFuelRatioActual, 0) / efficiencyRecords.length
      : 31.83;
  const avgLoadingHmActual =
    efficiencyRecords.length > 0
      ? efficiencyRecords.reduce((s, r) => s + r.loadingHmRatioActual, 0) / efficiencyRecords.length
      : 2.58;
  const anomalyDays = efficiencyRecords.filter((r) => r.isAnomaly);
  const loadingFocusItem = operationShareData.find((d) => d.isFocus);

  return (
    <div className="space-y-6">
      {/* Header & Granularity Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-50 mt-1">
            Analisis Efisiensi BBM (Fuel Ratio) &amp; Jam Kerja Alat (HM Ratio) — Loading to Barge
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start lg:self-auto">
          {(['Daily', 'Weekly', 'Monthly'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                granularity === g
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Tren {g}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Efficiency KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Avg Fuel Ratio Loading to Barge</span>
            <Fuel className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-50 mt-2">
            {avgLoadingFuelActual.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">Index L/KT ( ~0,031 L/Ton )</span>
          </div>
          <div className="text-xs mt-2 flex items-center justify-between">
            <span className="text-slate-400">Plan Baku: 33,68</span>
            <span
              className={`font-mono-num font-semibold ${
                avgLoadingFuelActual <= 33.68 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {avgLoadingFuelActual <= 33.68 ? 'Efisien (-' : 'Boros (+'}
              {Math.abs(avgLoadingFuelActual - 33.68).toFixed(2)})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Avg HM Ratio Loading to Barge</span>
            <Timer className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-50 mt-2">
            {avgLoadingHmActual.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">HM Index ( ~0,0026 HM/Ton )</span>
          </div>
          <div className="text-xs mt-2 flex items-center justify-between">
            <span className="text-slate-400">Plan Baku: 2,89</span>
            <span
              className={`font-mono-num font-semibold ${
                avgLoadingHmActual <= 2.89 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {avgLoadingHmActual <= 2.89 ? 'Optimal (-' : 'Over HM (+'}
              {Math.abs(avgLoadingHmActual - 2.89).toFixed(2)})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Deteksi Hari Anomali (Idle Running)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-amber-400 mt-2">
            {anomalyDays.length} <span className="text-xs font-normal text-slate-400">Hari Terdeteksi</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Kondisi HM &amp; BBM tinggi namun tonase muat tongkang rendah
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Porsi Loading to Barge vs Total Operasi</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-sky-400 mt-2">
            {loadingFocusItem ? loadingFocusItem.fuelSharePct : 7.8}%{' '}
            <span className="text-xs font-normal text-slate-400">Total BBM Pelabuhan</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Kontribusi HM Alat:{' '}
            <strong className="font-mono-num text-slate-200">
              {loadingFocusItem ? loadingFocusItem.hmSharePct : 5.4}%
            </strong>{' '}
            dari 5 Aktivitas
          </div>
        </div>
      </div>

      {/* ROW 1 CHARTS: a) Tren Fuel Ratio & b) Tren HM Ratio Loading to Barge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Tren Fuel Ratio Loading to Barge */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                a) Tren Fuel Ratio &ldquo;Loading to Barge&rdquo; ({granularity})
              </h3>
              <p className="text-xs text-slate-400">
                Konsumsi BBM spesifik aktivitas pemuatan tongkang terhadap batas Plan (33,68)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregatedSeries} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 45]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine
                  y={33.68}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Plan Fuel Ratio (33,68)',
                    position: 'insideTopRight',
                    fill: '#FBBF24',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="fuelActual" name="Actual Fuel Ratio (Loading to Barge)" barSize={20} radius={[3, 3, 0, 0]}>
                  {aggregatedSeries.map((entry, idx) => (
                    <Cell
                      key={`fcell-${idx}`}
                      fill={entry.fuelActual <= entry.fuelPlan ? '#0EA5E9' : '#EF4444'}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="fuelPlan"
                  name="Plan Target"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Tren HM Ratio Loading to Barge */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                b) Tren HM Ratio &ldquo;Loading to Barge&rdquo; ({granularity})
              </h3>
              <p className="text-xs text-slate-400">
                Rasio Hour Meter (HM) alat muat &amp; support terhadap tonase muat (Target Plan: 2,89)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregatedSeries} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 4.2]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine
                  y={2.89}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Plan HM Ratio (2,89)',
                    position: 'insideTopRight',
                    fill: '#34D399',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="hmActual" name="Actual HM Ratio (Loading to Barge)" barSize={20} radius={[3, 3, 0, 0]}>
                  {aggregatedSeries.map((entry, idx) => (
                    <Cell
                      key={`hmcell-${idx}`}
                      fill={entry.hmActual <= entry.hmPlan ? '#10B981' : '#F59E0B'}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="hmPlan"
                  name="Plan HM Target"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 2: c) Combo / Anomaly Chart (Tonase vs BBM & HM) & d) Kontribusi Terhadap Total Operation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart C: Tonase Muat vs Konsumsi BBM & Jam Alat (Deteksi Idle Running) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              c) Deteksi Anomali: Tonase Muat Tongkang vs Konsumsi BBM (Fuel) &amp; Jam Alat (HM)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menyandingkan volume muat harian dengan rasio BBM &amp; HM untuk menangkap insiden <em>idle running</em> (mesin menyala namun muatan tersendat).
            </p>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={efficiencyRecords} margin={{ top: 10, right: 15, left: 5, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="dateStr"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v: string) => v.replace('-2026', '')}
                />
                <YAxis
                  yAxisId="ton"
                  stroke="#94A3B8"
                  fontSize={11}
                  unit=" T"
                />
                <YAxis
                  yAxisId="ratio"
                  orientation="right"
                  stroke="#F59E0B"
                  fontSize={11}
                  domain={[0, 45]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  yAxisId="ton"
                  dataKey="tonnageLoaded"
                  name="Tonase Muat ke Tongkang (MT)"
                  fill="#1E293B"
                  stroke="#38BDF8"
                  strokeWidth={1}
                  barSize={18}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="loadingFuelRatioActual"
                  name="Fuel Ratio Loading to Barge"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="loadingHmRatioActual"
                  name="HM Ratio Loading to Barge"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {anomalyDays.length > 0 && (
            <div className="mt-3 p-3 bg-slate-950 border border-rose-500/30 rounded text-xs text-slate-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-400">Temuan Anomali Idle Running: </span>
                {anomalyDays[0].anomalyReason}
              </div>
            </div>
          )}
        </div>

        {/* Chart D: Perbandingan Kontribusi Loading to Barge terhadap Total Operation (5 Aktivitas) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              d) Kontribusi &ldquo;Loading to Barge&rdquo; vs Total Operation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Perbandingan Fuel Ratio &amp; HM Ratio di 5 aktivitas utama (Unloading CY, Coal Hauling, Stockpile, Moving Cargo, Loading to Barge).
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {operationShareData.map((item) => (
              <div
                key={item.activity}
                className={`p-3 rounded-lg border text-xs ${
                  item.isFocus
                    ? 'bg-sky-950/30 border-sky-500/50'
                    : 'bg-slate-950 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className={item.isFocus ? 'text-sky-300 font-bold' : 'text-slate-200'}>
                    {item.activity}
                  </span>
                  <span className="font-mono-num text-slate-300">
                    BBM: <strong className="text-slate-100">{item.fuelRatio}</strong> ({item.fuelSharePct}%) · HM:{' '}
                    <strong className="text-slate-100">{item.hmRatio}</strong> ({item.hmSharePct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2 flex">
                  <div
                    className={item.isFocus ? 'bg-sky-400 h-full' : 'bg-slate-500 h-full'}
                    style={{ width: `${Math.min(100, Math.max(4, item.fuelSharePct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            Meskipun <strong className="text-slate-200">Coal Hauling</strong> menyerap porsi BBM terbesar secara total, efisiensi <strong className="text-sky-400">Loading to Barge</strong> sangat krusial karena menentukan kecepatan pelepasan tongkang (demurrage control).
          </div>
        </div>
      </div>
    </div>
  );
};
