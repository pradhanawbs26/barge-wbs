import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Clock,
  CloudRain,
  Filter,
  Gauge,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BargeRecord } from '../types';

interface TurnaroundAnatomyViewProps {
  barges: BargeRecord[];
}

export const TurnaroundAnatomyView: React.FC<TurnaroundAnatomyViewProps> = ({ barges }) => {
  // Automatically display TOP 10 or fewer depending on actual barge count in the filtered period
  const sortedByWorstTat = useMemo(() => {
    const topLimit = Math.min(10, barges.length);
    return [...barges]
      .sort((a, b) => b.totalTurnaroundHours - a.totalTurnaroundHours)
      .slice(0, topLimit)
      .map((b) => ({
        label: `${b.bargeName} (#${b.noBarge})`,
        shortName: b.bargeName,
        tugBoat: b.tugBoat,
        dateStr: b.dateStr,
        tonnage: b.tonnage,
        effectiveLoadingHours: b.effectiveLoadingHours,
        standbyHours: b.standbyHours,
        breakdownHours: b.breakdownHours,
        weatherExternalHours: b.weatherExternalHours,
        totalTurnaroundHours: b.totalTurnaroundHours,
        grossRateTph: b.grossRateTph,
        effectiveRateTph: b.effectiveRateTph,
      }));
  }, [barges]);

  // Pareto Bottleneck calculation across all filtered 2026 barges from BASE/BASE2
  const paretoData = useMemo(() => {
    let waitingCargo = 0;
    let berthingSurvey = 0;
    let breakdown = 0;
    let weatherRain = 0;
    let shiftRest = 0;
    let externalTidal = 0;

    for (const b of barges) {
      waitingCargo += b.delayCauses.waitingCargoStockpile;
      berthingSurvey += b.delayCauses.berthingDraftSurvey;
      breakdown += b.delayCauses.equipmentBreakdown;
      weatherRain += b.delayCauses.heavyRainWeather;
      shiftRest += b.delayCauses.shiftRestP5M;
      externalTidal += b.delayCauses.tugboatExternalTidal;
    }

    const rawItems = [
      {
        cause: 'Tunggu Muatan / Moving Cargo Stockpile',
        category: 'Operational Standby (Kuning)',
        hours: Number(waitingCargo.toFixed(1)),
        color: '#EAB308',
      },
      {
        cause: 'Berthing, Cast-In/Off & Draft Survey',
        category: 'Operational Standby (Kuning)',
        hours: Number(berthingSurvey.toFixed(1)),
        color: '#F59E0B',
      },
      {
        cause: 'Kerusakan Alat (BLC, Conveyor, Loader, Dozer)',
        category: 'Equipment Breakdown (Merah)',
        hours: Number(breakdown.toFixed(1)),
        color: '#EF4444',
      },
      {
        cause: 'Cuaca Hujan / Wet Coal Stoppage',
        category: 'External / Weather Delay (Biru)',
        hours: Number(weatherRain.toFixed(1)),
        color: '#3B82F6',
      },
      {
        cause: 'Change Shift, Rest Time & P5M/Safety Talk',
        category: 'Operational Standby (Kuning)',
        hours: Number(shiftRest.toFixed(1)),
        color: '#FBBF24',
      },
      {
        cause: 'Tunggu Pasang Surut (Tidal) & Assist Tugboat',
        category: 'External / Weather Delay (Biru)',
        hours: Number(externalTidal.toFixed(1)),
        color: '#60A5FA',
      },
    ].sort((a, b) => b.hours - a.hours);

    const totalLostHours = rawItems.reduce((s, item) => s + item.hours, 0) || 1;
    let cumulative = 0;
    return rawItems.map((item, idx) => {
      cumulative += item.hours;
      return {
        ...item,
        rank: idx + 1,
        sharePct: Number(((item.hours / totalLostHours) * 100).toFixed(1)),
        cumulativePct: Number(((cumulative / totalLostHours) * 100).toFixed(1)),
      };
    });
  }, [barges]);

  const avgTat =
    barges.length > 0
      ? barges.reduce((s, b) => s + b.totalTurnaroundHours, 0) / barges.length
      : 0;
  const avgEffectiveHours =
    barges.length > 0
      ? barges.reduce((s, b) => s + b.effectiveLoadingHours, 0) / barges.length
      : 0;
  const avgLostHours = Math.max(0, avgTat - avgEffectiveHours);
  const topBottleneck = paretoData[0];

  return (
    <div className="space-y-6">
      {/* Header with Title and Subheader */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-xl font-bold text-slate-50 mt-1">
          Turnaround Time &amp; Delay Barge
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Review pencapaian waktu gross loading time atau berth occupancy time serta faktor delay yang mempengaruhinya.
        </p>
      </div>

      {/* 4 Summary Anatomy Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Rata-Rata Total Jam Sandar (Gross TAT)</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-50 mt-2">
            {avgTat.toFixed(2)} <span className="text-xs font-normal text-slate-400">Jam / Barge</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Standar Target Perusahaan: <strong className="font-mono-num text-slate-200">8,22 – 8,78 Jam</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Effective Loading Hours (BLC Aktif)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-400 mt-2">
            {avgEffectiveHours.toFixed(2)} <span className="text-xs font-normal text-slate-400">Jam / Barge</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Proporsi Jam Efektif:{' '}
            <strong className="font-mono-num text-emerald-400">
              {avgTat > 0 ? ((avgEffectiveHours / avgTat) * 100).toFixed(1) : 0}%
            </strong>{' '}
            dari Total Sandar
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Rata-Rata Waktu Hilang (Idle + Delay)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono-num text-amber-400 mt-2">
            {avgLostHours.toFixed(2)} <span className="text-xs font-normal text-slate-400">Jam / Barge</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Standby + Breakdown + Weather Delay per siklus tongkang
          </div>
        </div>

        <div className="bg-slate-900 border border-rose-500/40 rounded-lg p-4">
          <div className="text-xs text-rose-300 flex items-center justify-between font-medium">
            <span>Faktor Bottleneck #1 Pelabuhan (2026)</span>
            <Wrench className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 mt-2 line-clamp-1">
            {topBottleneck ? topBottleneck.cause : '-'}
          </div>
          <div className="text-xs text-rose-400 font-mono-num font-semibold mt-2">
            {topBottleneck ? `${topBottleneck.hours.toLocaleString('id-ID')} Jam (${topBottleneck.sharePct}% Total Delay)` : '-'}
          </div>
        </div>
      </div>

      {/* VISUALIZATION 1: Barge Turnaround Time (TAT) Breakdown (Horizontal Stacked Bar Chart) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Visualisasi 1: Barge Turnaround Time (TAT) Breakdown {sortedByWorstTat.length > 0 ? `(TOP ${sortedByWorstTat.length} Durasi Sandar Terlama)` : ''}
            </h3>
          </div>

          {/* 4 Color Component Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
              Effective Loading (Hijau - BLC Aktif)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block"></span>
              Operational Standby / Idle (Kuning)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
              Equipment Breakdown (Merah)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block"></span>
              External / Weather Delay (Biru)
            </span>
          </div>
        </div>

        {sortedByWorstTat.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
            Tidak ada tongkang yang termuat pada periode evaluasi filter aktif.
          </div>
        ) : (
          <div style={{ height: `${Math.max(200, Math.min(460, sortedByWorstTat.length * 42 + 70))}px` }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedByWorstTat}
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={true} vertical={true} />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={11}
                  unit=" Jam"
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#CBD5E1"
                  fontSize={11}
                  width={175}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                  formatter={(value: any, name: any) => [
                    typeof value === 'number' ? `${value.toFixed(2)} Jam` : String(value ?? '-'),
                    String(name),
                  ]}
                />
                <ReferenceLine
                  x={8.5}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Batas Plan TAT (~8,5 Jam)',
                    position: 'top',
                    fill: '#FBBF24',
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="effectiveLoadingHours"
                  name="Effective Loading Hours (BLC Aktif)"
                  stackId="tat"
                  fill="#10B981"
                  barSize={20}
                />
                <Bar
                  dataKey="standbyHours"
                  name="Operational Standby / Idle (Draft, Shifting, Tunggu Stockpile)"
                  stackId="tat"
                  fill="#EAB308"
                  barSize={20}
                />
                <Bar
                  dataKey="breakdownHours"
                  name="Equipment Breakdown (BLC, Loader, Dozer)"
                  stackId="tat"
                  fill="#EF4444"
                  barSize={20}
                />
                <Bar
                  dataKey="weatherExternalHours"
                  name="External / Weather Delay (Hujan, Pasang Surut/Tidal)"
                  stackId="tat"
                  fill="#3B82F6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ROW 2: VISUALIZATION 2 (Gross vs Effective Rate) & VISUALIZATION 3 (Pareto Bottleneck Pelabuhan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* VISUALIZATION 2: Gross vs Effective Loading Rate per Barge vs 1.350 TPH */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Visualisasi 2: Gross vs Effective Loading Rate per Barge vs Target 1.350 TPH
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menunjukkan seberapa besar kecepatan muat tergerus oleh waktu tunggu sandar (Gross Rate vs Effective BLC Rate).
            </p>
          </div>

          <div className="h-[340px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={sortedByWorstTat}
                margin={{ top: 15, right: 15, left: 0, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="shortName"
                  stroke="#94A3B8"
                  fontSize={10}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 1850]} unit=" TPH" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                <ReferenceLine
                  y={1350}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'Target : 1.350 ton/jam',
                    position: 'insideTopRight',
                    fill: '#F87171',
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="grossRateTph"
                  name="Gross Loading Rate (TPH)"
                  fill="#64748B"
                  radius={[3, 3, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="effectiveRateTph"
                  name="Effective BLC Rate (TPH)"
                  fill="#10B981"
                  radius={[3, 3, 0, 0]}
                  barSize={18}
                >
                  {sortedByWorstTat.map((entry, idx) => (
                    <Cell
                      key={`eff-${idx}`}
                      fill={entry.effectiveRateTph >= 1350 ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VISUALIZATION 3: Pareto Bottleneck Pelabuhan (Ranking Penyebab Hilangnya Waktu 2026) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Visualisasi 3: Pareto Bottleneck Pelabuhan 2026 (Sheet BASE &amp; BASE2)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Meranking penyebab utama hilangnya jam operasional pelabuhan agar manajemen tahu faktor nomor 1 yang wajib diperbaiki hari ini.
            </p>
          </div>

          <div className="h-[220px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={paretoData}
                margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="cause"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                />
                <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} unit=" Jam" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#38BDF8"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
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
                <Bar yAxisId="left" dataKey="hours" name="Total Jam Hilang (Hours)" barSize={28} radius={[4, 4, 0, 0]}>
                  {paretoData.map((entry, idx) => (
                    <Cell key={`pcell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePct"
                  name="Kumulatif (%)"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38BDF8' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked Action Table */}
          <div className="mt-3 space-y-1.5">
            {paretoData.slice(0, 4).map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-950 border border-slate-800/80 rounded"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-mono-num font-bold text-slate-400">#{item.rank}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-slate-200 font-medium truncate">{item.cause}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono-num">
                  <span className="text-slate-100 font-bold">{item.hours.toLocaleString('id-ID')} Jam</span>
                  <span className="text-sky-400 w-12 text-right">{item.sharePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
