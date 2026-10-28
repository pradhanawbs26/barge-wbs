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
  Ship,
  Truck,
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
  selectedPeriod: PeriodType;
  onSelectPeriod: (p: PeriodType) => void;
  filteredBarges: BargeRecord[];
}

const PERIODS: PeriodType[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export const MorningMeetingView: React.FC<MorningMeetingViewProps> = ({
  matrix,
  selectedPeriod,
  onSelectPeriod,
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

  // Filtered summary from BASE & BASE2 for the selected filter window
  const totalFilteredTonnage = filteredBarges.reduce((s, b) => s + b.tonnage, 0);
  const avgFilteredEffectiveTph =
    filteredBarges.length > 0
      ? filteredBarges.reduce((s, b) => s + b.effectiveRateTph, 0) / filteredBarges.length
      : matrix.blcRate[selectedPeriod].actual;
  const avgFilteredGrossHours =
    filteredBarges.length > 0
      ? filteredBarges.reduce((s, b) => s + b.totalTurnaroundHours, 0) / filteredBarges.length
      : matrix.portIdleDelay[selectedPeriod].actual;

  const activeCycleTime = matrix.cycleTimeFlatDeck[selectedPeriod].actual;
  const isCycleTimeWarning = activeCycleTime > 120;
  const activeBlcRate = matrix.blcRate[selectedPeriod].actual;
  const isBlcOnTarget = activeBlcRate >= 1350;

  return (
    <div className="space-y-6">
      {/* Top Executive Banner & Period Focus Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-50 mt-1">
            Barge Performance
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start lg:self-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onSelectPeriod(p)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedPeriod === p
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {p === 'Yearly' ? 'Yearly (2026)' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Focused Period Highlight Strip (4 Primary KPIs for Active Period) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card A: Tonase Loading to Barge */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tonase Loading to Barge ({selectedPeriod})</span>
              <Ship className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{matrix.periodLabel[selectedPeriod]}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-num text-slate-50">
                {matrix.loadingTonase[selectedPeriod].actual.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-400">Ton</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Plan: <strong className="font-mono-num text-slate-200">{matrix.loadingTonase[selectedPeriod].plan.toLocaleString('id-ID')}</strong> T
            </span>
            <span
              className={`font-mono-num font-semibold flex items-center gap-0.5 ${
                matrix.loadingTonase[selectedPeriod].achievementPct >= 100
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              %Ach: {matrix.loadingTonase[selectedPeriod].achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>

        {/* Card B: Produktivitas Alat Muat / BLC Rate (Strict Red < 1350, Green >= 1350) */}
        <div
          className={`bg-slate-900 border rounded-lg p-5 flex flex-col justify-between ${
            isBlcOnTarget ? 'border-emerald-500/40' : 'border-rose-500/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Produktivitas Alat Muat (BLC Rate)</span>
              <Gauge className={`w-4 h-4 ${isBlcOnTarget ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Target : 1.350 ton/jam</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono-num ${
                  isBlcOnTarget ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {activeBlcRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400">Ton / Hour</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className=" flex items-center gap-1.5 font-semibold">
              {isBlcOnTarget ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Sesuai Target</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Tidak Mencapai Target</span>
                </>
              )}
            </span>
            <span
              className={`font-mono-num font-semibold ${
                isBlcOnTarget ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              %Ach: {matrix.blcRate[selectedPeriod].achievementPct.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>

        {/* Card C: Port Idle / Gross Delay Time (Jam) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Port Idle / Turnaround Time ({selectedPeriod})</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Batas Standar Sandar: 8,22 – 8,78 Jam</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono-num ${
                  matrix.portIdleDelay[selectedPeriod].actual <= matrix.portIdleDelay[selectedPeriod].plan
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {matrix.portIdleDelay[selectedPeriod].actual.toLocaleString('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs text-slate-400">Jam / Barge</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Plan: <strong className="font-mono-num text-slate-200">{matrix.portIdleDelay[selectedPeriod].plan.toLocaleString('id-ID')}</strong> Jam
            </span>
            <span
              className={`font-mono-num font-semibold ${
                matrix.portIdleDelay[selectedPeriod].actual <= matrix.portIdleDelay[selectedPeriod].plan
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              Selisih: {matrix.portIdleDelay[selectedPeriod].variance > 0 ? '+' : ''}
              {matrix.portIdleDelay[selectedPeriod].variance.toLocaleString('id-ID')} Jam
            </span>
          </div>
        </div>

        {/* Card D: Filter Window Live Telemetry (BASE + BASE2 2026) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Realisasi Filter Aktif (Sheet BASE 2026)</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {filteredBarges.length} Tongkang Termuat pada Periode Filter
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono-num text-slate-50">
                {Math.round(totalFilteredTonnage).toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-400">MT Total</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Avg BLC:{' '}
              <strong
                className={`font-mono-num ${
                  avgFilteredEffectiveTph >= 1350 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {avgFilteredEffectiveTph.toLocaleString('id-ID', { maximumFractionDigits: 1 })} TPH
              </strong>
            </span>
            <span className="text-slate-400">
              Avg TAT: <strong className="font-mono-num text-slate-200">{avgFilteredGrossHours.toFixed(2)} Jam</strong>
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
                    onClick={() => onSelectPeriod(p)}
                    className={`py-3 px-4 text-right cursor-pointer transition-colors ${
                      selectedPeriod === p ? 'bg-sky-950/40 text-sky-300' : 'hover:bg-slate-900'
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

      {/* SECTION D: KORELASI HULU-HILIR (EARLY WARNING SYSTEM) & VISUAL COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Early Warning Hulu-Hilir Panel */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Korelasi Hulu–Hilir (Early Warning System: Suplai Hauling vs Jetty BLC)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mendiagnosis apakah pelambatan muat tongkang disebabkan oleh masalah internal Jetty/BLC atau keterlambatan suplai kargo dari Hauling/Stockpile.
            </p>

            {/* Upstream vs Downstream Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5">
                <div className="text-xs text-slate-400">Hulu: Hauling / Stockpile ({selectedPeriod})</div>
                <div className="text-lg font-bold font-mono-num text-slate-100 mt-1">
                  {matrix.haulingTonase[selectedPeriod].actual.toLocaleString('id-ID')} MT
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>Plan: {matrix.haulingTonase[selectedPeriod].plan.toLocaleString('id-ID')}</span>
                  <span
                    className={`font-mono-num font-semibold ${
                      matrix.haulingTonase[selectedPeriod].achievementPct >= 100
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {matrix.haulingTonase[selectedPeriod].achievementPct}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5">
                <div className="text-xs text-slate-400">Hilir: Loading to Barge ({selectedPeriod})</div>
                <div className="text-lg font-bold font-mono-num text-slate-100 mt-1">
                  {matrix.loadingTonase[selectedPeriod].actual.toLocaleString('id-ID')} MT
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>Plan: {matrix.loadingTonase[selectedPeriod].plan.toLocaleString('id-ID')}</span>
                  <span
                    className={`font-mono-num font-semibold ${
                      matrix.loadingTonase[selectedPeriod].achievementPct >= 100
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {matrix.loadingTonase[selectedPeriod].achievementPct}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5">
                <div className="text-xs text-slate-400">Cycle Time &amp; Unit Flat Deck</div>
                <div className="text-lg font-bold font-mono-num text-rose-400 mt-1">
                  {activeCycleTime.toLocaleString('id-ID')} Min
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>Target: 120,00 Min</span>
                  <span className="font-mono-num text-slate-200 font-semibold">
                    {matrix.flatDeckRunning[selectedPeriod].actual} / {matrix.flatDeckRunning[selectedPeriod].plan} Unit
                  </span>
                </div>
              </div>
            </div>
        </div>

        {/* Right 5 Cols: BLC Rate Across 4 Timeframes Chart vs 1.350 TPH */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 1700]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <ReferenceLine
                  y={1350}
                  stroke="#38BDF8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Target 1.350 TPH',
                    position: 'insideTopRight',
                    fill: '#38BDF8',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="blcActual" name="Actual BLC Rate (TPH)" radius={[4, 4, 0, 0]} barSize={38}>
                  {matrixChartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.blcActual >= 1350 ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
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
