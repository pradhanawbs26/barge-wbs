import React from 'react';
import { DelayMetric, ProcessedBarge } from '../types';
import { AlertTriangle, Clock, Wrench, CloudRain, Hourglass } from 'lucide-react';

interface DelayParetoChartProps {
  metrics: DelayMetric[];
  barges: ProcessedBarge[];
}

export const DelayParetoChart: React.FC<DelayParetoChartProps> = ({ metrics, barges }) => {
  const maxDelayHours = Math.max(...metrics.map((m) => m.totalJam), 1);
  const totalAllDelay = metrics.reduce((acc, m) => acc + m.totalJam, 0);

  // Icon mapping
  const getIcon = (kategori: string) => {
    if (kategori.includes('Breakdown')) return <Wrench className="w-4 h-4 text-rose-500" />;
    if (kategori.includes('Rain')) return <CloudRain className="w-4 h-4 text-blue-500" />;
    return <Hourglass className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Pareto Chart Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pareto Chart: Distribusi & Kontribusi Delay Operasional
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Prinsip 80/20: Menentukan faktor penundaan paling kritis untuk efisiensi loading batubara di jetty.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Total Akumulasi Delay:</span>
            <div className="text-lg font-extrabold text-slate-900">{totalAllDelay.toFixed(1)} Jam</div>
          </div>
        </div>

        {/* Visual Dual-Axis Chart Canvas (Bar + Cumulative Line) */}
        <div className="relative pt-6 pb-2">
          {/* Reference 80% line */}
          <div className="relative h-64 border-b border-l border-slate-200">
            {/* 80% Dashed Guideline */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-emerald-500 z-10"
              style={{ bottom: '80%' }}
            >
              <span className="absolute -top-3.5 right-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Garis Batas Pareto 80%
              </span>
            </div>

            {/* 100% Guideline */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-slate-200"
              style={{ bottom: '100%' }}
            ></div>

            {/* Bars and Line Points */}
            <div className="absolute inset-0 flex items-end justify-around px-8">
              {metrics.map((item, idx) => {
                const barHeightPct = (item.totalJam / maxDelayHours) * 75; // scale to 75% max height for line room
                const linePointPct = item.kumulatifPersen; // 0 - 100%

                return (
                  <div key={item.kategori} className="flex flex-col items-center flex-1 max-w-[140px] group relative">
                    {/* Floating Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg z-30 whitespace-nowrap">
                      {item.kategori}: {item.totalJam} Jam ({item.kumulatifPersen}% Kumulatif)
                    </div>

                    {/* Cumulative Line Dot marker */}
                    <div
                      className="absolute z-20 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center transition-all duration-500"
                      style={{ bottom: `calc(${linePointPct}% - 8px)` }}
                    >
                      <span className="sr-only">{item.kumulatifPersen}%</span>
                    </div>

                    {/* Cumulative percentage label above dot */}
                    <div
                      className="absolute z-20 text-[11px] font-bold text-emerald-700 bg-white/90 px-1.5 rounded shadow-xs"
                      style={{ bottom: `calc(${linePointPct}% + 10px)` }}
                    >
                      {item.kumulatifPersen}%
                    </div>

                    {/* Delay Value on top of bar */}
                    <div className="text-xs font-bold text-slate-700 mb-1.5">
                      {item.totalJam.toFixed(1)}h
                    </div>

                    {/* Bar */}
                    <div
                      style={{
                        height: `${Math.max(barHeightPct, 6)}%`,
                        backgroundColor: item.color
                      }}
                      className="w-full rounded-t-xl transition-all duration-500 shadow-sm opacity-90 group-hover:opacity-100 group-hover:shadow"
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X Axis Category Labels */}
          <div className="flex justify-around px-8 mt-4 text-xs font-semibold text-slate-700">
            {metrics.map((item) => (
              <div key={item.kategori} className="flex-1 max-w-[160px] text-center flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1 text-slate-800">
                  {getIcon(item.kategori)}
                  <span className="truncate">{item.kategori.split('(')[0]}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">
                  {((item.totalJam / (totalAllDelay || 1)) * 100).toFixed(1)}% dari delay
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Detail Tabel & Stacked Delay per Tongkang */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detail Tabel Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Tabel Rincian Delay & Kontribusi Kumulatif
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="py-2.5">Kategori Delay</th>
                  <th className="py-2.5 text-right">Total Jam</th>
                  <th className="py-2.5 text-right">Kumulatif Jam</th>
                  <th className="py-2.5 text-right">Persen Kumulatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {metrics.map((m) => (
                  <tr key={m.kategori} className="hover:bg-slate-50">
                    <td className="py-3 flex items-center gap-2 font-semibold text-slate-800">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }}></span>
                      {m.kategori}
                    </td>
                    <td className="py-3 text-right font-bold">{m.totalJam.toFixed(1)} Jam</td>
                    <td className="py-3 text-right text-slate-500">{m.kumulatifJam.toFixed(1)} Jam</td>
                    <td className="py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                        {m.kumulatifPersen}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delay Stacked Comparison per Barge */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3">
            Komposisi Delay per Tongkang (Top 5 Paling Terkendala)
          </h4>
          <div className="space-y-3 mt-4">
            {barges
              .filter((b) => b.TotalDelay > 0)
              .sort((a, b) => b.TotalDelay - a.TotalDelay)
              .slice(0, 5)
              .map((barge) => {
                const bPct = (barge.Breakdown / (barge.TotalDelay || 1)) * 100;
                const rPct = (barge.HeavyRain / (barge.TotalDelay || 1)) * 100;
                const wPct = (barge.Waiting / (barge.TotalDelay || 1)) * 100;

                return (
                  <div key={barge.id} className="text-xs">
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>{barge.BG}</span>
                      <span className="text-slate-900">{barge.TotalDelay.toFixed(1)} Jam Delay</span>
                    </div>
                    {/* Stacked Bar */}
                    <div className="h-4 bg-slate-100 rounded-md overflow-hidden flex">
                      {barge.Breakdown > 0 && (
                        <div
                          style={{ width: `${bPct}%` }}
                          className="bg-rose-500 h-full"
                          title={`Breakdown: ${barge.Breakdown}h`}
                        ></div>
                      )}
                      {barge.HeavyRain > 0 && (
                        <div
                          style={{ width: `${rPct}%` }}
                          className="bg-blue-500 h-full"
                          title={`Heavy Rain: ${barge.HeavyRain}h`}
                        ></div>
                      )}
                      {barge.Waiting > 0 && (
                        <div
                          style={{ width: `${wPct}%` }}
                          className="bg-amber-500 h-full"
                          title={`Waiting: ${barge.Waiting}h`}
                        ></div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center gap-4 mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-500 justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Breakdown
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Heavy Rain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Waiting
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
