import { DepartmentKpiRecord } from '../types';

/**
 * Data Resmi Operasional: Performance Departement Operation 2026
 * Diekstrak langsung dari spreadsheet kinerja operasional PT WBS
 */
export const DEPARTMENT_OPERATION_KPIS: DepartmentKpiRecord[] = [
  {
    periodName: 'Daily',
    dateRange: '20-Okt - 20-Okt',
    haulingPlan: 16647,
    haulingActual: 20025,
    haulingAchPct: 120,
    bargingPlan: 16452,
    bargingActual: 15809,
    bargingAchPct: 96,
    cycleTimePlan: 120.00,
    cycleTimeActual: 141.86,
    unitsRunningPlan: 40,
    unitsRunningActual: 40,
    loadingDurationPlan: 0.00,
    loadingDurationActual: 0.00,
    blcRatePlan: 1350.00,
    blcRateActual: 0.00
  },
  {
    periodName: 'Weekly',
    dateRange: '13-Okt - 20-Okt',
    haulingPlan: 116530,
    haulingActual: 155783,
    haulingAchPct: 134,
    bargingPlan: 115161,
    bargingActual: 150859,
    bargingAchPct: 131,
    cycleTimePlan: 120.00,
    cycleTimeActual: 141.87,
    unitsRunningPlan: 40,
    unitsRunningActual: 41,
    loadingDurationPlan: 8.08,
    loadingDurationActual: 9.33,
    blcRatePlan: 1350.00,
    blcRateActual: 1469.34
  },
  {
    periodName: 'Monthly',
    dateRange: '1-Jan - 31-Jan (Maret/Jan 26)',
    haulingPlan: 499413,
    haulingActual: 270993,
    haulingAchPct: 54,
    bargingPlan: 493548,
    bargingActual: 201651,
    bargingAchPct: 41,
    cycleTimePlan: 120.00,
    cycleTimeActual: 143.81,
    unitsRunningPlan: 40,
    unitsRunningActual: 37,
    loadingDurationPlan: 8.22,
    loadingDurationActual: 9.84,
    blcRatePlan: 1350.00,
    blcRateActual: 1310.21
  },
  {
    periodName: 'Yearly 2026',
    dateRange: '1-Jan - 20-Okt 2026',
    haulingPlan: 4860952,
    haulingActual: 4969364,
    haulingAchPct: 102,
    bargingPlan: 4803871,
    bargingActual: 4928525,
    bargingAchPct: 103,
    cycleTimePlan: 120.00,
    cycleTimeActual: 131.69,
    unitsRunningPlan: 40,
    unitsRunningActual: 41,
    loadingDurationPlan: 8.24,
    loadingDurationActual: 5.36,
    blcRatePlan: 1350.00,
    blcRateActual: 1397.83
  }
];

export const FUEL_HM_RATIOS = [
  { name: 'Cycle Time Flat Deck', unit: 'Menit', plan: 120.0, actual: 131.42 },
  { name: 'Flat Deck Running', unit: 'Unit', plan: 40, actual: 41 },
  { name: 'Fuel Ratio Unloading CY', unit: 'Ltr/Ton', plan: 0.12, actual: 0.11 },
  { name: 'HM Ratio Unloading CY', unit: 'HM/Ton', plan: 0.002, actual: 0.0019 },
  { name: 'Fuel Ratio Coal Hauling', unit: 'Ltr/Ton', plan: 0.35, actual: 0.33 },
  { name: 'HM Ratio Coal Hauling', unit: 'HM/Ton', plan: 0.005, actual: 0.0048 },
  { name: 'Fuel Ratio Stockpile Handling', unit: 'Ltr/Ton', plan: 0.18, actual: 0.17 },
  { name: 'Fuel Ratio Loading to Barge', unit: 'Ltr/Ton', plan: 0.22, actual: 0.20 },
  { name: 'Fuel Ratio Total', unit: 'Ltr/Ton', plan: 0.87, actual: 0.81 }
];
