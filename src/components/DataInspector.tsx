import React, { useState } from 'react';
import { BaseRecord, Base2Record, ProcessedBarge, GSheetsConfig } from '../types';
import {
  Search,
  Download,
  Plus,
  Filter,
  Database,
  FileSpreadsheet,
  Link,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface DataInspectorProps {
  mergedData: ProcessedBarge[];
  baseData: BaseRecord[];
  base2Data: Base2Record[];
  sheetsConfig: GSheetsConfig;
  onSaveSheetsConfig: (newConfig: Partial<GSheetsConfig>) => void;
  onFetchSpreadsheet: (
    url: string,
    baseTab: string,
    base2Tab: string
  ) => Promise<{ success: boolean; message: string; rowsBase?: number; rowsBase2?: number }>;
  onManualImportCsv?: (csvBase: string, csvBase2: string) => boolean;
  onResetCache?: () => void;
  onAddRecord?: (base: BaseRecord, base2: Base2Record) => void;
}

export const DataInspector: React.FC<DataInspectorProps> = ({
  mergedData,
  baseData,
  base2Data,
  sheetsConfig,
  onSaveSheetsConfig,
  onFetchSpreadsheet,
  onManualImportCsv,
  onResetCache,
  onAddRecord
}) => {
  const [activeTab, setActiveTab] = useState<'merged' | 'base' | 'base2'>('merged');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualPasteModal, setShowManualPasteModal] = useState(false);
  const [inspectingBarge, setInspectingBarge] = useState<ProcessedBarge | null>(null);

  // Spreadsheet Link Form state
  const [inputUrl, setInputUrl] = useState(sheetsConfig.spreadsheetUrl || '');
  const [tabBaseName, setTabBaseName] = useState(sheetsConfig.sheetBaseName || 'BASE');
  const [tabBase2Name, setTabBase2Name] = useState(sheetsConfig.sheetBase2Name || 'BASE2');
  const [isApplying, setIsApplying] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual paste state
  const [manualBaseCsv, setManualBaseCsv] = useState('');
  const [manualBase2Csv, setManualBase2Csv] = useState('');

  // New record state
  const [newBg, setNewBg] = useState('');
  const [newDate, setNewDate] = useState('2026-10-28');
  const [newTonRit, setNewTonRit] = useState(8500);
  const [newLoading, setNewLoading] = useState(6.0);
  const [newCastIn, setNewCastIn] = useState('2026-10-28 08:00:00');
  const [newCastOff, setNewCastOff] = useState('2026-10-28 14:30:00');
  const [newBreakdown, setNewBreakdown] = useState(0);
  const [newRain, setNewRain] = useState(0);
  const [newWaiting, setNewWaiting] = useState(0.5);

  const filteredMerged = mergedData.filter((b) =>
    b.BG.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.DD.includes(searchTerm) ||
    b.Status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBase = baseData.filter((b) =>
    b.BG.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.DD.includes(searchTerm)
  );

  const filteredBase2 = base2Data.filter((b) =>
    b.BG.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.DD.includes(searchTerm)
  );

  const exportCsv = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApplySpreadsheetLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) {
      setErrorMessage('Harap masukkan URL Google Spreadsheet Anda terlebih dahulu.');
      return;
    }

    setIsApplying(true);
    setSyncFeedback(null);
    setErrorMessage(null);

    const result = await onFetchSpreadsheet(
      inputUrl.trim(),
      tabBaseName.trim() || 'BASE',
      tabBase2Name.trim() || 'BASE2'
    );
    setIsApplying(false);

    if (result.success) {
      setSyncFeedback(result.message);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleApplyManualCsv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBaseCsv.trim() || !manualBase2Csv.trim()) {
      alert('Harap masukkan teks CSV untuk kedua tab (BASE dan BASE2).');
      return;
    }

    if (onManualImportCsv) {
      const ok = onManualImportCsv(manualBaseCsv, manualBase2Csv);
      if (ok) {
        setSyncFeedback('Data aktual berhasil diimpor dari teks CSV!');
        setShowManualPasteModal(false);
      } else {
        alert('Format CSV tidak cocok. Pastikan ada baris header dengan nama kolom yang sesuai.');
      }
    }
  };

  const handlePasteDemoUrl = () => {
    const demoUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
    setInputUrl(demoUrl);
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBg.trim()) return;

    const baseRec: BaseRecord = {
      BG: newBg.toUpperCase().trim(),
      DD: newDate,
      'Ton/Rit': Number(newTonRit)
    };

    const base2Rec: Base2Record = {
      BG: newBg.toUpperCase().trim(),
      DD: newDate,
      'Cast-in': newCastIn,
      Loading: Number(newLoading),
      'Cast off': newCastOff,
      Breakdown: Number(newBreakdown),
      'Heavy Rain': Number(newRain),
      Waiting: Number(newWaiting)
    };

    if (onAddRecord) {
      onAddRecord(baseRec, base2Rec);
    }
    setShowAddModal(false);
    setNewBg('');
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* MENU PEMASANGAN LINK SPREADSHEET (SESUAI REQUEST USER) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Pemasangan Link Google Spreadsheet (Sumber Data)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hubungkan langsung tab <strong>"BASE"</strong> (Volume MT) dan <strong>"BASE2"</strong> (Loading & Delay) via <code>st.connection</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                sheetsConfig.spreadsheetUrl
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetsConfig.spreadsheetUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              ></span>
              {sheetsConfig.spreadsheetUrl ? 'Google Sheets Aktif' : 'Data Operasional PT WBS (Aktif)'}
            </span>

            {onResetCache && (
              <button
                onClick={onResetCache}
                className="px-3 py-1 rounded-full font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 transition"
                title="Reset cache data (TTL 10 menit)"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Cache (10m)
              </button>
            )}
          </div>
        </div>

        {/* Form Input Link Spreadsheet */}
        <form onSubmit={handleApplySpreadsheetLink} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            {/* Input URL */}
            <div className="lg:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>URL Google Spreadsheet:</span>
                <button
                  type="button"
                  onClick={handlePasteDemoUrl}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Tempel Contoh Format
                </button>
              </label>
              <div className="relative">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/1abc...xyz/edit#gid=0"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>
            </div>

            {/* Input Tab BASE */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tab Volume MT:
              </label>
              <input
                type="text"
                value={tabBaseName}
                onChange={(e) => setTabBaseName(e.target.value)}
                placeholder="BASE"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>

            {/* Input Tab BASE2 */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tab Waktu & Delay:
              </label>
              <input
                type="text"
                value={tabBase2Name}
                onChange={(e) => setTabBase2Name(e.target.value)}
                placeholder="BASE2"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>

            {/* Button Submit */}
            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isApplying}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyambungkan...
                  </>
                ) : (
                  <>
                    <Link className="w-3.5 h-3.5" />
                    Pasang Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Kendala Penarikan Data:</strong> {errorMessage}
                </div>
              </div>
              <div className="pl-6 text-[11px] text-rose-700/90 flex flex-wrap items-center gap-3">
                <span>Tips: Buka Google Sheets &gt; Klik <strong>Share</strong> &gt; Ubah General Access ke <strong>"Anyone with the link can view"</strong>.</span>
                <button
                  type="button"
                  onClick={() => setShowManualPasteModal(true)}
                  className="font-bold underline text-indigo-700 hover:text-indigo-900"
                >
                  Atau Tempel Teks CSV Tab BASE & BASE2 Langsung →
                </button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {syncFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Guidance Info & Verified Schema */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Struktur Sheet BASE2 Terintegrasi Sesuai Format Aktual:</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualPasteModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px]"
                >
                  Tempel CSV Manual →
                </button>
                {inputUrl && (
                  <a
                    href={inputUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                  >
                    Buka Spreadsheet Asli <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 font-mono text-[10px]">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold">Sheet BASE (Col A & H)</span>
                <span className="text-emerald-700 font-bold">Col A: No Urut • Col H: Muatan MT</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold">BASE2: Col A, B, C</span>
                <span className="text-slate-800 font-bold">No Urut, Tug Boat, Tongkang</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold">BASE2: Col D, E, F, G</span>
                <span className="text-slate-800 font-bold">DD, Date Aktual, Start & End Time</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-sans block text-[9px] uppercase font-bold">BASE2: Col H s/d AA</span>
                <span className="text-indigo-700 font-bold">Nama Aktivitas & Delay</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ===================================================================== */}
      {/* TABEL DATA & SHEET INSPECTOR */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        {/* Top Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Inspeksi Data Sheet (BASE & BASE2)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan data hasil pembersihan, standarisasi uppercase, Left Join, dan kalkulasi performa BLC.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama tongkang / status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56"
              />
            </div>

            <button
              onClick={() => exportCsv(
                activeTab === 'merged' ? filteredMerged : activeTab === 'base' ? filteredBase : filteredBase2,
                `barge_data_${activeTab}.csv`
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor CSV
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Tongkang Baru
            </button>
          </div>
        </div>

        {/* Tabs Selection */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('merged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'merged'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Dataset Gabungan ({filteredMerged.length})
          </button>
          <button
            onClick={() => setActiveTab('base')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'base'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tab '{tabBaseName}' (Volume MT) ({filteredBase.length})
          </button>
          <button
            onClick={() => setActiveTab('base2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'base2'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tab '{tabBase2Name}' (Waktu & Delay) ({filteredBase2.length})
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === 'merged' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-2">Voyage (Col A)</th>
                  <th className="py-2.5 px-3">Tug Boat (Col B)</th>
                  <th className="py-2.5 px-3">Nama Tongkang (Col C)</th>
                  <th className="py-2.5 px-2">Tgl Pemuatan (Col D)</th>
                  <th className="py-2.5 px-2 text-right">Volume (Ton/Rit)</th>
                  <th className="py-2.5 px-2 text-right">Loading Netto (Col O)</th>
                  <th className="py-2.5 px-2 text-right">Target Waktu</th>
                  <th className="py-2.5 px-2 text-right">Produktivitas BLC</th>
                  <th className="py-2.5 px-2 text-right">Idle Time</th>
                  <th className="py-2.5 px-2 text-right">Total Delay</th>
                  <th className="py-2.5 px-2 text-center">Rincian Log (Col H..AA)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredMerged.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-600">
                      {row.voyageNo || '1023'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      {row.TB || 'TB. ASSIST 01'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG}</td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono">{row.DD}</td>
                    <td className="py-2.5 px-2 text-right font-semibold">{row.TonRit.toLocaleString('id-ID')} MT</td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-700">{row.Loading.toFixed(1)} h</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{row.WaktuTarget.toFixed(2)} h</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono">
                      {row.AktualProduktivitas.toFixed(1)} T/h
                    </td>
                    <td className="py-2.5 px-2 text-right text-indigo-600 font-semibold font-mono">{row.IdleTime.toFixed(1)} h</td>
                    <td className="py-2.5 px-2 text-right text-slate-500 font-mono">{row.TotalDelay.toFixed(1)} h</td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setInspectingBarge(row)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition text-[10px] inline-flex items-center gap-1"
                        title="Klik untuk membuka rincian aktivitas dan delay kolom H s/d AA"
                      >
                        👁️ {row.activityDetails && row.activityDetails.length > 0 ? `${row.activityDetails.length} Log (H..AA)` : 'Lihat Log'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.Status === 'Sesuai Target'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {row.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'base' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">No Urut / Voyage (Col A)</th>
                  <th className="py-2.5 px-3">BG (Nama Tongkang)</th>
                  <th className="py-2.5 px-3">DD (Tanggal Pemuatan)</th>
                  <th className="py-2.5 px-3 text-right">Muatan Tongkang (Col H - MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBase.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {row.voyageNo || `${idx + 1}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{row.DD || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {row['Ton/Rit'].toLocaleString('id-ID')} MT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'base2' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-2">Voyage (A)</th>
                  <th className="py-2.5 px-3">Tug Boat (B)</th>
                  <th className="py-2.5 px-3">Tongkang (C)</th>
                  <th className="py-2.5 px-2">DD Pemuatan (D)</th>
                  <th className="py-2.5 px-2">Cast-in</th>
                  <th className="py-2.5 px-2 text-right">Loading to Barge (O)</th>
                  <th className="py-2.5 px-2">Cast off</th>
                  <th className="py-2.5 px-2 text-right">Breakdown (Q)</th>
                  <th className="py-2.5 px-2 text-right">Waiting (P)</th>
                  <th className="py-2.5 px-2 text-right">Shift & Rest (R,S)</th>
                  <th className="py-2.5 px-2 text-center">Rincian Kolom H..AA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBase2.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-600">{row.voyageNo || `10${22 + idx}`}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{row.TB || 'TB. LEO POWER'}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG}</td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono">{row.DD}</td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{row['Cast-in']}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">{row.Loading} h</td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{row['Cast off']}</td>
                    <td className="py-2.5 px-2 text-right text-rose-600 font-mono">{row.Breakdown} h</td>
                    <td className="py-2.5 px-2 text-right text-amber-600 font-mono">{row.Waiting} h</td>
                    <td className="py-2.5 px-2 text-right text-purple-600 font-mono">{row.shiftRest || 0.25} h</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        {row.activityDetails?.length || 1} baris interval
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Add Record */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h4 className="font-bold text-base text-slate-900">Tambah Data Tongkang (Manual)</h4>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nama Tongkang (BG)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BG. BORNEO STAR"
                      value={newBg}
                      onChange={(e) => setNewBg(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Loading (DD)</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Volume Batubara (Ton/Rit)</label>
                    <input
                      type="number"
                      required
                      value={newTonRit}
                      onChange={(e) => setNewTonRit(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Durasi Loading Netto (Jam)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newLoading}
                      onChange={(e) => setNewLoading(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Cast-in Datetime</label>
                    <input
                      type="text"
                      value={newCastIn}
                      onChange={(e) => setNewCastIn(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Cast off Datetime</label>
                    <input
                      type="text"
                      value={newCastOff}
                      onChange={(e) => setNewCastOff(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Breakdown (Jam)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newBreakdown}
                      onChange={(e) => setNewBreakdown(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Heavy Rain (Jam)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newRain}
                      onChange={(e) => setNewRain(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Waiting (Jam)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWaiting}
                      onChange={(e) => setNewWaiting(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    Simpan & Perbarui
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tempel Data CSV Manual */}
        {showManualPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">
                      Tempel Teks CSV Data Aktual (Tab BASE & BASE2)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Solusi instan jika Google Spreadsheet perusahaan memerlukan izin login khusus.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualPasteModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleApplyManualCsv} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Teks CSV Tab "BASE" (Volume Batubara MT):
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Contoh kolom: <code>BG, DD, Ton/Rit</code> (Bisa langsung di-copy dari baris Google Sheets Anda)
                  </p>
                  <textarea
                    rows={4}
                    required
                    placeholder={`BG,DD,Ton/Rit\nBG. KALIMANTAN 01,2026-10-01,8300\nBG. PACIFIC STAR,2026-10-03,7650`}
                    value={manualBaseCsv}
                    onChange={(e) => setManualBaseCsv(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px] bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Teks CSV Tab "BASE2" (Waktu Loading & Delay):
                  </label>
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Contoh kolom: <code>BG, DD, Cast-in, Loading, Cast off, Breakdown, Heavy Rain, Waiting</code>
                  </p>
                  <textarea
                    rows={5}
                    required
                    placeholder={`BG,DD,Cast-in,Loading,Cast off,Breakdown,Heavy Rain,Waiting\nBG. KALIMANTAN 01,2026-10-01,2026-10-01 08:00:00,5.8,2026-10-01 14:18:00,0,0,0.5\nBG. PACIFIC STAR,2026-10-03,2026-10-03 10:15:00,5.2,2026-10-03 16:00:00,0,0,0.55`}
                    value={manualBase2Csv}
                    onChange={(e) => setManualBase2Csv(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px] bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Data akan langsung menggantikan data dummy di seluruh dasbor.
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualPasteModal(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                    >
                      Terapkan Data Aktual
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Rincian Aktivitas & Delay (Kolom H s/d AA Sheet BASE2) */}
        {inspectingBarge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs">
                      Voyage #{inspectingBarge.voyageNo || '1023'}
                    </span>
                    <h4 className="font-extrabold text-base text-slate-900">
                      Rincian Log Aktivitas & Delay (Kolom H s/d AA)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Tug Boat (Col B): <strong>{inspectingBarge.TB || 'TB. ASSIST'}</strong></span>
                    <span>Tongkang (Col C): <strong className="text-slate-900">{inspectingBarge.BG}</strong></span>
                    <span>Tanggal Pemuatan (Col D): <strong>{inspectingBarge.DD}</strong></span>
                    <span>Sandar: <strong>{inspectingBarge.CastIn}</strong> s/d <strong>{inspectingBarge.CastOff}</strong></span>
                  </p>
                </div>

                <button
                  onClick={() => setInspectingBarge(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition font-bold"
                >
                  ✕
                </button>
              </div>

              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Batubara</span>
                  <span className="font-extrabold text-slate-900 text-sm">{inspectingBarge.TonRit.toLocaleString('id-ID')} MT</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block">Loading Netto (Col O)</span>
                  <span className="font-extrabold text-emerald-800 text-sm">{inspectingBarge.Loading.toFixed(1)} Jam</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Produktivitas BLC</span>
                  <span className="font-extrabold text-slate-900 text-sm">{inspectingBarge.AktualProduktivitas.toFixed(1)} T/h</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Delay</span>
                  <span className="font-extrabold text-rose-700 text-sm">{inspectingBarge.TotalDelay.toFixed(1)} Jam</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status Kepatuhan</span>
                  <span
                    className={`inline-block font-extrabold text-xs px-2 py-0.5 rounded-full mt-0.5 ${
                      inspectingBarge.Status === 'Sesuai Target'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {inspectingBarge.Status}
                  </span>
                </div>
              </div>

              {/* Table of interval rows */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Tanggal Aktual (Col E)</th>
                      <th className="py-2.5 px-3">Waktu Mulai (Col F)</th>
                      <th className="py-2.5 px-3">Waktu Selesai (Col G)</th>
                      <th className="py-2.5 px-3">Nama Aktivitas & Delay (Col H..AA)</th>
                      <th className="py-2.5 px-3 text-right">Durasi (HH:MM)</th>
                      <th className="py-2.5 px-3 text-right">Durasi (Jam)</th>
                      <th className="py-2.5 px-3 text-center">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {inspectingBarge.activityDetails && inspectingBarge.activityDetails.length > 0 ? (
                      inspectingBarge.activityDetails.map((act, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {act.activityDate || inspectingBarge.DD}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">{act.startTime || '-'}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{act.endTime || '-'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                act.category === 'Loading'
                                  ? 'bg-emerald-500'
                                  : act.category === 'Breakdown'
                                  ? 'bg-rose-500'
                                  : act.category === 'Heavy Rain'
                                  ? 'bg-blue-500'
                                  : act.category === 'Waiting'
                                  ? 'bg-amber-500'
                                  : act.category === 'Shift / Rest'
                                  ? 'bg-purple-500'
                                  : act.category === 'Surveyor'
                                  ? 'bg-cyan-500'
                                  : 'bg-slate-400'
                              }`}
                            ></span>
                            {act.activityName}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {act.durationFormatted || `${act.durationHours.toFixed(1)} h`}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {act.durationHours.toFixed(2)} h
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                act.category === 'Loading'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : act.category === 'Breakdown'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : act.category === 'Heavy Rain'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : act.category === 'Waiting'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : act.category === 'Shift / Rest'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : act.category === 'Surveyor'
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {act.category}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Tidak ada rincian baris interval untuk tongkang ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 text-[11px] text-slate-400">
                <span>Catatan: Kolom E mencatat tanggal aktual aktivitas yang dapat melintasi hari saat kapal beroperasi lebih dari 24 jam.</span>
                <button
                  onClick={() => setInspectingBarge(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
