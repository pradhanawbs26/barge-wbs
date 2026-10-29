import React from 'react';
import { DepartmentKpiRecord } from '../types';
import { Target, TrendingUp, TrendingDown, Clock, Truck, Ship, Gauge, Fuel } from 'lucide-react';
import { FUEL_HM_RATIOS } from '../data/departmentKpis';

interface DepartmentKpiSectionProps {
  kpis: DepartmentKpiRecord[];
}

export const DepartmentKpiSection: React.FC<DepartmentKpiSectionProps> = ({ kpis }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Ship className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Performance Departement Operation 2026
              </h3>
              <p className="text-xs text-slate-500">
                Data resmi rekonsiliasi operasional PT WBS (Daily, Weekly, Monthly & Yearly 2026)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Sumber: Spreadsheet Operasional 2026
          </span>
        </div>
      </div>

      {/* Grid Cards 4 Periode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const isBargingOnTarget = kpi.bargingAchPct >= 100;
          const isBlcOnTarget = kpi.blcRateActual >= kpi.blcRatePlan;

          return (
            <div
              key={kpi.periodName}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-extrabold text-slate-900">{kpi.periodName}</span>
                  <div className="text-[10px] text-slate-400 font-medium">{kpi.dateRange}</div>
                </div>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isBargingOnTarget
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {kpi.bargingAchPct}% Capai
                </span>
              </div>

              {/* Barging Volume */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Loading to Barge (MT)
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black text-slate-900">
                    {kpi.bargingActual.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Plan: {kpi.bargingPlan.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* BLC Rate */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Produktivitas BLC (MT/Jam)
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-base font-black text-slate-900">
                    {kpi.blcRateActual.toLocaleString('id-ID', { minimumFractionDigits: 1 })}{' '}
                    <span className="text-[10px] font-semibold text-slate-400">T/h</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isBlcOnTarget
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {isBlcOnTarget ? '+' : ''}
                    {(kpi.blcRateActual - kpi.blcRatePlan).toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1
                    })}
                  </span>
                </div>
              </div>

              {/* Durasi & Unit */}
              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Durasi Muat:</span>
                  <span className="font-bold text-slate-800">
                    {kpi.loadingDurationActual.toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2
                    })}{' '}
                    Jam
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Flat Deck:</span>
                  <span className="font-bold text-slate-800">{kpi.unitsRunningActual} Unit</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabel Lengkap Sesuai Dokumen Spreadsheet */}
      <div className="overflow-x-auto pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-indigo-600" />
          Tabel Matriks Kinerja Operasional Lengkap (Data Acuan Rapat Operasional Mentari)
        </h4>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
              <th className="py-2.5 px-3">Parameter Operasional</th>
              <th className="py-2.5 px-2">Target / Plan</th>
              <th className="py-2.5 px-2 text-right">Daily (20-Okt)</th>
              <th className="py-2.5 px-2 text-right">Weekly (13-20 Okt)</th>
              <th className="py-2.5 px-2 text-right">Monthly (1-31 Jan)</th>
              <th className="py-2.5 px-3 text-right">Yearly 2026 (s/d 20-Okt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            <tr className="hover:bg-slate-50">
              <td className="py-2.5 px-3 font-bold text-slate-900">
                Coal Hauling (MT)
              </td>
              <td className="py-2.5 px-2 text-slate-500 font-mono">Plan Sesuai Schedule</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                20.025 <span className="text-[10px] text-emerald-600 font-bold">(120%)</span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                155.783 <span className="text-[10px] text-emerald-600 font-bold">(134%)</span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                270.993 <span className="text-[10px] text-amber-600 font-bold">(54%)</span>
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                4.969.364 <span className="text-[10px] text-emerald-600 font-bold">(102%)</span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50 bg-indigo-50/20">
              <td className="py-2.5 px-3 font-bold text-indigo-950 flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-indigo-600" />
                Loading to Barge (MT)
              </td>
              <td className="py-2.5 px-2 text-slate-500 font-mono">Plan Sesuai Schedule</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                15.809 <span className="text-[10px] text-amber-600 font-bold">(96%)</span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                150.859 <span className="text-[10px] text-emerald-600 font-bold">(131%)</span>
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                201.651 <span className="text-[10px] text-amber-600 font-bold">(41%)</span>
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                4.928.525 <span className="text-[10px] text-emerald-600 font-bold">(103%)</span>
              </td>
            </tr>

            <tr className="hover:bg-slate-50">
              <td className="py-2.5 px-3 font-bold text-slate-900">
                Produktivitas BLC (Ton/Jam)
              </td>
              <td className="py-2.5 px-2 text-rose-600 font-mono font-bold">1.350,00 T/h</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-400">
                0,00
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">
                1.469,34
              </td>
              <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-700">
                1.310,21
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                1.397,83
              </td>
            </tr>

            <tr className="hover:bg-slate-50">
              <td className="py-2.5 px-3 text-slate-700">
                Durasi Loading per Siklus (Jam)
              </td>
              <td className="py-2.5 px-2 text-slate-500 font-mono">0,00 - 8,24 Jam</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">0,00</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">9,33</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">9,84</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">5,36</td>
            </tr>

            <tr className="hover:bg-slate-50">
              <td className="py-2.5 px-3 text-slate-700">
                Cycle Time Flat Deck (Menit)
              </td>
              <td className="py-2.5 px-2 text-slate-500 font-mono">120,00 Menit</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">141,86</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">141,87</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">143,81</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">131,69</td>
            </tr>

            <tr className="hover:bg-slate-50">
              <td className="py-2.5 px-3 text-slate-700">
                Flat Deck Running (Unit)
              </td>
              <td className="py-2.5 px-2 text-slate-500 font-mono">40 Unit</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">40</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">41</td>
              <td className="py-2.5 px-2 text-right font-mono font-bold">37</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold">41</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ratios Mini Bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Fuel className="w-4 h-4 text-amber-500" />
          Rasio Bahan Bakar Total (Fuel Ratio):{' '}
          <span className="font-bold text-slate-900">0,81 Ltr/Ton</span> (Plan: 0,87)
        </div>
        <div>
          Cycle Time Target:{' '}
          <span className="font-bold text-slate-800">120,0 Menit</span> • Target BLC:{' '}
          <span className="font-bold text-emerald-700">1.350,0 MT/Jam</span>
        </div>
      </div>
    </div>
  );
};
