/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  BarChart3,
  Calendar,
  Clock,
  Database,
  Fuel,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  Ship,
  TableProperties,
} from 'lucide-react';
import {
  BargeRecord,
  ColumnMapping,
  EfficiencyRecord,
  ExecutiveMatrix,
  PeriodType,
  SheetSyncStatus,
} from './types';
import {
  DEFAULT_COLUMN_MAPPING,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  extractSpreadsheetId,
  fetchSheetCsv,
  getAnchorDateForMonth,
  parseEfficiencyData,
  parseExecutiveMatrix,
  processBaseAndBase2,
} from './services/sheetService';
import {
  FALLBACK_BARGES_2026,
  FALLBACK_EFFICIENCY_2026,
  FALLBACK_EXECUTIVE_MATRIX,
} from './data/fallbackData';
import { MorningMeetingView } from './components/MorningMeetingView';
import { TurnaroundAnatomyView } from './components/TurnaroundAnatomyView';
import { EquipmentEfficiencyView } from './components/EquipmentEfficiencyView';
import { DataExplorerView } from './components/DataExplorerView';
import { DataSourceModal } from './components/DataSourceModal';

type MenuTab = 'MORNING_MEETING' | 'TURNAROUND_ANATOMY' | 'EQUIPMENT_EFFICIENCY' | 'DATA_EXPLORER';

