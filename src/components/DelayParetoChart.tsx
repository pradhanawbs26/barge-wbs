import React, { useState } from 'react';
import { DelayMetric, ProcessedBarge } from '../types';
import {
  AlertTriangle,
  Clock,
  Wrench,
  CloudRain,
  Hourglass,
  ShieldAlert,
  FileText,
  Anchor,
  Calendar
} from 'lucide-react';
import { formatDisplayDate, formatDecimalNumber } from '../utils/bargeAnalytics';

interface DelayParetoChartProps {
  metrics: DelayMetric[];
  barges: ProcessedBarge[];
}

export const DelayParetoChart: React.FC<DelayParetoChartProps> = ({ metrics, barges }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalAllDelay = metrics.reduce((acc, m) => acc + m.totalJam, 0);
  const maxCategoryDelay = Math.max(...metrics.map((m) => m.totalJam), 1);

  // Left Y-Axis scale maximum (Ceiling rounded nicely to next even integer)
  const yAxisMaxHours = Math.ceil(maxCategoryDelay * 1.15) || 10;

  // Identify categories that fall within the Pareto 80% cumulative threshold
  const vital80Categories = metrics.filter((m) => {
    // Category is vital if it or its previous cumulative % was <= 80%
    const prev = metrics.find((x, idx) => metrics[idx + 1] === m)?.kumulatifPersen || 0;
    return prev < 80;
  });

  // Icon mapping for canonical categories
  const getCategoryIcon = (kategori: string) => {
    const k = kategori.toLowerCase();
    if (k.includes('breakdown')) return <Wrench className="w-4 h-4 text-rose-500" />;
    if (k.includes('rain') || k.includes('cuaca')) return <CloudRain className="w-4 h-4 text-blue-500" />;
    if (k.includes('cast-in') || k.includes('cast off') || k.includes('sandar')) return <Anchor className="w-4 h-4 text-sky-500" />;
    if (k.includes('draft') || k.includes('survey')) return <FileText className="w-4 h-4 text-cyan-500" />;
    return <Hourglass className="w-4 h-4 text-amber-500" />;
  };

  // Canvas geometry constants for SVG dual-axis chart
  const svgWidth = 840;
  const svgHeight = 280;
  const paddingLeft = 50;
  const paddingRight = 55;
  const paddingTop = 35;
  const paddingBottom = 45;
  const chartAreaWidth = svgWidth - paddingLeft - paddingRight;
  const chartAreaHeight = svgHeight - paddingTop - paddingBottom;

  const numCategories = metrics.length;
  const slotWidth = chartAreaWidth / Math.max(numCategories, 1);
  const barWidth = Math.min(slotWidth * 0.45, 48);

  // Calculate coordinates for bars & cumulative line points
  const points = metrics.map((item, idx) => {
    const xCenter = paddingLeft + slotWidth * idx + slotWidth / 2;
    // Left axis (Hours)
    const barHeightPx = (item.totalJam / yAxisMaxHours) * chartAreaHeight;
    const yBarTop = paddingTop + chartAreaHeight - barHeightPx;

    // Right axis (Percentage 0 - 100%)
    const lineYPx = paddingTop + chartAreaHeight - (item.kumulatifPersen / 100) * chartAreaHeight;

    return {
      xCenter,
      yBarTop,
      barHeightPx,
      lineYPx,
      item,
      idx
    };
  });

  // Generate smooth SVG polyline path for cumulative percentage
  const linePathD = points.reduce((path, p, i) => {
    return i === 0 ? `M ${p.xCenter} ${p.lineYPx}` : `${path} L ${p.xCenter} ${p.lineYPx}`;
  }, '');

  // 80% Pareto Reference Line Y Position in SVG
  const pareto80YPx = paddingTop + chartAreaHeight - 0.8 * chartAreaHeight;

  return (
    <div className="space-y-6">
      {/* Pareto Chart Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 overflow-hidden">
        {/* Header & Subtitle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-100 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Pareto Chart: Distribusi & Kontribusi Delay Operasional
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Prinsip Pareto (Aturan 80/20): Mengidentifikasi 20% faktor penundaan paling kritis yang memberikan kontribusi terbesar (80%) terhadap akumulasi hambatan loading batubara di jetty.
            </p>
          </div>

          {/* KPI Summary Strip */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Delay</div>
              <div className="text-base font-extrabold text-slate-900 font-mono tabular-nums">{totalAllDelay.toFixed(1)} Jam</div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald-600" />
                Faktor Kritis (&le;80%)
              </div>
              <div className="text-xs font-bold text-emerald-900 mt-0.5 truncate max-w-[180px]" title={vital80Categories.map(c => c.kategori).join(', ')}>
                {vital80Categories.length > 0 ? `${vital80Categories.length} Kategori Utama` : '1 Kategori'}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Highlight Card */}
        <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 mb-6 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              <strong className="text-slate-900 font-semibold">Kesimpulan Analisis Pareto:</strong>{' '}
              {vital80Categories.length > 0 ? (
                <>
                  Faktor <span className="font-bold text-emerald-700">{vital80Categories.map((c) => c.kategori).join(' & ')}</span> menyumbang{' '}
                  <span className="font-bold text-emerald-700">{vital80Categories[vital80Categories.length - 1]?.kumulatifPersen}%</span> dari total seluruh delay operasional jetty.
                </>
              ) : (
                'Data delay terdistribusi di beberapa aktivitas.'
              )}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
            {metrics.length} Kategori Terstandardisasi
          </span>
        </div>

        {/* Scrollable Container so the chart NEVER overflows on narrow screens */}
        <div className="w-full overflow-x-auto pb-2 select-none scrollbar-thin">
          <div className="min-w-[720px] relative">
            {/* SVG Visual Canvas for Chart (Dual-Axis) */}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible font-sans"
              style={{ maxHeight: '340px' }}
            >
              {/* Background Horizontal Grid Lines for Left Y-Axis (Delay Hours) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + chartAreaHeight * (1 - ratio);
                const valHours = (ratio * yAxisMaxHours).toFixed(1);
                const valPct = Math.round(ratio * 100);

                return (
                  <g key={`grid-${ratio}`}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    {/* Left Axis Label (Hours) */}
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono font-medium"
                    >
                      {valHours}h
                    </text>
                    {/* Right Axis Label (Percentage) */}
                    <text
                      x={svgWidth - paddingRight + 8}
                      y={y + 4}
                      textAnchor="start"
                      className="text-[10px] fill-emerald-600 font-mono font-semibold"
                    >
                      {valPct}%
                    </text>
                  </g>
                );
              })}

              {/* 80% Pareto Target Guideline */}
              <line
                x1={paddingLeft}
                y1={pareto80YPx}
                x2={svgWidth - paddingRight}
                y2={pareto80YPx}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              {/* Pareto 80% Badge on Right Axis */}
              <g transform={`translate(${svgWidth - paddingRight + 6}, ${pareto80YPx - 10})`}>
                <rect x="0" y="0" width="70" height="20" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="35" y="13" textAnchor="middle" className="text-[9px] fill-emerald-800 font-bold">
                  Batas 80%
                </text>
              </g>

              {/* BAR COLUMNS */}
              {points.map((p) => {
                const isHovered = hoveredIdx === p.idx;
                const isVital = p.item.kumulatifPersen <= 80 || (p.idx > 0 && points[p.idx - 1].item.kumulatifPersen < 80);

                return (
                  <g
                    key={`bar-group-${p.item.kategori}`}
                    onMouseEnter={() => setHoveredIdx(p.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Bar */}
                    <rect
                      x={p.xCenter - barWidth / 2}
                      y={p.yBarTop}
                      width={barWidth}
                      height={Math.max(p.barHeightPx, 4)}
                      rx="6"
                      fill={p.item.color}
                      opacity={isHovered ? 1 : 0.88}
                      className="transition-opacity duration-150"
                    />

                    {/* Delay Hours Label on top of Bar */}
                    <text
                      x={p.xCenter}
                      y={p.yBarTop - 8}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-slate-700 font-mono"
                    >
                      {p.item.totalJam.toFixed(1)}h
                    </text>
                  </g>
                );
              })}

              {/* CUMULATIVE PERCENTAGE LINE (CONNECTED SVG PATH) */}
              <path
                d={linePathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* CUMULATIVE LINE DOT MARKERS & PERCENTAGE BADGES */}
              {points.map((p) => {
                const isHovered = hoveredIdx === p.idx;
                const pct = p.item.kumulatifPersen;

                return (
                  <g
                    key={`dot-group-${p.item.kategori}`}
                    onMouseEnter={() => setHoveredIdx(p.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    {/* Outer Glow on hover */}
                    {isHovered && (
                      <circle
                        cx={p.xCenter}
                        cy={p.lineYPx}
                        r="9"
                        fill="#059669"
                        opacity="0.25"
                      />
                    )}

                    {/* Dot Center */}
                    <circle
                      cx={p.xCenter}
                      cy={p.lineYPx}
                      r="4.5"
                      fill="#059669"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Cumulative Percentage Badge above dot */}
                    <g transform={`translate(${p.xCenter}, ${p.lineYPx - 14})`}>
                      <rect
                        x="-19"
                        y="-12"
                        width="38"
                        height="16"
                        rx="4"
                        fill="#065f46"
                        className="shadow-xs"
                      />
                      <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        className="text-[9.5px] fill-white font-bold font-mono"
                      >
                        {pct}%
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Axis Titles */}
              <text x={paddingLeft - 8} y={paddingTop - 15} textAnchor="start" className="text-[10px] fill-slate-500 font-semibold">
                (Jam Delay)
              </text>
              <text x={svgWidth - paddingRight + 8} y={paddingTop - 15} textAnchor="end" className="text-[10px] fill-emerald-700 font-semibold">
                (% Kumulatif)
              </text>
            </svg>

            {/* X-AXIS CATEGORY LABELS BELOW CHART */}
            <div
              className="flex justify-between items-start mt-2 border-t border-slate-200/80 pt-3"
              style={{
                paddingLeft: `${(paddingLeft / svgWidth) * 100}%`,
                paddingRight: `${(paddingRight / svgWidth) * 100}%`
              }}
            >
              {metrics.map((item, idx) => {
                const isHovered = hoveredIdx === idx;
                const sharePct = totalAllDelay > 0 ? ((item.totalJam / totalAllDelay) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={`x-label-${item.kategori}`}
                    style={{ width: `${100 / metrics.length}%` }}
                    className={`text-center px-1 flex flex-col items-center transition-all duration-150 ${
                      isHovered ? 'scale-105 font-bold' : ''
                    }`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 leading-tight justify-center max-w-full">
                      <span className="shrink-0">{getCategoryIcon(item.kategori)}</span>
                      <span className="truncate max-w-[100px]" title={item.kategori}>
                        {item.kategori}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {sharePct}% dari total
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Detail Tabel & Stacked Delay per Tongkang */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detail Tabel Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Tabel Rincian Kontribusi Kumulatif Delay
            </h4>
            <span className="text-[11px] font-semibold text-slate-400">
              Urut Terbesar &rarr; Terkecil
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-2">Kategori Delay</th>
                  <th className="py-2.5 px-2 text-right">Total Jam</th>
                  <th className="py-2.5 px-2 text-right">Kumulatif</th>
                  <th className="py-2.5 px-2 text-right">Persen Kumulatif</th>
                  <th className="py-2.5 px-2 text-center">Status Pareto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {metrics.map((m, idx) => {
                  const prevPct = idx > 0 ? metrics[idx - 1].kumulatifPersen : 0;
                  const isParetoVital = prevPct < 80;

                  return (
                    <tr key={m.kategori} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-2 flex items-center gap-2 font-semibold text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }}></span>
                        <span className="truncate max-w-[170px]" title={m.kategori}>
                          {m.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono tabular-nums">
                        {m.totalJam.toFixed(1)} Jam
                      </td>
                      <td className="py-3 px-2 text-right text-slate-500 font-mono tabular-nums">
                        {m.kumulatifJam.toFixed(1)} Jam
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-800 font-mono tabular-nums">
                        {m.kumulatifPersen}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isParetoVital
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isParetoVital ? 'Prioritas 80%' : 'Sekunder'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delay Stacked Comparison per Barge */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Top 5 Worst Tongkang by Delay
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar 5 armada tongkang dengan akumulasi durasi delay operasional tertinggi
                </p>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 shrink-0">
                Worst Performers
              </span>
            </div>

            <div className="space-y-4 mt-2">
              {(() => {
                const worst5 = barges
                  .filter((b) => b.TotalDelay > 0)
                  .sort((a, b) => b.TotalDelay - a.TotalDelay)
                  .slice(0, 5);

                if (worst5.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-slate-400">
                      Tidak ada data delay tongkang pada periode ini.
                    </div>
                  );
                }

                const maxWorstDelay = Math.max(...worst5.map((b) => b.TotalDelay), 1);

                return worst5.map((barge, idx) => {
                  const bPct = (barge.Breakdown / (barge.TotalDelay || 1)) * 100;
                  const rPct = (barge.HeavyRain / (barge.TotalDelay || 1)) * 100;
                  const wPct = (barge.Waiting / (barge.TotalDelay || 1)) * 100;
                  const othHrs = Math.max(0, barge.TotalDelay - (barge.Breakdown + barge.HeavyRain + barge.Waiting));
                  const oPct = (othHrs / (barge.TotalDelay || 1)) * 100;

                  // Proportional bar width relative to max worst delay so severity is visually obvious
                  const barWidthPct = Math.max((barge.TotalDelay / maxWorstDelay) * 100, 15);

                  return (
                    <div key={barge.id} className="text-xs bg-slate-50/60 border border-slate-200/60 rounded-xl p-3 space-y-2">
                      {/* Line 1: Rank, Barge Name, Date, Delay Hours */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-slate-900 font-extrabold">{barge.BG}</span>
                          {barge.TB && <span className="text-[11px] font-normal text-slate-400 font-mono">({barge.TB})</span>}
                          
                          {/* Tanggal Pemuatan / Kejadian */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDisplayDate(barge.DD)}
                          </span>
                        </div>

                        <span className="text-xs font-mono font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200/60">
                          {formatDecimalNumber(barge.TotalDelay, 1, 'comma')} Jam Delay
                        </span>
                      </div>

                      {/* Line 2: Stacked Proportional Bar */}
                      <div className="w-full bg-slate-200/70 h-3.5 rounded-md overflow-hidden flex shadow-2xs" style={{ width: `${barWidthPct}%` }}>
                        {barge.Breakdown > 0 && (
                          <div
                            style={{ width: `${bPct}%` }}
                            className="bg-rose-500 h-full"
                            title={`Breakdown BLC: ${barge.Breakdown.toFixed(1)}h`}
                          ></div>
                        )}
                        {barge.HeavyRain > 0 && (
                          <div
                            style={{ width: `${rPct}%` }}
                            className="bg-blue-500 h-full"
                            title={`Heavy Rain: ${barge.HeavyRain.toFixed(1)}h`}
                          ></div>
                        )}
                        {barge.Waiting > 0 && (
                          <div
                            style={{ width: `${wPct}%` }}
                            className="bg-amber-500 h-full"
                            title={`Waiting / Standby: ${barge.Waiting.toFixed(1)}h`}
                          ></div>
                        )}
                        {othHrs > 0.05 && (
                          <div
                            style={{ width: `${oPct}%` }}
                            className="bg-indigo-500 h-full"
                            title={`Draft Survey / Rest / Other: ${othHrs.toFixed(1)}h`}
                          ></div>
                        )}
                      </div>

                      {/* Line 3: Small Breakdown Pill Indicators */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono flex-wrap pt-0.5">
                        {barge.Breakdown > 0 && <span className="text-rose-600 font-semibold">Breakdown: {barge.Breakdown.toFixed(1)}h</span>}
                        {barge.HeavyRain > 0 && <span className="text-blue-600 font-semibold">Hujan: {barge.HeavyRain.toFixed(1)}h</span>}
                        {barge.Waiting > 0 && <span className="text-amber-600 font-semibold">Waiting: {barge.Waiting.toFixed(1)}h</span>}
                        {othHrs > 0.05 && <span className="text-indigo-600 font-semibold">Survey/Rest: {othHrs.toFixed(1)}h</span>}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-500 justify-center flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Breakdown BLC
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Heavy Rain / Cuaca
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Waiting / Standby
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Survey / Rest / Shift
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
