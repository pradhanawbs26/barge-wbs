import React, { useState } from 'react';
import { ProcessedBarge } from '../types';
import { Clock, Anchor, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GanttChartProps {
  barges: ProcessedBarge[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ barges }) => {
  const [selectedBarge, setSelectedBarge] = useState<ProcessedBarge | null>(null);

  if (!barges || barges.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        Tidak ada data timeline untuk periode ini.
      </div>
    );
  }

  // Cari rentang waktu min dan max
  const timestamps = barges.flatMap((b) => [
    b.CastInDate.getTime(),
    b.CastOffDate.getTime()
  ]).filter((t) => !isNaN(t));

  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalDurationMs = Math.max(maxTime - minTime, 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Gantt Chart Timeline: Sandar Tongkang (Cast-in ke Cast off)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi sekuensial waktu sandar, proses loading batubara, dan waktu lepas tali.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-sm"></span>
            <span className="text-slate-700">Sesuai Target (≤ Waktu Target)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block shadow-sm"></span>
            <span className="text-slate-700">Over Time (&gt; Waktu Target)</span>
          </div>
        </div>
      </div>

      {/* Timeline Rows Container */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[760px]">
          {/* Time scale header */}
          <div className="flex text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-2 mb-3">
            <div className="w-48 shrink-0 pl-2">Nama Tongkang (BG)</div>
            <div className="flex-1 flex justify-between px-2">
              <span>{new Date(minTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(minTime + totalDurationMs * 0.33).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(minTime + totalDurationMs * 0.66).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(maxTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          {/* List of Barge Timeline bars */}
          <div className="space-y-2.5">
            {barges.map((barge) => {
              const startOffset = Math.max(
                0,
                ((barge.CastInDate.getTime() - minTime) / totalDurationMs) * 100
              );
              const durationPct = Math.max(
                1.5,
                ((barge.CastOffDate.getTime() - barge.CastInDate.getTime()) /
                  totalDurationMs) *
                  100
              );

              const isOnTarget = barge.Status === 'Sesuai Target';

              return (
                <div
                  key={barge.id}
                  onClick={() => setSelectedBarge(barge)}
                  className={`group relative flex items-center h-10 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer px-2 ${
                    selectedBarge?.id === barge.id ? 'bg-indigo-50/60 ring-1 ring-indigo-200' : ''
                  }`}
                >
                  {/* Barge Name & Status Badge */}
                  <div className="w-48 shrink-0 flex items-center justify-between pr-3">
                    <span className="text-xs font-semibold text-slate-800 truncate" title={barge.BG}>
                      {barge.BG}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isOnTarget
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isOnTarget ? 'Target' : 'Late'}
                    </span>
                  </div>

                  {/* Timeline Bar Track */}
                  <div className="flex-1 relative h-6 bg-slate-100 rounded-lg overflow-hidden">
                    {/* Background grid line markers */}
                    <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
                      <div className="border-r border-slate-400"></div>
                      <div className="border-r border-slate-400"></div>
                      <div className="border-r border-slate-400"></div>
                      <div></div>
                    </div>

                    {/* Active Barge Bar */}
                    <div
                      style={{
                        left: `${startOffset}%`,
                        width: `${durationPct}%`
                      }}
                      className={`absolute top-0 bottom-0 rounded-md transition-all duration-300 flex items-center justify-between px-2 text-[11px] font-bold text-white shadow-sm ${
                        isOnTarget
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-r from-rose-500 to-amber-600'
                      }`}
                      title={`${barge.BG} | Cast-in: ${barge.CastIn} | Cast off: ${barge.CastOff}`}
                    >
                      <span className="truncate pr-1 drop-shadow-sm">
                        {barge.Loading}h Ldg
                      </span>
                      {barge.TotalDelay > 0 && (
                        <span className="text-[9px] bg-black/25 px-1 py-0.2 rounded font-normal shrink-0">
                          +{barge.TotalDelay}h Delay
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail drawer / box when clicked */}
      {selectedBarge && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl text-white ${
                selectedBarge.Status === 'Sesuai Target' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            >
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">{selectedBarge.BG}</div>
              <div className="text-slate-500">
                Tanggal: <span className="font-semibold text-slate-700">{selectedBarge.DD}</span> | Waktu Sandar: {selectedBarge.CastIn} s/d {selectedBarge.CastOff}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-slate-400 font-medium">Volume Batubara</div>
              <div className="font-bold text-slate-800 text-sm">
                {selectedBarge.TonRit.toLocaleString('id-ID')} MT
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Produktivitas BLC</div>
              <div className="font-bold text-slate-800 text-sm">
                {selectedBarge.AktualProduktivitas.toFixed(1)} T/h
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Idle Time Antar Tongkang</div>
              <div className="font-bold text-slate-800 text-sm">
                {selectedBarge.IdleTime.toFixed(1)} Jam
              </div>
            </div>
            <button
              onClick={() => setSelectedBarge(null)}
              className="text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md"
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
