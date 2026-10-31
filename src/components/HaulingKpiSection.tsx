import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  TrainFront,
  Truck,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HAULING_CONFIG, HaulingConfig } from '../config/haulingConfig';
import {
  computeDailyKa,
  computeHaulingKpi,
  computeMonthlyKaSummaries,
  formatHaulingDec2,
  formatHaulingInt,
  formatHaulingPct,
  formatHaulingSignedDec2,
  formatHaulingTon,
  formatHaulingTonExact,
} from '../services/haulingService';
import { HaulingRecord, PeriodType } from '../types';

interface HaulingKpiSectionProps {
  rows: HaulingRecord[];
  refDateIso: string;
  excludeOutlierDuration: boolean;
  onToggleExcludeOutlier: (val: boolean) => void;
  config?: HaulingConfig;
  defaultExpandTable?: boolean;
  showKpiCardsAndTable?: boolean;
}

const PERIODS: PeriodType[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

interface ChartBarDatum {
  key: string;
  xLabel: string;
  fullLabel: string;
  value: number; // KA per hari (or Jumlah KA for daily/weekly/monthly where 1 bar = 1 day)
  jumlahKa: number;
  calendarDays: number;
  planKa: number | null;
  totalTonase: number;
  avgDurasi: number | null;
  avgFd: number | null;
  kendalaList: string[];
  hasOutlier: boolean;
  outlierDetails: string[];
  isYearlyMonth: boolean;
}

export const HaulingKpiSection: React.FC<HaulingKpiSectionProps> = ({
  rows,
  refDateIso,
  excludeOutlierDuration,
  onToggleExcludeOutlier,
  config = HAULING_CONFIG,
  defaultExpandTable = false,
  showKpiCardsAndTable = true,
}) => {
  const [chartPeriod, setChartPeriod] = useState<PeriodType>('Monthly');
  const [isDetailTableOpen, setIsDetailTableOpen] = useState<boolean>(defaultExpandTable);

  const kpi = useMemo(
    () =>
      computeHaulingKpi(rows, refDateIso, config, {
        excludeOutlierDuration,
      }),
    [rows, refDateIso, config, excludeOutlierDuration]
  );

  const monthly = kpi.periods.Monthly;

  // Compute daily series for the active chartPeriod (Daily / Weekly / Monthly)
  const activePeriodMeta = kpi.periods[chartPeriod];

  const dailyKaSeries = useMemo(
    () =>
      computeDailyKa(
        rows,
        activePeriodMeta.startDateIso,
        activePeriodMeta.endDateIso,
        config,
        { excludeOutlierDuration }
      ),
    [rows, activePeriodMeta.startDateIso, activePeriodMeta.endDateIso, config, excludeOutlierDuration]
  );

  const monthlyKaSeries = useMemo(
    () =>
      computeMonthlyKaSummaries(rows, refDateIso, config, {
        excludeOutlierDuration,
      }),
    [rows, refDateIso, config, excludeOutlierDuration]
  );

  const chartData: ChartBarDatum[] = useMemo(() => {
    if (chartPeriod === 'Yearly') {
      return monthlyKaSeries.map((m) => ({
        key: m.monthKey,
        xLabel: m.monthLabel,
        fullLabel: `${m.fullMonthLabel} (${m.calendarDays} hari)`,
        value: Number(m.kaPerHari.toFixed(2)),
        jumlahKa: m.jumlahKa,
        calendarDays: m.calendarDays,
        planKa: m.planKaPerHari,
        totalTonase: m.totalTonase,
        avgDurasi: m.avgDurasi,
        avgFd: m.avgFd,
        kendalaList: m.kendalaList,
        hasOutlier: m.hasOutlier,
        outlierDetails: m.outlierDetails,
        isYearlyMonth: true,
      }));
    }

    return dailyKaSeries.map((d) => ({
      key: d.dateIso,
      xLabel: d.dateLabel,
      fullLabel: d.fullDateLabel,
      value: d.jumlahKa,
      jumlahKa: d.jumlahKa,
      calendarDays: 1,
      planKa: d.planKa,
      totalTonase: d.totalTonase,
      avgDurasi: d.avgDurasi,
      avgFd: d.avgFd,
      kendalaList: d.kendalaList,
      hasOutlier: d.hasOutlier,
      outlierDetails: d.outlierDetails,
      isYearlyMonth: false,
    }));
  }, [chartPeriod, dailyKaSeries, monthlyKaSeries]);

  const referencePlanKa = activePeriodMeta.planKaPerHari;

  // Stats for chart footer summary
  const chartStats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0 };
    const vals = chartData.map((c) => c.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = activePeriodMeta.actualKaPerHari ?? 0;
    return { min, max, avg };
  }, [chartData, activePeriodMeta.actualKaPerHari]);

  // Status evaluation helpers matching ATURAN WARNA STATUS
  const isTonGood = (actual: number | null, plan: number | null) =>
    actual !== null && plan !== null && actual >= plan;

  const isDurasiGood = (actual: number | null, plan: number) =>
    actual !== null && actual <= plan;

  const isFdGood = (actual: number | null, plan: number) => {
    if (actual === null) return false;
    return config.fdHigherIsBetter ? actual >= plan : actual <= plan;
  };

  const isKaGood = (actual: number | null, plan: number | null) =>
    actual !== null && plan !== null && actual >= plan;

  return (
    <div className="space-y-5">
      {showKpiCardsAndTable && (
        <>
          {/* Compact Section Header + Outlier Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <h2 className="text-sm font-bold tracking-wide text-slate-100">
                KPI Hauling (Bongkar KA → Stockpile)
              </h2>
              <span className="text-xs text-slate-400 font-mono-num border-l border-slate-800 pl-2.5">
                Monthly · {monthly.label}
              </span>
            </div>

            {/* Toggle: Exclude outlier durasi > 400 menit (default OFF) */}
            <label className="inline-flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-300 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={excludeOutlierDuration}
                onChange={(e) => onToggleExcludeOutlier(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
              />
              <span>
                Exclude outlier durasi &gt; {config.outlierDurationThresholdMinutes} menit
              </span>
              <span className="text-[11px] font-mono-num px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                10 Feb 2026: 625 mnt
              </span>
            </label>
          </div>

          {/* 4 KARTU KPI HAULING (Identical structure, gradients, typography, and tokens to KPI Loading to Barge) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Tonase Hauling (Monthly) — Biru */}
            <div
              className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-sky-500 to-blue-700 border border-sky-300/30 rounded-xl p-5 text-white shadow-lg shadow-blue-950/50 flex flex-col justify-between"
              title={
                monthly.actualTon !== null
                  ? `Detail Presisi: ${formatHaulingTonExact(monthly.actualTon)} Ton (Plan: ${formatHaulingTonExact(monthly.planTon)} Ton)`
                  : undefined
              }
            >
              <TrainFront className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-xs font-semibold text-blue-50/90">
                  Tonase Hauling (Monthly)
                </div>
                <div className="text-[11px] text-blue-100/80 mt-0.5">{monthly.label}</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                    {formatHaulingTon(monthly.actualTon)}
                  </span>
                  <span className="text-xs font-medium text-blue-100">Ton</span>
                </div>
              </div>
              <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                <span className="text-blue-50/90">
                  Plan:{' '}
                  <strong className="font-mono-num text-white">
                    {formatHaulingTon(monthly.planTon)}
                  </strong>{' '}
                  {monthly.planTon !== null ? 'T' : ''}
                </span>
                <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
                  %Ach: {formatHaulingPct(monthly.tonAchievementPct)}
                </span>
              </div>
            </div>

            {/* Card 2: Durasi Bongkar per KA (Monthly) — Oranye */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 border border-amber-300/30 rounded-xl p-5 text-slate-950 shadow-lg shadow-amber-950/50 flex flex-col justify-between">
              <Clock className="w-14 h-14 text-slate-950/15 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-xs font-bold text-slate-900/90">
                  Durasi Bongkar per KA (Monthly)
                </div>
                <div className="text-[11px] font-medium text-slate-900/75 mt-0.5">
                  Standar Bongkar: ≤ {config.planDurasiMenit} menit / KA
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold font-mono-num text-slate-950">
                    {formatHaulingDec2(monthly.actualDurasi)}
                  </span>
                  <span className="text-xs font-bold text-slate-900/80">menit</span>
                </div>
              </div>
              <div className="relative z-10 mt-4 pt-3 border-t border-slate-950/15 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900/85">
                  Plan:{' '}
                  <strong className="font-mono-num text-slate-950">
                    {config.planDurasiMenit}
                  </strong>{' '}
                  menit
                </span>
                <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-slate-950/15 text-slate-950">
                  Selisih: {formatHaulingSignedDec2(monthly.selisihDurasi)}{' '}
                  {monthly.selisihDurasi !== null ? 'menit' : ''}
                </span>
              </div>
            </div>

            {/* Card 3: Jumlah Truk FD per KA (Monthly) — Hijau/Teal */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700 border border-emerald-300/30 rounded-xl p-5 text-white shadow-lg shadow-emerald-950/50 flex flex-col justify-between">
              <Truck className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-xs font-semibold text-emerald-50/90">
                  Jumlah Truk FD per KA (Monthly)
                </div>
                <div className="text-[11px] text-emerald-100/80 mt-0.5">
                  Target Alokasi: {config.planFdPerKa} unit FD / KA
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                    {formatHaulingDec2(monthly.actualFd)}
                  </span>
                  <span className="text-xs font-medium text-emerald-100">FD / KA</span>
                </div>
              </div>
              <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                <span className="text-emerald-50/90">
                  Plan:{' '}
                  <strong className="font-mono-num text-white">
                    {config.planFdPerKa}
                  </strong>{' '}
                  FD
                </span>
                <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
                  Selisih: {formatHaulingSignedDec2(monthly.selisihFd)}{' '}
                  {monthly.selisihFd !== null ? 'FD' : ''}
                </span>
              </div>
            </div>

            {/* Card 4: KA Dibongkar per Hari (Monthly) — Ungu */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 border border-indigo-300/30 rounded-xl p-5 text-white shadow-lg shadow-indigo-950/50 flex flex-col justify-between">
              <Activity className="w-14 h-14 text-white/20 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-xs font-semibold text-indigo-50/90">
                  KA Dibongkar per Hari (Monthly)
                </div>
                <div className="text-[11px] text-indigo-100/80 mt-0.5">
                  Total {formatHaulingInt(monthly.totalKa)} KA · {monthly.calendarDays} hari
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold font-mono-num text-white drop-shadow-xs">
                    {formatHaulingDec2(monthly.actualKaPerHari)}
                  </span>
                  <span className="text-xs font-medium text-indigo-100">KA / Hari</span>
                </div>
              </div>
              <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                <span className="text-indigo-50/90">
                  Plan:{' '}
                  <strong className="font-mono-num text-white">
                    {formatHaulingDec2(monthly.planKaPerHari)}
                  </strong>{' '}
                  {monthly.planKaPerHari !== null ? 'KA/hari' : ''}
                </span>
                <span className="font-mono-num font-bold px-2 py-0.5 rounded bg-black/20 text-white">
                  %Ach: {formatHaulingPct(monthly.kaAchievementPct)}
                </span>
              </div>
            </div>
          </div>

          {/* TABEL "KPI Hauling" (Daily | Weekly | Monthly | Yearly 2026) */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">KPI Hauling</h3>
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
                        <div className="font-bold text-slate-200">
                          {p === 'Yearly' ? 'Yearly 2026' : p}
                        </div>
                        <div className="text-[11px] font-normal text-slate-400">
                          {kpi.periods[p].label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {/* Group 1: Tonase Hauling (MT) */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                      <div>Tonase Hauling (MT)</div>
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                        Bongkar KA → Stockpile (MT)
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">Plan</td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      return (
                        <td
                          key={p}
                          className="py-2 px-4 text-right font-mono-num text-slate-300"
                          title={
                            m.planTon !== null
                              ? `${formatHaulingTonExact(m.planTon)} MT`
                              : undefined
                          }
                        >
                          {formatHaulingTon(m.planTon)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">
                      Actual
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      return (
                        <td
                          key={p}
                          className="py-2 px-4 text-right font-mono-num font-bold text-slate-100"
                          title={
                            m.actualTon !== null
                              ? `${formatHaulingTonExact(m.actualTon)} MT`
                              : undefined
                          }
                        >
                          {formatHaulingTon(m.actualTon)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-300">
                      %Ach
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.tonAchievementPct !== null;
                      const good = isTonGood(m.actualTon, m.planTon);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-semibold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {formatHaulingPct(m.tonAchievementPct)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group 2: Durasi Bongkar per KA (menit) */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                      <div>Durasi Bongkar per KA (menit)</div>
                      <div className="text-[11px] font-normal text-sky-400 mt-0.5">
                        Target : ≤ {config.planDurasiMenit} menit/KA
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">Plan</td>
                    {PERIODS.map((p) => (
                      <td
                        key={p}
                        className="py-2 px-4 text-right font-mono-num text-slate-300"
                      >
                        {formatHaulingDec2(kpi.periods[p].planDurasi)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">
                      Actual
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.actualDurasi !== null;
                      const good = isDurasiGood(m.actualDurasi, m.planDurasi);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-bold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400 bg-emerald-950/20'
                              : 'text-rose-400 bg-rose-950/25'
                          }`}
                        >
                          {hasVal ? `${formatHaulingDec2(m.actualDurasi)} menit` : '–'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center text-slate-400">
                      Overrun / Efisiensi
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.selisihDurasi !== null;
                      const good = isDurasiGood(m.actualDurasi, m.planDurasi);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-semibold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {!hasVal
                            ? '–'
                            : (m.selisihDurasi as number) > 0
                            ? `${formatHaulingSignedDec2(m.selisihDurasi)} menit (Over)`
                            : `${formatHaulingSignedDec2(m.selisihDurasi)} menit (Hemat)`}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group 3: Jumlah Truk FD per KA */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={3}>
                      <div>Jumlah Truk FD per KA</div>
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                        Target : {config.planFdPerKa} unit FD/KA
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">Plan</td>
                    {PERIODS.map((p) => (
                      <td
                        key={p}
                        className="py-2 px-4 text-right font-mono-num text-slate-300"
                      >
                        {formatHaulingDec2(kpi.periods[p].planFd)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">
                      Actual
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.actualFd !== null;
                      const good = isFdGood(m.actualFd, m.planFd);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-bold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {hasVal ? `${formatHaulingDec2(m.actualFd)} FD` : '–'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center text-slate-400">Selisih</td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.selisihFd !== null;
                      const good = isFdGood(m.actualFd, m.planFd);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-semibold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {hasVal ? `${formatHaulingSignedDec2(m.selisihFd)} FD` : '–'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Group 4: KA Dibongkar per Hari (KA/hari) + Baris Info Total KA */}
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-100" rowSpan={4}>
                      <div>KA Dibongkar per Hari (KA/hari)</div>
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                        1 KA = {config.planTonPerKa.toLocaleString('id-ID')} MT · Pembagi Hari Kalender
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">Plan</td>
                    {PERIODS.map((p) => (
                      <td
                        key={p}
                        className="py-2 px-4 text-right font-mono-num text-slate-300"
                      >
                        {formatHaulingDec2(kpi.periods[p].planKaPerHari)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-200">
                      Actual
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.actualKaPerHari !== null;
                      const good = isKaGood(m.actualKaPerHari, m.planKaPerHari);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-bold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {hasVal ? `${formatHaulingDec2(m.actualKaPerHari)} KA/hari` : '–'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-950/40 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center font-semibold text-slate-300">
                      %Ach
                    </td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      const hasVal = m.kaAchievementPct !== null;
                      const good = isKaGood(m.actualKaPerHari, m.planKaPerHari);
                      return (
                        <td
                          key={p}
                          className={`py-2 px-4 text-right font-mono-num font-semibold ${
                            !hasVal
                              ? 'text-slate-400'
                              : good
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {formatHaulingPct(m.kaAchievementPct)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-950/60 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center text-slate-400">Total KA</td>
                    {PERIODS.map((p) => {
                      const m = kpi.periods[p];
                      return (
                        <td
                          key={p}
                          className="py-2 px-4 text-right font-mono-num text-slate-300"
                        >
                          {m.hasData
                            ? `${formatHaulingInt(m.totalKa)} KA (${m.calendarDays} hari)`
                            : '–'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* GRAFIK BAR "Jumlah KA Dibongkar per Hari" + EXPANDABLE DETAIL TABLE */}
      <div className="bg-gradient-to-br from-slate-900 via-[#071514] to-slate-950 border border-emerald-500/20 rounded-xl p-5 shadow-lg shadow-black/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Jumlah KA Dibongkar per Hari
              </h3>
              <span className="text-xs font-mono-num text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded px-2 py-0.5">
                {chartPeriod === 'Yearly' ? 'Yearly 2026 (Rata-rata Bulanan)' : `${chartPeriod} · ${activePeriodMeta.label}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Garis putus-putus = Plan KA/hari ({formatHaulingDec2(referencePlanKa)} KA/hari) · Hijau = Mencapai Plan · Merah = Di Bawah Plan
            </p>
          </div>

          {/* Period Switcher for Chart (Default: Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg p-1 self-start lg:self-auto">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  chartPeriod === p
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'Yearly' ? 'Yearly 2026' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 18, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="kaGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="kaRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F87171" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="xLabel"
                stroke="#94A3B8"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                interval={chartData.length > 20 ? 1 : 0}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                domain={[0, 10]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as ChartBarDatum;
                  const isOnPlan =
                    item.planKa !== null ? item.value >= item.planKa : true;
                  return (
                    <div className="bg-[#061311] border border-emerald-500/40 rounded-xl p-3.5 text-xs text-slate-100 shadow-2xl max-w-xs space-y-2">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white">{item.fullLabel}</span>
                        <span
                          className={`font-mono-num font-bold px-2 py-0.5 rounded text-[11px] ${
                            isOnPlan
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.isYearlyMonth
                            ? `${formatHaulingDec2(item.value)} KA/hari`
                            : `${item.jumlahKa} KA`}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono-num text-[11px]">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Jumlah KA:</span>
                          <span className="font-bold text-slate-100">
                            {formatHaulingInt(item.jumlahKa)} KA
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Plan KA/Hari:</span>
                          <span className="text-sky-300">
                            {formatHaulingDec2(item.planKa)} KA/hari
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Total Tonase:</span>
                          <span className="font-bold text-slate-100">
                            {item.jumlahKa > 0
                              ? `${formatHaulingTonExact(item.totalTonase)} MT`
                              : '0 MT'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Rata-rata Durasi:</span>
                          <span className="font-bold text-slate-100">
                            {item.avgDurasi !== null
                              ? `${formatHaulingDec2(item.avgDurasi)} menit`
                              : '–'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Rata-rata FD:</span>
                          <span className="font-bold text-slate-100">
                            {item.avgFd !== null
                              ? `${formatHaulingDec2(item.avgFd)} FD`
                              : '–'}
                          </span>
                        </div>
                      </div>

                      {item.hasOutlier && (
                        <div className="bg-amber-950/70 border border-amber-500/40 rounded-lg p-2 text-[11px] text-amber-200">
                          <div className="font-bold flex items-center gap-1 text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Outlier Durasi (&gt;{config.outlierDurationThresholdMinutes} mnt):</span>
                          </div>
                          {item.outlierDetails.map((od, i) => (
                            <div key={i} className="mt-0.5 text-amber-100/90">
                              {od}
                            </div>
                          ))}
                        </div>
                      )}

                      {item.kendalaList.length > 0 && (
                        <div className="border-t border-slate-800 pt-1.5 text-[11px]">
                          <span className="text-slate-400 font-semibold">Kendala: </span>
                          <span className="text-amber-300">
                            {item.kendalaList.join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {referencePlanKa !== null && (
                <ReferenceLine
                  y={referencePlanKa}
                  stroke="#38BDF8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Plan: ${formatHaulingDec2(referencePlanKa)} KA/hari`,
                    position: 'insideTopRight',
                    fill: '#38BDF8',
                    fontSize: 11,
                  }}
                />
              )}
              <Bar
                dataKey="value"
                name="Jumlah KA / Hari"
                radius={[5, 5, 0, 0]}
                maxBarSize={36}
              >
                {chartData.map((entry) => {
                  const target = entry.planKa ?? referencePlanKa ?? 5.95;
                  const isGreen = entry.value >= target;
                  return (
                    <Cell
                      key={entry.key}
                      fill={isGreen ? 'url(#kaGreenGrad)' : 'url(#kaRedGrad)'}
                      stroke={isGreen ? '#10B981' : '#EF4444'}
                      strokeWidth={1}
                    />
                  );
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Footer + Expandable Detail Table Button */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4 font-mono-num">
            <span>
              Total: <strong className="text-slate-200">{formatHaulingInt(activePeriodMeta.totalKa)} KA</strong> ({activePeriodMeta.calendarDays} hari)
            </span>
            <span>
              Rata-rata: <strong className="text-emerald-400">{formatHaulingDec2(chartStats.avg)} KA/hari</strong>
            </span>
            <span>
              Min: <strong className="text-slate-200">{chartPeriod === 'Yearly' ? formatHaulingDec2(chartStats.min) : formatHaulingInt(chartStats.min)} KA</strong>
            </span>
            <span>
              Maks: <strong className="text-slate-200">{chartPeriod === 'Yearly' ? formatHaulingDec2(chartStats.max) : formatHaulingInt(chartStats.max)} KA</strong>
            </span>
          </div>

          <button
            onClick={() => setIsDetailTableOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-colors"
          >
            <span>
              {isDetailTableOpen ? 'Sembunyikan Detail Harian' : `Lihat Tabel Detail (${chartData.length} ${chartPeriod === 'Yearly' ? 'Bulan' : 'Hari'})`}
            </span>
            {isDetailTableOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Expandable Small Table: Tanggal | Jumlah KA | Tonase | Rata-rata Durasi | Rata-rata FD | Kendala */}
        {isDetailTableOpen && (
          <div className="mt-4 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80">
            <div className="max-h-80 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">
                      {chartPeriod === 'Yearly' ? 'Bulan (2026)' : 'Tanggal'}
                    </th>
                    <th className="py-2.5 px-3.5 text-right">Jumlah KA</th>
                    <th className="py-2.5 px-3.5 text-right">Tonase</th>
                    <th className="py-2.5 px-3.5 text-right">Rata-rata Durasi</th>
                    <th className="py-2.5 px-3.5 text-right">Rata-rata FD</th>
                    <th className="py-2.5 px-3.5">Kendala</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {chartData.map((row) => {
                    const target = row.planKa ?? referencePlanKa ?? 5.95;
                    const isKaMet = row.value >= target;
                    return (
                      <tr key={row.key} className="hover:bg-slate-900/60">
                        <td className="py-2 px-3.5 font-mono-num text-slate-200 whitespace-nowrap">
                          {row.fullLabel}
                        </td>
                        <td
                          className={`py-2 px-3.5 text-right font-mono-num font-bold whitespace-nowrap ${
                            isKaMet ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.isYearlyMonth
                            ? `${formatHaulingInt(row.jumlahKa)} KA (${formatHaulingDec2(row.value)}/hr)`
                            : `${formatHaulingInt(row.jumlahKa)} KA`}
                        </td>
                        <td className="py-2 px-3.5 text-right font-mono-num text-slate-200 whitespace-nowrap">
                          {row.jumlahKa > 0 ? `${formatHaulingTon(row.totalTonase)} Ton` : '–'}
                        </td>
                        <td
                          className={`py-2 px-3.5 text-right font-mono-num whitespace-nowrap ${
                            row.avgDurasi === null
                              ? 'text-slate-500'
                              : row.avgDurasi <= config.planDurasiMenit
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {row.avgDurasi !== null
                            ? `${formatHaulingDec2(row.avgDurasi)} menit`
                            : '–'}
                          {row.hasOutlier && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              Outlier
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3.5 text-right font-mono-num text-slate-200 whitespace-nowrap">
                          {row.avgFd !== null ? `${formatHaulingDec2(row.avgFd)} FD` : '–'}
                        </td>
                        <td className="py-2 px-3.5 text-slate-300">
                          {row.kendalaList.length > 0 ? (
                            <span className="text-amber-300">{row.kendalaList.join('; ')}</span>
                          ) : (
                            <span className="text-slate-500">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
