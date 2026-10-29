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
      .map((b) => {
        const stackedTotal = Number(
          (b.effectiveLoadingHours + b.standbyHours + b.breakdownHours + b.weatherExternalHours).toFixed(2)
        );
        return {
          label: `${b.bargeName} (#${b.noBarge})`,
          shortName: b.bargeName,
          noBarge: b.noBarge,
          tugBoat: b.tugBoat,
          dateStr: b.dateStr,
          inPositionStr: b.inPositionStr,
          commencedLoadingStr: b.commencedLoadingStr,
          completedLoadingStr: b.completedLoadingStr,
          castOffStr: b.castOffStr,
          tonnage: b.tonnage,
          effectiveLoadingHours: b.effectiveLoadingHours,
          standbyHours: b.standbyHours,
          breakdownHours: b.breakdownHours,
          weatherExternalHours: b.weatherExternalHours,
          totalTurnaroundHours: stackedTotal > 0 ? stackedTotal : b.totalTurnaroundHours,
          grossRateTph: b.grossRateTph,
          effectiveRateTph: b.effectiveRateTph,
        };
      })
      .sort((a, b) => b.totalTurnaroundHours - a.totalTurnaroundHours)
      .slice(0, topLimit);
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

  // Custom Tooltip for Visualization 1 showing Tanggal Kejadian Pemuatan Tongkang
  const renderTatTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#061311]/95 border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl text-xs text-slate-100 min-w-[270px] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
          <div>
            <div className="font-bold text-white text-sm">{d.label}</div>
            <div className="text-[11px] text-slate-400">Tugboat: {d.tugBoat}</div>
          </div>
          <span className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono-num font-bold">
            {d.dateStr}
          </span>
        </div>
        <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-0.5">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Tanggal Kejadian Pemuatan:</span>
            <strong className="font-mono-num text-emerald-300">{d.dateStr}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Sandar – Cast Off:</span>
            <span className="font-mono-num text-slate-200">{d.inPositionStr} s/d {d.castOffStr}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Mulai – Selesai Muat:</span>
            <span className="font-mono-num text-slate-200">{d.commencedLoadingStr} s/d {d.completedLoadingStr}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Tonase Muat:</span>
            <strong className="font-mono-num text-white">{d.tonnage.toLocaleString('id-ID')} MT</strong>
          </div>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <strong className="font-mono-num text-white">{Number(entry.value).toFixed(2)} Jam</strong>
            </div>
          ))}
          <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex items-center justify-between font-bold text-sky-300">
            <span>Total Durasi Sandar (Gross TAT):</span>
            <span className="font-mono-num">{d.totalTurnaroundHours.toFixed(2)} Jam</span>
          </div>
        </div>
      </div>
    );
  };

  // Custom Tooltip for Visualization 2 showing Tanggal Kejadian Pemuatan Tongkang
  const renderRateTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#061311]/95 border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl text-xs text-slate-100 min-w-[260px] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
          <div>
            <div className="font-bold text-white text-sm">{d.label}</div>
            <div className="text-[11px] text-slate-400">Tonase: {d.tonnage.toLocaleString('id-ID')} MT</div>
          </div>
          <span className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono-num font-bold">
            {d.dateStr}
          </span>
        </div>
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] flex justify-between">
          <span className="text-slate-400">Tanggal Kejadian Pemuatan:</span>
          <strong className="font-mono-num text-emerald-300">{d.dateStr}</strong>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <strong className="font-mono-num text-white">
                {Number(entry.value).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TPH
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

      {/* 4 Summary Anatomy Metrics with Distinct Vibrant Gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-950/50 border border-white/15">
          <div className="text-xs font-medium text-sky-100 flex items-center justify-between">
            <span>Rata-Rata Total Jam Sandar (Gross TAT)</span>
            <Clock className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-2xl font-extrabold font-mono-num text-white mt-2">
            {avgTat.toFixed(2)} <span className="text-xs font-normal text-sky-100">Jam / Barge</span>
          </div>
          <div className="text-xs text-sky-100/90 mt-2 pt-2 border-t border-white/15">
            Standar Target Perusahaan: <strong className="font-mono-num text-white">8,22 – 8,78 Jam</strong>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white shadow-lg shadow-emerald-950/50 border border-white/15">
          <div className="text-xs font-medium text-emerald-100 flex items-center justify-between">
            <span>Effective Loading Hours (BLC Aktif)</span>
            <CheckCircle2 className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-2xl font-extrabold font-mono-num text-white mt-2">
            {avgEffectiveHours.toFixed(2)} <span className="text-xs font-normal text-emerald-100">Jam / Barge</span>
          </div>
          <div className="text-xs text-emerald-100/90 mt-2 pt-2 border-t border-white/15">
            Proporsi Jam Efektif:{' '}
            <strong className="font-mono-num text-white">
              {avgTat > 0 ? ((avgEffectiveHours / avgTat) * 100).toFixed(1) : 0}%
            </strong>{' '}
            dari Total Sandar
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-white shadow-lg shadow-amber-950/50 border border-white/15">
          <div className="text-xs font-medium text-amber-100 flex items-center justify-between">
            <span>Rata-Rata Waktu Hilang (Idle + Delay)</span>
            <AlertTriangle className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-2xl font-extrabold font-mono-num text-white mt-2">
            {avgLostHours.toFixed(2)} <span className="text-xs font-normal text-amber-100">Jam / Barge</span>
          </div>
          <div className="text-xs text-amber-100/90 mt-2 pt-2 border-t border-white/15">
            Standby + Breakdown + Weather Delay per siklus tongkang
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-rose-500 via-pink-600 to-purple-800 text-white shadow-lg shadow-rose-950/50 border border-white/15">
          <div className="text-xs font-medium text-rose-100 flex items-center justify-between">
            <span>Faktor Bottleneck #1 Pelabuhan (2026)</span>
            <Wrench className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-sm font-bold text-white mt-2 line-clamp-1">
            {topBottleneck ? topBottleneck.cause : '-'}
          </div>
          <div className="text-xs text-rose-100 font-mono-num font-semibold mt-2 pt-2 border-t border-white/15">
            {topBottleneck ? `${topBottleneck.hours.toLocaleString('id-ID')} Jam (${topBottleneck.sharePct}% Total Delay)` : '-'}
          </div>
        </div>
      </div>

      {/* VISUALIZATION 1: Barge Turnaround Time (TAT) Breakdown (Horizontal Stacked Bar Chart) */}
      <div className="bg-gradient-to-br from-slate-900 via-[#071514] to-slate-950 border border-emerald-500/20 rounded-xl p-5 shadow-lg shadow-black/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Top 10 Gross Loading Time
            </h3>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Arahkan kursor ke grafik batang untuk melihat tanggal kejadian pemuatan tongkang &amp; rincian durasi sandar.
            </p>
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
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#CBD5E1"
                  fontSize={11}
                  width={175}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  content={renderTatTooltip}
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
                  name="Operational Standby / Idle"
                  stackId="tat"
                  fill="#EAB308"
                  barSize={20}
                />
                <Bar
                  dataKey="breakdownHours"
                  name="Equipment Breakdown"
                  stackId="tat"
                  fill="#EF4444"
                  barSize={20}
                />
                <Bar
                  dataKey="weatherExternalHours"
                  name="External / Weather Delay"
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
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-[#071514] to-slate-950 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Gross vs Net Loading Productivity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menunjukkan seberapa besar kecepatan muat tergerus oleh waktu tunggu sandar (arahkan kursor untuk melihat tanggal pemuatan).
            </p>
          </div>

          <div className="h-[340px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={sortedByWorstTat}
                margin={{ top: 15, right: 15, left: 0, bottom: 45 }}
              >
                <defs>
                  <linearGradient id="effGreenBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="effRedBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="grossSlateBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  stroke="#94A3B8"
                  fontSize={10}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 1850]} unit=" TPH" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  content={renderRateTooltip}
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
                  fill="url(#grossSlateBar)"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="effectiveRateTph"
                  name="Effective BLC Rate (TPH)"
                  fill="url(#effGreenBar)"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                >
                  {sortedByWorstTat.map((entry, idx) => (
                    <Cell
                      key={`eff-${idx}`}
                      fill={entry.effectiveRateTph >= 1350 ? 'url(#effGreenBar)' : 'url(#effRedBar)'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VISUALIZATION 3: Pareto Bottleneck Pelabuhan (Ranking Penyebab Hilangnya Waktu 2026) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-[#071514] to-slate-950 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Pareto Delay Loading Barge
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="cause"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} unit=" Jam" axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#34D399"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#061311',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar yAxisId="left" dataKey="hours" name="Total Jam Hilang (Hours)" barSize={28} radius={[6, 6, 0, 0]}>
                  {paretoData.map((entry, idx) => (
                    <Cell key={`pcell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePct"
                  name="Kumulatif (%)"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10B981', stroke: '#A7F3D0', strokeWidth: 1.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked Action Table */}
          <div className="mt-3 space-y-1.5">
            {paretoData.slice(0, 4).map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between text-xs py-1.5 px-3 bg-slate-950/80 border border-slate-800/80 rounded-lg"
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
                  <span className="text-emerald-400 w-12 text-right">{item.sharePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
