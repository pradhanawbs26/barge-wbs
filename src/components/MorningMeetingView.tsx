import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  ShieldAlert,
  Ship,
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
import { BargeRecord, ExecutiveMatrix, PeriodType } from '../types';

interface MorningMeetingViewProps {
  matrix: ExecutiveMatrix;
  selectedMonthFilter: string;
  filteredBarges: BargeRecord[];
}

const PERIODS: PeriodType[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export const MorningMeetingView: React.FC<MorningMeetingViewProps> = ({
  matrix,
  selectedMonthFilter,
  filteredBarges,
}) => {
  // Prepare 4-Matrix Comparison Chart data
  const matrixChartData = PERIODS.map((p) => ({
    period: p === 'Yearly' ? 'Yearly 2026' : p,
    dateRange: matrix.periodLabel[p],
    blcPlan: matrix.blcRate[p].plan,
    blcActual: matrix.blcRate[p].actual,
    idlePlan: matrix.portIdleDelay[p].plan,
    idleActual: matrix.portIdleDelay[p].actual,
    tonPlan: matrix.loadingTonase[p].plan,
    tonActual: matrix.loadingTonase[p].actual,
    haulingActual: matrix.haulingTonase[p].actual,
    cycleTimeActual: matrix.cycleTimeFlatDeck[p].actual,
  }));

  // Monthly barges corresponding to the selected month in the dropdown (defaults to running month 2026-10 when ALL_2026)
  const targetMonthKey =
    !selectedMonthFilter || selectedMonthFilter === 'ALL_2026' ? '2026-10' : selectedMonthFilter;
  const monthlyBarges =
    selectedMonthFilter === 'ALL_2026'
      ? filteredBarges.filter((b) => b.monthKey === targetMonthKey)
      : filteredBarges;

  const avgFilteredEffectiveLoadingHours =
    monthlyBarges.length > 0
      ? monthlyBarges.reduce((s, b) => s + b.effectiveLoadingHours, 0) / monthlyBarges.length
      : Number((matrix.portIdleDelay.Monthly.actual * 0.68).toFixed(2));
  const avgFilteredGrossHours =
    monthlyBarges.length > 0
      ? monthlyBarges.reduce((s, b) => s + b.totalTurnaroundHours, 0) / monthlyBarges.length
      : matrix.portIdleDelay.Monthly.actual;
  const avgFilteredDelayHours = Math.max(0, avgFilteredGrossHours - avgFilteredEffectiveLoadingHours);

  const activeBlcRate = matrix.blcRate.Monthly.actual;
  const isBlcOnTarget = activeBlcRate >= 1350;

  const overLaytimeBarges = [...monthlyBarges]
    .filter((b) => b.totalTurnaroundHours > 9.5)
    .sort((a, b) => b.totalTurnaroundHours - a.totalTurnaroundHours);

  const underTargetBlcBarges = [...monthlyBarges]
    .filter((b) => b.effectiveRateTph > 0 && b.effectiveRateTph < 1350)
    .sort((a, b) => a.effectiveRateTph - b.effectiveRateTph);

  return (
    <div className="space-y-5">
      {/* Compact Overview Header showing Monthly period for selected month */}
      <div className="inline-flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <h2 className="text-sm font-bold tracking-wide text-slate-100">
          Overview · KPI Loading to Barge
        </h2>
        <span className="text-xs text-slate-400 font-mono-num border-l border-slate-800 pl-2.5">
          Monthly · {matrix.periodLabel.Monthly}
        </span>
      </div>

        {/* Focused Monthly Highlight Strip (4 Primary KPIs with Distinct Vibrant Gradients) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card A: Tonase Loading to Barge — Vibrant Blue Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-sky-500 to-blue-700 border border-sky-300/30 rounded-xl p-5 text-white shadow-lg shadow-blue-950/50 flex flex-col justify-between">
          <Ship className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-blue-50/90">
              Tonase Loading to Barge (Monthly)
            </div>
            <div className="text-[11px] text-blue-100/80 mt-0.5">{matrix.periodLabel.Monthly}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                {matrix.loadingTonase.Monthly.actual.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-medium text-blue-100">Ton</span>
            </div>
          </div>
          <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-blue-50/90">
              Plan: <strong className="font-mono-num text-white">{matrix.loadingTonase.Monthly.plan.toLocaleString('id-ID')}</strong> T
            </span>
            <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
              %Ach: {matrix.loadingTonase.Monthly.achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>

        {/* Card B: Produktivitas Alat Muat / BLC Rate — Vibrant Emerald/Teal Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700 border border-emerald-300/30 rounded-xl p-5 text-white shadow-lg shadow-emerald-950/50 flex flex-col justify-between">
          <Gauge className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-emerald-50/90">
              Produktivitas Alat Muat (BLC Rate)
            </div>
            <div className="text-[11px] text-emerald-100/80 mt-0.5">Target : 1.350 ton/jam</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                {activeBlcRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-medium text-emerald-100">Ton / Hour</span>
            </div>
          </div>
          <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              {isBlcOnTarget ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Sesuai Target</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                  <span className="text-amber-100">Tidak Mencapai Target</span>
                </>
              )}
            </span>
            <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
              %Ach: {matrix.blcRate.Monthly.achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>

        {/* Card C: Port Idle / Turnaround Time — Vibrant Amber/Gold Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 border border-amber-300/30 rounded-xl p-5 text-slate-950 shadow-lg shadow-amber-950/50 flex flex-col justify-between">
          <Clock className="w-14 h-14 text-slate-950/15 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-xs font-bold text-slate-900/90">
              Port Idle / Turnaround Time (Monthly)
            </div>
            <div className="text-[11px] font-medium text-slate-900/75 mt-0.5">Batas Standar Sandar: 8,22 – 8,78 Jam</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono-num text-slate-950">
                {matrix.portIdleDelay.Monthly.actual.toLocaleString('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-bold text-slate-900/80">Jam / Barge</span>
            </div>
          </div>
          <div className="relative z-10 mt-4 pt-3 border-t border-slate-950/15 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900/85">
              Plan: <strong className="font-mono-num text-slate-950">{matrix.portIdleDelay.Monthly.plan.toLocaleString('id-ID')}</strong> Jam
            </span>
            <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-slate-950/15 text-slate-950">
              Selisih: {matrix.portIdleDelay.Monthly.variance > 0 ? '+' : ''}
              {matrix.portIdleDelay.Monthly.variance.toLocaleString('id-ID')} Jam
            </span>
          </div>
        </div>

        {/* Card D: Loading Time per Tongkang (During Selected Month) — Vibrant Purple/Indigo Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 border border-indigo-300/30 rounded-xl p-5 text-white shadow-lg shadow-indigo-950/50 flex flex-col justify-between">
          <Activity className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="relative z-10">
            <div className="text-xs font-semibold text-indigo-50/90">
              Loading Time per Tongkang (Monthly)
            </div>
            <div className="text-[11px] text-indigo-100/80 mt-0.5">
              {monthlyBarges.length} Tongkang ({matrix.periodLabel.Monthly})
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                {avgFilteredEffectiveLoadingHours.toLocaleString('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-medium text-indigo-100">Jam Efektif / Tongkang</span>
            </div>
          </div>
          <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-indigo-50/90">
              Gross Sandar: <strong className="font-mono-num text-white">{avgFilteredGrossHours.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jam</strong>
            </span>
            <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
              Delay: {avgFilteredDelayHours.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jam
            </span>
          </div>
        </div>
      </div>

      {/* FULL 4-TIMEFRAME MATRIX TABLE (Daily, Weekly, Monthly, Yearly 2026) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              KPI Loading to Barge
            </h3>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
              Sesuai Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span>
              Tidak Mencapai Target
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-4 min-w-[210px]">Parameter KPI Utama (2026)</th>
                <th className="py-3 px-3 text-center">Komponen</th>
                {PERIODS.map((p) => (
                  <th
                    key={p}
                    className={`py-3 px-4 text-right transition-colors ${
                      p === 'Monthly' ? 'bg-sky-950/40 text-sky-300' : ''
                    }`}
                  >
                    <div className="font-bold text-slate-200">{p === 'Yearly' ? 'Yearly 2026' : p}</div>
                    <div className="text-[11px] font-normal text-slate-400">{matrix.periodLabel[p]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {/* Row Group 1: Tonase Loading to Barge */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                  <div>Tonase Loading to Barge</div>
                  <div className="text-[11px] font-normal text-slate-400 mt-0.5">Satuan: Metrik Ton (MT)</div>
                </td>
                <td className="py-2 px-3 text-center text-slate-400">Plan</td>
                {PERIODS.map((p) => (
                  <td key={p} className="py-2 px-4 text-right font-mono-num text-slate-300">
                    {matrix.loadingTonase[p].plan.toLocaleString('id-ID')}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center font-semibold text-slate-200">Actual</td>
                {PERIODS.map((p) => (
                  <td key={p} className="py-2 px-4 text-right font-mono-num font-bold text-slate-100">
                    {matrix.loadingTonase[p].actual.toLocaleString('id-ID')}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center font-semibold text-slate-300">%Ach</td>
                {PERIODS.map((p) => {
                  const m = matrix.loadingTonase[p];
                  const isGood = m.achievementPct >= 100;
                  return (
                    <td
                      key={p}
                      className={`py-2 px-4 text-right font-mono-num font-semibold ${
                        isGood ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </td>
                  );
                })}
              </tr>

              {/* Row Group 2: Produktivitas Alat Muat / BLC Rate (1.350 TPH) */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                  <div>Produktivitas Alat Muat (BLC Rate)</div>
                  <div className="text-[11px] font-normal text-sky-400 mt-0.5">
                    Target : 1.350 ton/jam
                  </div>
                </td>
                <td className="py-2 px-3 text-center text-slate-400">Target</td>
                {PERIODS.map((p) => (
                  <td key={p} className="py-2 px-4 text-right font-mono-num text-slate-300">
                    {matrix.blcRate[p].plan.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center font-semibold text-slate-200">Actual TPH</td>
                {PERIODS.map((p) => {
                  const actual = matrix.blcRate[p].actual;
                  const isGreen = actual >= 1350;
                  return (
                    <td
                      key={p}
                      className={`py-2 px-4 text-right font-mono-num font-bold ${
                        isGreen ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/25'
                      }`}
                    >
                      {actual.toLocaleString('id-ID', { minimumFractionDigits: 2 })} TPH
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center font-semibold text-slate-300">%Ach</td>
                {PERIODS.map((p) => {
                  const m = matrix.blcRate[p];
                  const isGreen = m.actual >= 1350;
                  return (
                    <td
                      key={p}
                      className={`py-2 px-4 text-right font-mono-num font-semibold ${
                        isGreen ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </td>
                  );
                })}
              </tr>

              {/* Row Group 3: Port Idle / Delay Time (Jam) */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                  <div>Port Idle / Gross Loading Time</div>
                  <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                    Target Standar: 8,22 – 8,78 Jam/Barge
                  </div>
                </td>
                <td className="py-2 px-3 text-center text-slate-400">Plan (Jam)</td>
                {PERIODS.map((p) => (
                  <td key={p} className="py-2 px-4 text-right font-mono-num text-slate-300">
                    {matrix.portIdleDelay[p].plan.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center font-semibold text-slate-200">Actual (Jam)</td>
                {PERIODS.map((p) => {
                  const m = matrix.portIdleDelay[p];
                  const isControlled = m.actual <= m.plan;
                  return (
                    <td
                      key={p}
                      className={`py-2 px-4 text-right font-mono-num font-bold ${
                        isControlled ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.actual.toLocaleString('id-ID', { minimumFractionDigits: 2 })} Jam
                    </td>
                  );
                })}
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                <td className="py-2 px-3 text-center text-slate-400">Overrun / Efisiensi</td>
                {PERIODS.map((p) => {
                  const m = matrix.portIdleDelay[p];
                  const isControlled = m.actual <= m.plan;
                  return (
                    <td
                      key={p}
                      className={`py-2 px-4 text-right font-mono-num font-semibold ${
                        isControlled ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.variance > 0 ? `+${m.variance.toLocaleString('id-ID')} Jam (Over)` : `${m.variance.toLocaleString('id-ID')} Jam (Hemat)`}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION D: EXECUTIVE DECISION EVALUATION CARDS & VISUAL COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: 2 Executive Decision Cards (Over-Laytime & Evaluasi BLC Rate) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Tongkang Over-Laytime / Risiko Demurrage (>9,5 Jam) */}
          <div className="bg-slate-950/90 border border-rose-500/40 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-rose-400 leading-snug">
                  1. Tongkang Over-Laytime / Risiko Demurrage (&gt;9,5 Jam)
                </h3>
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Terdapat <strong className="text-white font-mono-num">{overLaytimeBarges.length} tongkang</strong> pada periode ini yang melampaui batas jam sandar aman (8,22 – 8,78 jam):
              </p>

              <div className="mt-3.5 space-y-2">
                {overLaytimeBarges.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-900/70 border border-slate-800 rounded-md px-3 py-4 text-center">
                    Tidak ada tongkang yang melampaui 9,5 jam sandar pada periode ini.
                  </div>
                ) : (
                  overLaytimeBarges.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 text-xs bg-slate-900/90 border border-slate-800 rounded-md px-3 py-2"
                    >
                      <span className="text-slate-100 font-semibold truncate">
                        {b.bargeName} <span className="text-slate-400 font-normal">({b.dateStr})</span>
                      </span>
                      <span className="font-mono-num font-bold text-rose-400 shrink-0">
                        TAT: {b.totalTurnaroundHours.toFixed(2)} Jam
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Evaluasi BLC Rate Jatuh < 1.350 TPH */}
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-amber-400 leading-snug">
                  2. Evaluasi BLC Rate Jatuh &lt; 1.350 TPH
                </h3>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tercatat <strong className="text-white font-mono-num">{underTargetBlcBarges.length} tongkang</strong> dengan produktivitas muat di bawah standar baku 1.350 TPH:
              </p>

              <div className="mt-3.5 space-y-2">
                {underTargetBlcBarges.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-900/70 border border-slate-800 rounded-md px-3 py-4 text-center">
                    Seluruh tongkang mencapai target ≥ 1.350 TPH pada periode ini.
                  </div>
                ) : (
                  underTargetBlcBarges.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 text-xs bg-slate-900/90 border border-slate-800 rounded-md px-3 py-2"
                    >
                      <span className="text-slate-100 font-semibold truncate">
                        {b.bargeName} <span className="text-slate-400 font-normal">({b.dateStr})</span>
                      </span>
                      <span className="font-mono-num font-bold text-amber-400 shrink-0">
                        {Math.round(b.effectiveRateTph)} TPH
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: BLC Rate Across 4 Timeframes Chart vs 1.350 TPH */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-[#071514] to-slate-950 border border-emerald-500/20 rounded-xl p-5 flex flex-col justify-between shadow-lg shadow-black/40">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Komparasi BLC Rate vs Target 1.350 TPH (4 Matriks Waktu)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hijau = Sesuai Target · Merah = Tidak Mencapai Target
            </p>
          </div>

          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={matrixChartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="blcGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="blcRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F87171" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 1700]} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#061311',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
                  }}
                />
                <ReferenceLine
                  y={1350}
                  stroke="#38BDF8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Target : 1.350 ton/jam',
                    position: 'insideTopRight',
                    fill: '#38BDF8',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="blcActual" name="Actual BLC Rate (TPH)" radius={[6, 6, 0, 0]} barSize={38}>
                  {matrixChartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.blcActual >= 1350 ? 'url(#blcGreenGrad)' : 'url(#blcRedGrad)'}
                      stroke={entry.blcActual >= 1350 ? '#10B981' : '#EF4444'}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Monthly ({matrix.periodLabel.Monthly}):{' '}
              <strong className={`font-mono-num ${matrix.blcRate.Monthly.actual >= 1350 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {matrix.blcRate.Monthly.actual.toLocaleString('id-ID', { minimumFractionDigits: 2 })} TPH
              </strong>
            </span>
            <span className={`font-mono-num font-semibold ${matrix.blcRate.Yearly.actual >= 1350 ? 'text-emerald-400' : 'text-rose-400'}`}>
              YTD ({matrix.periodLabel.Yearly}): {matrix.blcRate.Yearly.actual.toLocaleString('id-ID', { minimumFractionDigits: 2 })} TPH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
