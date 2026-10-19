import { DepartmentKpiRecord } from '../types';

/**
 * Data Resmi Operasional: Performance Departement Operation 2026
 * Diekstrak langsung dari spreadsheet kinerja operasional PT WBS
 */
export const DEPARTMENT_OPERATION_KPIS: DepartmentKpiRecord[] = [
  {
    periodName: 'Daily',
    dateRange: '13-Okt - 13-Okt',
    haulingPlan: 16647,
    haulingActual: 20309,
    haulingAchPct: 122,
    bargingPlan: 16452,
    bargingActual: 12627,
    bargingAchPct: 77,
    cycleTimePlan: 120.00,
    cycleTimeActual: 145.29,
    unitsRunningPlan: 40,
    unitsRunningActual: 41,
    loadingDurationPlan: 6.68,
    loadingDurationActual: 6.08,
    blcRatePlan: 1350.00,
    blcRateActual: 1510.70
  },
  {
    periodName: 'Weekly',
    dateRange: '6-Okt - 13-Okt',
    haulingPlan: 116530,
    haulingActual: 156634,
    haulingAchPct: 134,
    bargingPlan: 115161,
    bargingActual: 157982,
    bargingAchPct: 137,
    cycleTimePlan: 120.00,
    cycleTimeActual: 134.28,
    unitsRunningPlan: 40,
    unitsRunningActual: 42,
    loadingDurationPlan: 8.16,
    loadingDurationActual: 8.88,
    blcRatePlan: 1350.00,
    blcRateActual: 1413.51
  },
  {
    periodName: 'Monthly',
    dateRange: 'Monthly (Maret/Jan)',
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
    dateRange: '1-Jan - 13-Okt 2026',
    haulingPlan: 4744423,
    haulingActual: 4833891,
    haulingAchPct: 102,
    bargingPlan: 4688710,
    bargingActual: 4790293,
    bargingAchPct: 102,
    cycleTimePlan: 120.00,
    cycleTimeActual: 131.42,
    unitsRunningPlan: 40,
    unitsRunningActual: 41,
    loadingDurationPlan: 8.24,
    loadingDurationActual: 9.07,
    blcRatePlan: 1350.00,
    blcRateActual: 1397.47
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
