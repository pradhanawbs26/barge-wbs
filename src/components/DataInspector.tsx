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
  onResetCache?: () => void;
  onAddRecord?: (base: BaseRecord, base2: Base2Record) => void;
}

export const DataInspector: React.FC<DataInspectorProps> = ({
  mergedData,
  baseData,
  base2Data,
  sheetsConfig,
  onSaveSheetsConfig,
  onResetCache,
  onAddRecord
}) => {
  const [activeTab, setActiveTab] = useState<'merged' | 'base' | 'base2'>('merged');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Spreadsheet Link Form state
  const [inputUrl, setInputUrl] = useState(sheetsConfig.spreadsheetUrl || '');
  const [tabBaseName, setTabBaseName] = useState(sheetsConfig.sheetBaseName || 'BASE');
  const [tabBase2Name, setTabBase2Name] = useState(sheetsConfig.sheetBase2Name || 'BASE2');
  const [isApplying, setIsApplying] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  const handleApplySpreadsheetLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsApplying(true);
    setSyncFeedback(null);

    setTimeout(() => {
      setIsApplying(false);
      const isConnected = !!inputUrl.trim();
      onSaveSheetsConfig({
        spreadsheetUrl: inputUrl.trim(),
        sheetBaseName: tabBaseName.trim() || 'BASE',
        sheetBase2Name: tabBase2Name.trim() || 'BASE2',
        status: isConnected ? 'connected' : 'sample_data',
        lastSynced: new Date()
      });
      setSyncFeedback(
        isConnected
          ? 'Tautan Google Spreadsheet berhasil dipasangkan dan disinkronkan!'
          : 'Menggunakan data operasional internal PT WBS.'
      );
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 700);
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

          {/* Feedback message */}
          {syncFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Quick Guidance Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Pastikan akses Google Spreadsheet telah disetel ke <strong>"Anyone with the link can view"</strong> atau menggunakan Service Account di <code>.streamlit/secrets.toml</code>.
              </span>
            </div>
            {inputUrl && (
              <a
                href={inputUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline font-bold shrink-0 flex items-center gap-1"
              >
                Buka Spreadsheet Asli <ExternalLink className="w-3 h-3" />
              </a>
            )}
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
                  <th className="py-2.5 px-3">Nama Tongkang (BG)</th>
                  <th className="py-2.5 px-2">Tanggal (DD)</th>
                  <th className="py-2.5 px-2 text-right">Volume (Ton/Rit)</th>
                  <th className="py-2.5 px-2 text-right">Loading (Jam)</th>
                  <th className="py-2.5 px-2 text-right">Target Waktu (Jam)</th>
                  <th className="py-2.5 px-2 text-right">Produktivitas BLC</th>
                  <th className="py-2.5 px-2 text-right">Idle Time</th>
                  <th className="py-2.5 px-2 text-right">Total Delay</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredMerged.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG}</td>
                    <td className="py-2.5 px-2 text-slate-500">{row.DD}</td>
                    <td className="py-2.5 px-2 text-right font-semibold">{row.TonRit.toLocaleString('id-ID')} MT</td>
                    <td className="py-2.5 px-2 text-right">{row.Loading.toFixed(1)} h</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{row.WaktuTarget.toFixed(2)} h</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                      {row.AktualProduktivitas.toFixed(1)} T/h
                    </td>
                    <td className="py-2.5 px-2 text-right text-indigo-600">{row.IdleTime.toFixed(1)} h</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{row.TotalDelay.toFixed(1)} h</td>
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
                  <th className="py-2.5 px-3">BG (Nama Tongkang)</th>
                  <th className="py-2.5 px-3">DD (Tanggal)</th>
                  <th className="py-2.5 px-3 text-right">Ton/Rit (Volume MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBase.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.DD}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{row['Ton/Rit'].toLocaleString('id-ID')} MT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'base2' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">BG</th>
                  <th className="py-2.5 px-2">DD</th>
                  <th className="py-2.5 px-2">Cast-in</th>
                  <th className="py-2.5 px-2 text-right">Loading (h)</th>
                  <th className="py-2.5 px-2">Cast off</th>
                  <th className="py-2.5 px-2 text-right">Breakdown (h)</th>
                  <th className="py-2.5 px-2 text-right">Heavy Rain (h)</th>
                  <th className="py-2.5 px-2 text-right">Waiting (h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBase2.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.BG}</td>
                    <td className="py-2.5 px-2 text-slate-500">{row.DD}</td>
                    <td className="py-2.5 px-2 text-slate-500">{row['Cast-in']}</td>
                    <td className="py-2.5 px-2 text-right font-semibold">{row.Loading}</td>
                    <td className="py-2.5 px-2 text-slate-500">{row['Cast off']}</td>
                    <td className="py-2.5 px-2 text-right text-rose-600">{row.Breakdown}</td>
                    <td className="py-2.5 px-2 text-right text-blue-600">{row['Heavy Rain']}</td>
                    <td className="py-2.5 px-2 text-right text-amber-600">{row.Waiting}</td>
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
      </div>
    </div>
  );
};
