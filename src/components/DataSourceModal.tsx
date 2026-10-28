import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { SheetSyncStatus } from '../types';
import { DEFAULT_SPREADSHEET_URL } from '../services/sheetService';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SheetSyncStatus;
  onSyncFromUrl: (urlOrId: string) => Promise<void>;
  onUploadCsvOverride: (sheetTarget: 'BASE' | 'BASE2', rows: string[][]) => void;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  onSyncFromUrl,
  onUploadCsvOverride,
}) => {
  const [inputUrl, setInputUrl] = useState(syncStatus.spreadsheetUrl || DEFAULT_SPREADSHEET_URL);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (sheetTarget: 'BASE' | 'BASE2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<string[]>(file, {
      skipEmptyLines: false,
      complete: (results) => {
        if (results.data && results.data.length > 1) {
          onUploadCsvOverride(sheetTarget, results.data);
          setUploadMessage(
            `Berhasil mengunggah file "${file.name}" (${results.data.length.toLocaleString('id-ID')} baris) untuk tab ${sheetTarget}.`
          );
        }
      },
      error: (err) => {
        setUploadMessage(`Gagal membaca file CSV: ${err.message}`);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Konfigurasi Sumber Data &amp; Sinkronisasi Google Spreadsheet
              </h3>
              <p className="text-xs text-slate-400">
                Live Fetch via Google Visualization API (CSV Export) — Sheet BASE, BASE2, Meeting Mentari &amp; Rasio CY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Live Connection Telemetry Grid */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                {syncStatus.isLive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  Status Koneksi:{' '}
                  {syncStatus.isLive
                    ? 'TERHUBUNG LANGSUNG (LIVE GOOGLE SPREADSHEET)'
                    : 'MODE FALLBACK / OFFLINE SNAPSHOT'}
                </span>
              </span>
              <span className="font-mono-num text-slate-400">
                Sync Terakhir: {syncStatus.lastSyncedAt}
              </span>
            </div>

            {syncStatus.error && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-500/40 rounded text-rose-300">
                Peringatan Koneksi: {syncStatus.error}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Tab &ldquo;BASE&rdquo; (2026)</span>
                <span className="text-sm font-bold font-mono-num text-emerald-400">
                  {syncStatus.counts.base2026Rows.toLocaleString('id-ID')} Tongkang
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Total: {syncStatus.counts.baseTotalRows.toLocaleString('id-ID')} baris
                </span>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Tab &ldquo;BASE2&rdquo; (2026)</span>
                <span className="text-sm font-bold font-mono-num text-sky-400">
                  {syncStatus.counts.base2_2026Rows.toLocaleString('id-ID')} Log Delay
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Total: {syncStatus.counts.base2TotalRows.toLocaleString('id-ID')} baris
                </span>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Tab &ldquo;Meeting Mentari&rdquo;</span>
                <span className="text-sm font-bold font-mono-num text-slate-100">
                  {syncStatus.counts.mentariRows} Baris KPI
                </span>
                <span className="text-[11px] text-emerald-400 block">Aktif (4 Matriks)</span>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-400 block">Tab &ldquo;Rasio CY&rdquo; (BBM/HM)</span>
                <span className="text-sm font-bold font-mono-num text-slate-100">
                  {syncStatus.counts.rasioCyRows} Hari (2026)
                </span>
                <span className="text-[11px] text-emerald-400 block">Loading to Barge</span>
              </div>
            </div>
          </div>

          {/* Google Sheet URL / ID Input */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-200">
              URL atau ID Google Spreadsheet Sumber:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1eCRt5dRuyRqZB9fIlDrqtxkEMwR8hn3-IYb1rJzHObc"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-100 font-mono-num focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => onSyncFromUrl(inputUrl)}
                disabled={syncStatus.isSyncing}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncStatus.isSyncing ? 'Menyinkronkan...' : 'Sync Live Sekarang'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Spreadsheet ID Aktif: <code className="text-sky-400">{syncStatus.spreadsheetId}</code></span>
              <a
                href={`https://docs.google.com/spreadsheets/d/${syncStatus.spreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Buka Google Sheet di Tab Baru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Offline CSV Upload Fallback */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div>
              <h4 className="font-bold text-slate-200">
                Mode Offline: Unggah File CSV Lokal (Override BASE / BASE2)
              </h4>
              <p className="text-slate-400 mt-0.5">
                Jika ruang rapat tidak memiliki akses internet ke Google Docs, unggah salinan CSV dari tab BASE atau BASE2.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-sky-500 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="font-semibold text-slate-200">Unggah CSV Tab &ldquo;BASE&rdquo;</div>
                    <div className="text-[11px] text-slate-400">Data Tonase &amp; Durasi Tongkang</div>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleFileUpload('BASE', e)}
                  className="hidden"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-slate-200">Unggah CSV Tab &ldquo;BASE2&rdquo;</div>
                    <div className="text-[11px] text-slate-400">Data Log Delay &amp; Breakdown</div>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleFileUpload('BASE2', e)}
                  className="hidden"
                />
              </label>
            </div>

            {uploadMessage && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded text-emerald-300">
                {uploadMessage}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg transition-colors"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