export default function App() {
  const [activeTab, setActiveTab] = useState<MenuTab>('MORNING_MEETING');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('Monthly');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL_2026');
  const [dateRangeStart, setDateRangeStart] = useState<string>('2026-01-01');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('2026-12-31');
  const [selectedBargeName, setSelectedBargeName] = useState<string>('ALL');

  // Raw sheet rows state so user can re-map columns dynamically
  const [rawBaseRows, setRawBaseRows] = useState<string[][]>([]);
  const [rawBase2Rows, setRawBase2Rows] = useState<string[][]>([]);
  const [rawMentariRows, setRawMentariRows] = useState<string[][]>([]);
  const [rawRasioRows, setRawRasioRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SheetSyncStatus>({
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    lastSyncedAt: 'Menghubungkan...',
    isLive: false,
    isSyncing: true,
    error: null,
    counts: {
      baseTotalRows: 1087,
      base2026Rows: FALLBACK_BARGES_2026.length,
      base2TotalRows: 12028,
      base2_2026Rows: 4585,
      mentariRows: 30,
      rasioCyRows: 22,
    },
  });

  // Live Google Spreadsheet Fetcher
  const syncFromGoogleSpreadsheet = useCallback(async (urlOrId: string) => {
    const id = extractSpreadsheetId(urlOrId);
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const [baseCsv, base2Csv, mentariCsv, rasioCsv] = await Promise.all([
        fetchSheetCsv(id, 'BASE'),
        fetchSheetCsv(id, 'BASE2'),
        fetchSheetCsv(id, 'Meeting Mentari').catch(() => fetchSheetCsv(id, 'Resume Performance')),
        fetchSheetCsv(id, 'Rasio CY').catch(() => []),
      ]);

      setRawBaseRows(baseCsv);
      setRawBase2Rows(base2Csv);
      setRawMentariRows(mentariCsv);
      setRawRasioRows(rasioCsv);

      const processed = processBaseAndBase2(baseCsv, base2Csv, DEFAULT_COLUMN_MAPPING);
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setSyncStatus({
        spreadsheetId: id,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}`,
        lastSyncedAt: `${nowStr} WIB`,
        isLive: true,
        isSyncing: false,
        error: null,
        counts: {
          baseTotalRows: baseCsv.length,
          base2026Rows: processed.barges2026.length,
          base2TotalRows: base2Csv.length,
          base2_2026Rows: processed.base2_2026Count,
          mentariRows: mentariCsv.length,
          rasioCyRows: rasioCsv.length,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheet.';
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        isLive: false,
        error: `${msg} Menggunakan data snapshot 2026.`,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }));
    }
  }, []);

  useEffect(() => {
    syncFromGoogleSpreadsheet(DEFAULT_SPREADSHEET_ID);
  }, [syncFromGoogleSpreadsheet]);

  // Process 2026 Barges, Executive Matrix, and Efficiency Records
  const { barges2026, rawBaseHeaders, rawBase2Headers } = useMemo(() => {
    if (rawBaseRows.length > 1) {
      const res = processBaseAndBase2(rawBaseRows, rawBase2Rows, columnMapping);
      if (res.barges2026.length > 0) {
        return res;
      }
    }
    return {
      barges2026: FALLBACK_BARGES_2026,
      rawBaseHeaders: [
        'No Barge',
        'DATE',
        'TUG BOAT',
        'BARGE',
        'CODE',
        'CARGO',
        '',
        'BARGING',
        'Moving',
        'Direct CT',
        'TOTAL TONASE',
      ],
      rawBase2Headers: [
        'No',
        'TB',
        'BG',
        'DD',
        'Date(DD/M/Y)',
        'Start Time',
        'Start End',
        'Cast-in',
        'Waiting Surveyor Initial Draft',
        'Initial draft survey',
        'Moving Cargo',
        'Tambahan Cargo Bongkaran',
        'Collecting Cargo',
        'Prepare Loading',
        'Loading to Barge',
        'Waiting Cargo',
        'Breakdown',
        'Change Shift',
        'Rest Time',
        'Safety Talk, P5M, P2H',
        'Heavy Rain',
      ],
      base2_2026Count: 4585,
    };
  }, [rawBaseRows, rawBase2Rows, columnMapping]);

  const executiveMatrix: ExecutiveMatrix = useMemo(() => {
    if (barges2026.length > 0 || rawMentariRows.length > 5) {
      return parseExecutiveMatrix(rawMentariRows, barges2026, selectedMonthFilter);
    }
    return FALLBACK_EXECUTIVE_MATRIX;
  }, [rawMentariRows, barges2026, selectedMonthFilter]);

  const efficiencyRecords: EfficiencyRecord[] = useMemo(() => {
    if (rawRasioRows.length > 2) {
      const parsed = parseEfficiencyData(rawRasioRows, barges2026);
      if (parsed.length > 0) return parsed;
    }
    return FALLBACK_EFFICIENCY_2026;
  }, [rawRasioRows, barges2026]);

  // Unique barge names & available 2026 months for global filter bar
  const uniqueBargeNames = useMemo(() => {
    const set = new Set<string>();
    for (const b of barges2026) {
      if (b.bargeName) set.add(b.bargeName);
    }
    return Array.from(set).sort();
  }, [barges2026]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    for (const b of barges2026) {
      const mIdx = b.dateObj.getMonth();
      map.set(b.monthKey, `${monthNames[mIdx]} 2026`);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [barges2026]);

  // Apply Global Filters (Date Range & Barge Name)
  const filteredBarges = useMemo(() => {
    const startTs = dateRangeStart ? new Date(`${dateRangeStart}T00:00:00`).getTime() : 0;
    const endTs = dateRangeEnd ? new Date(`${dateRangeEnd}T23:59:59`).getTime() : Infinity;

    return barges2026.filter((b) => {
      if (selectedBargeName !== 'ALL' && b.bargeName !== selectedBargeName) {
        return false;
      }
      const ts = b.dateObj.getTime();
      if (ts < startTs || ts > endTs) {
        return false;
      }
      return true;
    });
  }, [barges2026, selectedBargeName, dateRangeStart, dateRangeEnd]);

  const formatIsoDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const applyDateBoundsForPeriodAndMonth = useCallback((p: PeriodType, mKey: string) => {
    const anchor = getAnchorDateForMonth(mKey);
    const anchorIso = formatIsoDate(anchor);

    if (p === 'Daily') {
      setDateRangeStart(anchorIso);
      setDateRangeEnd(anchorIso);
    } else if (p === 'Weekly') {
      const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 6);
      setDateRangeStart(formatIsoDate(weekStart));
      setDateRangeEnd(anchorIso);
    } else if (p === 'Monthly') {
      const monthStart = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-01`;
      setDateRangeStart(monthStart);
      setDateRangeEnd(anchorIso);
    } else if (p === 'Yearly') {
      setDateRangeStart(`${anchor.getFullYear()}-01-01`);
      setDateRangeEnd(anchorIso);
    }
  }, []);

  // Handle switching periods so Daily, Weekly, Monthly, and Yearly automatically synchronize dates for the selected month
  const handleSelectPeriod = (p: PeriodType) => {
    setSelectedPeriod(p);
    applyDateBoundsForPeriodAndMonth(p, selectedMonthFilter);
  };

  const handleMonthFilterChange = (mKey: string) => {
    setSelectedMonthFilter(mKey);
    setSelectedPeriod('Monthly');
    if (mKey === 'ALL_2026') {
      setDateRangeStart('2026-01-01');
      setDateRangeEnd('2026-12-31');
    } else {
      applyDateBoundsForPeriodAndMonth('Monthly', mKey);
    }
  };

  const handleResetFilters = () => {
    setSelectedMonthFilter('ALL_2026');
    setSelectedPeriod('Monthly');
    setDateRangeStart('2026-01-01');
    setDateRangeEnd('2026-12-31');
    setSelectedBargeName('ALL');
  };

  const handleUploadCsvOverride = (sheetTarget: 'BASE' | 'BASE2', rows: string[][]) => {
    if (sheetTarget === 'BASE') {
      setRawBaseRows(rows);
    } else {
      setRawBase2Rows(rows);
    }
  };

  useEffect(() => {
    document.title = 'DASHBOARD LOADING BARGE PT. WBS';
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col">
      {/* STICKY / FREEZE HEADER + NAVIGATION & FILTER BAR */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md shadow-xl shadow-black/50 border-b border-slate-800">
        {/* TOP HEADER BAR */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-800/80">
          {/* Zone 1: Logo + Brand Title with Subheader */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://res.cloudinary.com/dgjnlxf69/image/upload/v1793234716/Logo_WBS_BLC_mltbxd.png"
              alt="Logo WBS BLC"
              className="h-10 w-auto object-contain rounded-lg bg-slate-900/90 p-1 border border-slate-700/80 shadow-md"
            />
            <div className="flex flex-col">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('MORNING_MEETING');
                }}
                className="text-lg font-extrabold tracking-tight text-slate-50 whitespace-nowrap leading-tight"
              >
                DASHBOARD LOADING BARGE
              </a>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                PT. WAHANA BARA SENTOSA
              </span>
            </div>
          </div>

          {/* Zone 2: 4 Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('MORNING_MEETING')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'MORNING_MEETING'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              01. Summary
            </button>
            <button
              onClick={() => setActiveTab('TURNAROUND_ANATOMY')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'TURNAROUND_ANATOMY'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              02. Turnaround &amp; Delay
            </button>
            <button
              onClick={() => setActiveTab('EQUIPMENT_EFFICIENCY')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'EQUIPMENT_EFFICIENCY'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              03. Fuel &amp; HM Ratio
            </button>
            <button
              onClick={() => setActiveTab('DATA_EXPLORER')}
              className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'DATA_EXPLORER'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/50'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              04. Data Explorer
            </button>
          </nav>

          {/* Zone 3: Sync Data Action Button */}
          <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sync Data</span>
            </button>
          </div>
        </header>

        {/* FROZEN WORKSPACE TOOLBAR: Menu Switcher + Global 2026 Operational Filter Bar */}
        <div className="bg-slate-900/95 px-6 py-2.5">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-2.5">
            {/* Responsive Tab Bar for smaller/tablet screens + Global Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('MORNING_MEETING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === 'MORNING_MEETING' ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  01. Summary
                </button>
                <button
                  onClick={() => setActiveTab('TURNAROUND_ANATOMY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === 'TURNAROUND_ANATOMY' ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  02. Turnaround &amp; Delay
                </button>
                <button
                  onClick={() => setActiveTab('EQUIPMENT_EFFICIENCY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === 'EQUIPMENT_EFFICIENCY' ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  03. Fuel &amp; HM Ratio
                </button>
                <button
                  onClick={() => setActiveTab('DATA_EXPLORER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === 'DATA_EXPLORER' ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  04. Data Explorer
                </button>
              </div>

            {/* Global Filter Controls: Bulan 2026, Rentang Tanggal, Nama Tongkang */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs w-full xl:w-auto justify-between xl:justify-start">
              {/* Filter Bulan 2026 */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 whitespace-nowrap">Bulan:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => handleMonthFilterChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL_2026">Semua Bulan 2026 ({barges2026.length} Barge)</option>
                  {availableMonths.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Rentang Tanggal */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 whitespace-nowrap">Tanggal:</span>
                <input
                  type="date"
                  value={dateRangeStart}
                  min="2026-01-01"
                  max="2026-12-31"
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono-num focus:outline-none focus:border-sky-500"
                />
                <span className="text-slate-500">s/d</span>
                <input
                  type="date"
                  value={dateRangeEnd}
                  min="2026-01-01"
                  max="2026-12-31"
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono-num focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Filter Nama Barge / Tongkang */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 whitespace-nowrap">Tongkang:</span>
                <select
                  value={selectedBargeName}
                  onChange={(e) => setSelectedBargeName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-medium max-w-[180px] focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">Semua Tongkang ({uniqueBargeNames.length})</option>
                  {uniqueBargeNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                title="Reset Filter ke Default 2026"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Clean unboxed telemetry metadata */}
            <div className="hidden 2xl:flex items-center gap-2 text-xs text-slate-400 font-mono-num">
              <span>{syncStatus.isLive ? 'Google Sheet Live' : 'Snapshot Mode'}</span>
              <span>·</span>
              <span>BASE 2026: {syncStatus.counts.base2026Rows} Barge</span>
              <span>·</span>
              <span>BASE2: {syncStatus.counts.base2_2026Rows} Log</span>
              <span>·</span>
              <button
                onClick={() => syncFromGoogleSpreadsheet(syncStatus.spreadsheetId)}
                className="text-sky-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {activeTab === 'MORNING_MEETING' && (
          <MorningMeetingView
            matrix={executiveMatrix}
            selectedMonthFilter={selectedMonthFilter}
            filteredBarges={filteredBarges}
          />
        )}

        {activeTab === 'TURNAROUND_ANATOMY' && (
          <TurnaroundAnatomyView barges={filteredBarges} />
        )}

        {activeTab === 'EQUIPMENT_EFFICIENCY' && (
          <EquipmentEfficiencyView
            efficiencyRecords={efficiencyRecords}
            barges={filteredBarges}
          />
        )}

        {activeTab === 'DATA_EXPLORER' && (
          <DataExplorerView
            barges={filteredBarges}
            efficiencyRecords={efficiencyRecords}
            rawBaseHeaders={rawBaseHeaders}
            rawBase2Headers={rawBase2Headers}
            columnMapping={columnMapping}
            onUpdateColumnMapping={setColumnMapping}
            onResetColumnMapping={() => setColumnMapping(DEFAULT_COLUMN_MAPPING)}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-xs text-slate-500 text-center">
        DASHBOARD BARGE PT. WBS - 2026
      </footer>

      {/* Data Source Configuration & Sync Modal */}
      <DataSourceModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        syncStatus={syncStatus}
        onSyncFromUrl={syncFromGoogleSpreadsheet}
        onUploadCsvOverride={handleUploadCsvOverride}
      />
    </div>
  );
}
