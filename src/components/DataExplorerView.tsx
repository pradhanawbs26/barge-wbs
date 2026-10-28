import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Search,
  Settings2,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { BargeRecord, ColumnMapping, EfficiencyRecord } from '../types';

interface DataExplorerViewProps {
  barges: BargeRecord[];
  efficiencyRecords: EfficiencyRecord[];
  rawBaseHeaders: string[];
  rawBase2Headers: string[];
  columnMapping: ColumnMapping;
  onUpdateColumnMapping: (next: ColumnMapping) => void;
  onResetColumnMapping: () => void;
}

type SortField = 'noBarge' | 'dateObj' | 'tonnage' | 'effectiveRateTph' | 'totalTurnaroundHours' | 'standbyHours';

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  barges,
  efficiencyRecords,
  rawBaseHeaders,
  rawBase2Headers,
  columnMapping,
  onUpdateColumnMapping,
  onResetColumnMapping,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELOW_1350' | 'OVER_LAYTIME' | 'ON_TARGET'>('ALL');
  const [sortField, setSortField] = useState<SortField>('noBarge');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showMappingPanel, setShowMappingPanel] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Rule-Based Insights (Executive Decision Recommendations)
  const overLaytimeBarges = useMemo(() => {
    return [...barges]
      .filter((b) => b.totalTurnaroundHours > 9.5)
      .sort((a, b) => b.totalTurnaroundHours - a.totalTurnaroundHours);
  }, [barges]);

  const underTargetBlcBarges = useMemo(() => {
    return [...barges]
      .filter((b) => b.effectiveRateTph < 1350)
      .sort((a, b) => a.effectiveRateTph - b.effectiveRateTph);
  }, [barges]);

  const fuelAnomalyDays = useMemo(() => {
    return efficiencyRecords.filter((r) => r.isAnomaly);
  }, [efficiencyRecords]);

  // Filtered & Sorted Table Data
  const filteredBarges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return barges
      .filter((b) => {
        const matchesQuery =
          !q ||
          b.bargeName.toLowerCase().includes(q) ||
          b.tugBoat.toLowerCase().includes(q) ||
          b.customerCode.toLowerCase().includes(q) ||
          b.dateStr.toLowerCase().includes(q) ||
          String(b.noBarge).includes(q);

        if (!matchesQuery) return false;
        if (statusFilter === 'BELOW_1350') return b.effectiveRateTph < 1350;
        if (statusFilter === 'OVER_LAYTIME') return b.totalTurnaroundHours > 9.0;
        if (statusFilter === 'ON_TARGET') return b.effectiveRateTph >= 1350 && b.totalTurnaroundHours <= 9.0;
        return true;
      })
      .sort((a, b) => {
        let vA: number = a.noBarge;
        let vB: number = b.noBarge;
        if (sortField === 'dateObj') {
          vA = a.dateObj.getTime();
          vB = b.dateObj.getTime();
        } else if (sortField === 'tonnage') {
          vA = a.tonnage;
          vB = b.tonnage;
        } else if (sortField === 'effectiveRateTph') {
          vA = a.effectiveRateTph;
          vB = b.effectiveRateTph;
        } else if (sortField === 'totalTurnaroundHours') {
          vA = a.totalTurnaroundHours;
          vB = b.totalTurnaroundHours;
        } else if (sortField === 'standbyHours') {
          vA = a.standbyHours;
          vB = b.standbyHours;
        }
        return sortAsc ? vA - vB : vB - vA;
      });
  }, [barges, searchQuery, statusFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredBarges.length / pageSize));
  const paginatedBarges = filteredBarges.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  // Export Clean CSV / Excel compatible file
  const handleExportCsv = () => {
    const headers = [
      'No Barge',
      'Tanggal (2026)',
      'Tug Boat',
      'Barge Name',
      'Customer / Cargo',
      'Tonase Loading (MT)',
      'Plan Tonase (MT)',
      'Effective Loading (Jam)',
      'Standby Idle (Jam)',
      'Breakdown (Jam)',
      'Weather / External (Jam)',
      'Total Turnaround TAT (Jam)',
      'Gross Rate (TPH)',
      'Effective BLC Rate (TPH)',
      'Status Target 1350 TPH',
      'Fuel Ratio Est (L/Ton)',
      'Remarks BASE2',
    ];

    const rows = filteredBarges.map((b) => [
      b.noBarge,
      b.dateStr,
      `"${b.tugBoat}"`,
      `"${b.bargeName}"`,
      `"${b.customerCode} - ${b.cargoType}"`,
      b.tonnage.toFixed(2),
      b.planTonnage.toFixed(2),
      b.effectiveLoadingHours.toFixed(2),
      b.standbyHours.toFixed(2),
      b.breakdownHours.toFixed(2),
      b.weatherExternalHours.toFixed(2),
      b.totalTurnaroundHours.toFixed(2),
      b.grossRateTph.toFixed(2),
      b.effectiveRateTph.toFixed(2),
      b.effectiveRateTph >= 1350 ? 'TERCAPAI (>=1350 TPH)' : 'DI BAWAH TARGET (<1350 TPH)',
      b.fuelRatioLPerTon.toFixed(4),
      `"${b.remarks.join('; ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Port_Command_Center_Loading_To_Barge_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: EXECUTIVE DECISION RECOMMENDATIONS (Rule-Based Insights) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-50 mt-0.5">
              Executive Decision Recommendations — Loading to Barge 2026
            </h2>
          </div>
          <button
            onClick={() => setShowMappingPanel(!showMappingPanel)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-700 hover:border-sky-500 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>{showMappingPanel ? 'Tutup Diagnostik Kolom' : 'Diagnostik Pemetaan Kolom (Column Mapping)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Insight Card 1: Over-Laytime / Demurrage Risk Barges */}
          <div className="bg-slate-950 border border-rose-500/30 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                <span>1. Tongkang Over-Laytime / Risiko Demurrage (&gt;9,5 Jam)</span>
                <ShieldAlert className="w-4 h-4 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Terdapat <strong className="font-mono-num text-slate-100">{overLaytimeBarges.length} tongkang</strong> pada periode ini yang melampaui batas jam sandar aman (8,22 – 8,78 jam):
              </p>
              <div className="mt-3 space-y-1.5">
                {overLaytimeBarges.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-900 rounded border border-slate-800"
                  >
                    <span className="font-medium text-slate-200 truncate pr-2">
                      {b.bargeName} <span className="text-slate-500">({b.dateStr})</span>
                    </span>
                    <span className="font-mono-num font-bold text-rose-400 shrink-0">
                      TAT: {b.totalTurnaroundHours.toFixed(2)} Jam
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
              <strong>Tindakan:</strong> Percepat proses Initial/Final Draft Survey &amp; siagakan Assist Tugboat 30 menit sebelum <em>Completed Loading</em>.
            </div>
          </div>

          {/* Insight Card 2: BLC Rate Drop < 1.350 TPH */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>2. Evaluasi BLC Rate Jatuh &lt; 1.350 TPH</span>
                <AlertTriangle className="w-4 h-4 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tercatat <strong className="font-mono-num text-slate-100">{underTargetBlcBarges.length} tongkang</strong> dengan produktivitas muat di bawah standar baku 1.350 TPH:
              </p>
              <div className="mt-3 space-y-1.5">
                {underTargetBlcBarges.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-900 rounded border border-slate-800"
                  >
                    <span className="font-medium text-slate-200 truncate pr-2">
                      {b.bargeName} <span className="text-slate-500">({b.dateStr})</span>
                    </span>
                    <span className="font-mono-num font-bold text-amber-400 shrink-0">
                      {b.effectiveRateTph.toFixed(0)} TPH
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
              <strong>Penyebab Utama:</strong> Starvasi hopper akibat antrean <em>Moving Cargo</em> &amp; Cycle Time Flat Deck &gt; 120 menit.
            </div>
          </div>

          {/* Insight Card 3: Fuel Ratio & HM Ratio Spike Warning */}
          <div className="bg-slate-950 border border-sky-500/30 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                <span>3. Peringatan Lonjakan Fuel Ratio &amp; HM Ratio</span>
                <Settings2 className="w-4 h-4 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ditemukan <strong className="font-mono-num text-slate-100">{fuelAnomalyDays.length} hari</strong> dengan lonjakan konsumsi BBM &amp; HM pada aktivitas <em>Loading to Barge</em>:
              </p>
              <div className="mt-3 space-y-1.5">
                {fuelAnomalyDays.slice(0, 4).map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-900 rounded border border-slate-800"
                  >
                    <span className="font-medium text-slate-200">{d.dateStr}</span>
                    <span className="font-mono-num text-rose-400 font-semibold">
                      FR: {d.loadingFuelRatioActual} (Plan 33,68) · HM: {d.loadingHmRatioActual}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
              <strong>Tindakan:</strong> Terapkan protokol <em>Auto-Shutdown Engine</em> untuk Wheel Loader/Dozer jetty saat jeda tunggu tongkang &gt;15 menit.
            </div>
          </div>
        </div>
      </div>

      {/* OPTIONAL DIAGNOSTIC COLUMN MAPPING INSPECTOR */}
      {showMappingPanel && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Diagnostik Pemetaan Kolom Interaktif (Sheet BASE &amp; BASE2)
              </h3>
              <p className="text-xs text-slate-400">
                Jika struktur kolom di Google Spreadsheet berubah, sesuaikan indeks kolom di bawah ini secara langsung tanpa mengubah kode.
              </p>
            </div>
            <button
              onClick={onResetColumnMapping}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
            >
              Reset ke Default
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BASE Column Mapping */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="text-xs font-bold text-sky-400 mb-3">
                Pemetaan Kolom Sheet &ldquo;BASE&rdquo; ({rawBaseHeaders.length} Kolom Terdeteksi)
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(
                  [
                    ['noBarge', 'No Barge'],
                    ['date', 'Tanggal (DATE)'],
                    ['tugBoat', 'Tug Boat'],
                    ['barge', 'Nama Barge'],
                    ['totalTonase', 'Total Tonase (MT)'],
                    ['grossPdty', 'Gross Pdty (TPH)'],
                    ['grossDuration', 'Gross Duration (Jam)'],
                    ['netDuration', 'Net Loading Duration (Jam)'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-slate-400 mb-1">{label}</label>
                    <select
                      value={columnMapping.base[key]}
                      onChange={(e) =>
                        onUpdateColumnMapping({
                          ...columnMapping,
                          base: { ...columnMapping.base, [key]: parseInt(e.target.value, 10) },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono-num"
                    >
                      {rawBaseHeaders.map((h, idx) => (
                        <option key={idx} value={idx}>
                          Kolom {idx}: {h || '(Kosong)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* BASE2 Column Mapping */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="text-xs font-bold text-emerald-400 mb-3">
                Pemetaan Kolom Sheet &ldquo;BASE2&rdquo; ({rawBase2Headers.length} Kolom Terdeteksi)
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(
                  [
                    ['noBarge', 'No Barge (Join Key)'],
                    ['barge', 'Nama Barge (BG)'],
                    ['loadingToBarge', 'Loading to Barge (Jam)'],
                    ['waitingCargo', 'Waiting Cargo (Jam)'],
                    ['breakdown', 'Breakdown Alat (Jam)'],
                    ['heavyRain', 'Heavy Rain (Jam)'],
                    ['externalProblem', 'External Problem (Jam)'],
                    ['problem', 'Catatan Problem / Remark'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-slate-400 mb-1">{label}</label>
                    <select
                      value={columnMapping.base2[key]}
                      onChange={(e) =>
                        onUpdateColumnMapping({
                          ...columnMapping,
                          base2: { ...columnMapping.base2, [key]: parseInt(e.target.value, 10) },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono-num"
                    >
                      {rawBase2Headers.map((h, idx) => (
                        <option key={idx} value={idx}>
                          Kolom {idx}: {h ? h.replace(/\n/g, ' ') : '(Kosong)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: INTERACTIVE DATA EXPLORER TABLE (BASE & BASE2 2026) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Tabel Interaktif Inspector Sheet BASE &amp; BASE2 (Tahun 2026 — Aktivitas Loading to Barge)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menampilkan <strong className="font-mono-num text-slate-200">{filteredBarges.length}</strong> rekaman bersih tongkang tahun 2026 dengan rincian durasi sandar, BLC Rate, dan status efisiensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari tongkang, tugboat, kode..."
                className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 w-56"
              />
            </div>

            {/* Quick Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Semua Status ({barges.length})</option>
              <option value="BELOW_1350">BLC &lt; 1.350 TPH (Merah)</option>
              <option value="OVER_LAYTIME">Over-Laytime (&gt; 9 Jam)</option>
              <option value="ON_TARGET">Sesuai Target (&ge; 1.350 TPH)</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* High-Density Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold">
                <th
                  onClick={() => handleSort('noBarge')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>No</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dateObj')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Nama Barge &amp; Tug Boat</th>
                <th className="py-3 px-3 whitespace-nowrap">Kode</th>
                <th
                  onClick={() => handleSort('tonnage')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Tonase (MT)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Eff. Load (Jam)</th>
                <th
                  onClick={() => handleSort('standbyHours')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Idle/Delay (Jam)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalTurnaroundHours')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total TAT (Jam)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('effectiveRateTph')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>BLC Rate (TPH)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Status Target 1.350</th>
                <th className="py-3 px-3 whitespace-nowrap">Catatan Hambatan (BASE2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paginatedBarges.map((b) => {
                const isBlcGood = b.effectiveRateTph >= 1350;
                const totalDelay = Number(
                  (b.standbyHours + b.breakdownHours + b.weatherExternalHours).toFixed(2)
                );
                return (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono-num text-slate-400">#{b.noBarge}</td>
                    <td className="py-2.5 px-3 font-mono-num text-slate-200 whitespace-nowrap">{b.dateStr}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-100">{b.bargeName}</div>
                      <div className="text-[11px] text-slate-400">{b.tugBoat}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-slate-300">{b.customerCode}</td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-100">
                      {b.tonnage.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-emerald-400">
                      {b.effectiveLoadingHours.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-amber-400">
                      {totalDelay.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono-num font-bold ${
                        b.totalTurnaroundHours <= 8.78 ? 'text-slate-200' : 'text-rose-400'
                      }`}
                    >
                      {b.totalTurnaroundHours.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono-num font-bold ${
                        isBlcGood ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {b.effectiveRateTph.toLocaleString('id-ID', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isBlcGood ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>&ge; 1.350 TPH</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>&lt; 1.350 TPH</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[220px] truncate">
                      {b.remarks.length > 0 ? b.remarks.join(' · ') : 'Operasi Normal'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div>
            Menampilkan baris{' '}
            <strong className="font-mono-num text-slate-200">
              {filteredBarges.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            –{' '}
            <strong className="font-mono-num text-slate-200">
              {Math.min(currentPage * pageSize, filteredBarges.length)}
            </strong>{' '}
            dari <strong className="font-mono-num text-slate-200">{filteredBarges.length}</strong> tongkang (2026)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              Sebelumnya
            </button>
            <span className="font-mono-num text-slate-300">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
