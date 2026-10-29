import React from 'react';
import { Ship, RefreshCw, Calendar, ChevronDown } from 'lucide-react';
import { GSheetsConfig } from '../types';

interface HeaderProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  onRefreshCache: () => void;
  onOpenGSheetsModal?: () => void;
  isRefreshing: boolean;
  sheetsConfig: GSheetsConfig;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onRefreshCache,
  isRefreshing
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="h-12 px-2.5 py-1 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
            <img
              src="https://res.cloudinary.com/dgjnlxf69/image/upload/v1793075857/Logo_WBS_BLC_cqsna9.png"
              alt="Logo PT WBS BLC"
              className="h-9 w-auto object-contain max-w-[130px]"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to Ship icon if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Dashboard Barge Loading
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                PT WBS Operations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Monitoring Jetty Port Performance, BLC Productivity & Delay Management
            </p>
          </div>
        </div>

        {/* Status Badges & Controls in Top Right */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Menu Dropdown Pemilihan Bulan di Pojok Kanan Atas */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-indigo-600 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition appearance-none shadow-xs"
              title="Pilih Bulan Operasional"
            >
              <option value="Semua Periode 2026">Semua Periode 2026</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Refresh Cache Button */}
          <button
            onClick={onRefreshCache}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
            title="Reset Cache Data (TTL 10 Menit)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Merefresh...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
