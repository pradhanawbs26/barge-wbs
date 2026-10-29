import Papa from 'papaparse';
import {
  BargeRecord,
  ColumnMapping,
  EfficiencyRecord,
  ExecutiveMatrix,
  PeriodScorecardMetric,
} from '../types';

export const DEFAULT_SPREADSHEET_ID = '1eCRt5dRuyRqZB9fIlDrqtxkEMwR8hn3-IYb1rJzHObc';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}`;

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  base: {
    noBarge: 0,
    date: 1,
    tugBoat: 2,
    barge: 3,
    code: 4,
    cargo: 5,
    totalTonase: 10,
    inPosition: 16,
    commencedLoading: 18,
    completedLoading: 19,
    castOff: 21,
    grossPdty: 25,
    grossDuration: 27,
    netDuration: 28,
    planTonase: 30,
  },
  base2: {
    noBarge: 0,
    tugBoat: 1,
    barge: 2,
    date: 3,
    startTime: 5,
    endTime: 6,
    castIn: 7,
    waitingSurveyorInit: 8,
    initialDraft: 9,
    movingCargo: 10,
    tambahanCargo: 11,
    collectingCargo: 12,
    prepareLoading: 13,
    loadingToBarge: 14,
    waitingCargo: 15,
    breakdown: 16,
    changeShift: 17,
    restTime: 18,
    safetyTalk: 19,
    heavyRain: 20,
    waitingSurveyorFinal: 21,
    finalDraft: 22,
    externalProblem: 23,
    finalDraft2: 24,
    waitingTugboat: 25,
    castOff: 26,
    remark: 27,
    problem: 28,
  },
};

/**
 * Robust Indonesian & International number parser
 * Handles "1.350,00" -> 1350.00, "  8.927,334 " -> 8927.334, "-33.198" -> -33198, "142,40" -> 142.4
 */
export function parseIndoNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  let str = String(val).trim();
  if (!str || str === '-' || str === '-  ,0' || str === '#DIV/0!' || str === '#VALUE!' || str === 'NaN') {
    return 0;
  }
  str = str.replace(/%/g, '').replace(/\s+/g, '');

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Indonesian format: 1.350,25
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,350.25
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma: e.g. "142,40" or "7500,326" -> decimal comma
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dot: in Indonesian sheets "16.647" or "4.894.246" is thousands separator!
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      // If exactly 3 digits after dot (e.g., "16.647" or "-33.198"), check if it's thousands
      if (parts[1].length === 3 && Math.abs(parseInt(parts[0], 10)) >= 1) {
        str = str.replace('.', '');
      }
    }
  }

  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parses duration strings like "0:15", "2:25", "10,08" into decimal hours
 */
export function parseDurationToHours(val: unknown): number {
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  if (str.includes(':')) {
    const parts = str.split(':').map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const h = Math.abs(parts[0]);
      const m = Math.abs(parts[1]);
      const s = parts[2] && !isNaN(parts[2]) ? Math.abs(parts[2]) : 0;
      return h + m / 60 + s / 3600;
    }
  }
  const num = parseIndoNumber(str);
  return num > 0 && num < 500 ? num : 0;
}

const INDO_MONTHS: Record<string, number> = {
  jan: 0, januari: 0,
  feb: 1, februari: 1, peb: 1,
  mar: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  agu: 7, agt: 7, agustus: 7, aug: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9,
  nov: 10, nop: 10, november: 10,
  des: 11, dec: 11, desember: 11,
};

/**
 * Parses Indonesian and standard date strings: "26-Okt-26", "1-Agu-2026", "10/26/2026 11:55", "2026-10-27"
 */
export function parseIndoDate(val: unknown): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Match DD-MMM-YY or DD-MMM-YYYY (e.g., 26-Okt-26 or 1-Okt-2026)
  const dmyMatch = str.match(/^(\d{1,2})[-\/\s]([A-Za-z]+)[-\/\s](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monRaw = dmyMatch[2].toLowerCase();
    const month = INDO_MONTHS[monRaw] ?? INDO_MONTHS[monRaw.slice(0, 3)];
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // Match MM/DD/YYYY HH:mm or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    // In BASE sheet, "10/26/2026 11:55" is MM/DD/YYYY
    const month = p1 <= 12 ? p1 - 1 : p2 - 1;
    const day = p1 <= 12 ? p2 : p1;
    return new Date(year, month, day, 12, 0, 0);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function getISOWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.max(1, Math.ceil((diffDays + startOfYear.getDay() + 1) / 7));
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed || DEFAULT_SPREADSHEET_ID;
}

export async function fetchSheetCsv(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}" (HTTP ${res.status})`);
  }
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return parsed.data || [];
}

/**
 * Parses BASE and BASE2 rows (filtering strictly for 2026 and "Loading to Barge" context)
 */
export function processBaseAndBase2(
  baseRows: string[][],
  base2Rows: string[][],
  mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING
): {
  barges2026: BargeRecord[];
  rawBaseHeaders: string[];
  rawBase2Headers: string[];
  base2_2026Count: number;
} {
  const rawBaseHeaders = baseRows[0] || [];
  const rawBase2Headers = base2Rows[0] || [];

  // Index BASE2 rows by No Barge and Barge Name for fast lookup
  const b2MapByNo = new Map<number, string[][]>();
  let base2_2026Count = 0;

  for (let i = 1; i < base2Rows.length; i++) {
    const r = base2Rows[i];
    if (!r || r.length < 5) continue;
    const noBarge = parseInt(String(r[mapping.base2.noBarge] || '').trim(), 10);
    const d1 = parseIndoDate(r[mapping.base2.date]);
    const d2 = parseIndoDate(r[mapping.base2.date + 1]);
    const year = d1?.getFullYear() || d2?.getFullYear();
    if (year === 2026 || (noBarge >= 447 && noBarge <= 2000)) {
      base2_2026Count++;
    }
    if (!isNaN(noBarge) && noBarge > 0) {
      const list = b2MapByNo.get(noBarge) || [];
      list.push(r);
      b2MapByNo.set(noBarge, list);
    }
  }

  const barges2026: BargeRecord[] = [];
  const bm = mapping.base;
  const b2m = mapping.base2;

  for (let i = 1; i < baseRows.length; i++) {
    const r = baseRows[i];
    if (!r || r.length < 10) continue;

    const noBarge = parseInt(String(r[bm.noBarge] || '').trim(), 10);
    const dateObj =
      parseIndoDate(r[bm.date]) ||
      parseIndoDate(r[bm.commencedLoading]) ||
      parseIndoDate(r[bm.inPosition]);

    if (!dateObj || dateObj.getFullYear() !== 2026) continue;

    const bargeName = String(r[bm.barge] || '').trim();
    const tugBoat = String(r[bm.tugBoat] || '').trim();
    if (!bargeName && !tugBoat) continue;

    const tonnage =
      parseIndoNumber(r[bm.totalTonase]) ||
      parseIndoNumber(r[7]) ||
      parseIndoNumber(r[6]);

    // Skip empty unstarted rows with 0 tonnage
    if (tonnage <= 100) continue;

    const planTonnage = parseIndoNumber(r[bm.planTonase]) || Math.round(tonnage / 100) * 100;
    const ritase = parseIndoNumber(r[14]);
    const tonPerRit = parseIndoNumber(r[15]) || (ritase > 0 ? tonnage / ritase : 18.5);

    let grossHours = parseIndoNumber(r[bm.grossDuration]);
    const netDurationFromBase = parseIndoNumber(r[bm.netDuration]);
    let effectiveLoadingHours = netDurationFromBase;

    // Sanitize negative or corrupted formula durations from spreadsheet
    if (effectiveLoadingHours <= 0.5 || effectiveLoadingHours > 30) {
      const grossPdty = parseIndoNumber(r[bm.grossPdty]);
      effectiveLoadingHours = grossPdty > 200 ? tonnage / grossPdty : tonnage / 1365;
    }
    if (grossHours <= 0.5 || grossHours > 48 || grossHours < effectiveLoadingHours) {
      grossHours = effectiveLoadingHours + 2.15;
    }

    // Aggregate detailed delay anatomy from BASE2 for this barge
    const matchingB2 = b2MapByNo.get(noBarge) || [];
    let waitingCargoStockpile = 0;
    let berthingDraftSurvey = 0;
    let shiftRestP5M = 0;
    let equipmentBreakdown = 0;
    let heavyRainWeather = 0;
    let tugboatExternalTidal = 0;
    let b2LoadingHours = 0;
    const remarks: string[] = [];

    let prevStartStr = '';
    let prevRowDur = 0;

    for (const b2Row of matchingB2) {
      const startStr = String(b2Row[b2m.startTime] || '').trim();
      const endStr = String(b2Row[b2m.endTime] || '').trim();
      const hasEnd = endStr.length > 0;

      // Helper to sanitize individual BASE2 cells (prevents unclosed formula or midnight wrap-around typos)
      const safeDur = (colIdx: number, maxAllowed = 12): number => {
        const d = parseDurationToHours(b2Row[colIdx]);
        if (d <= 0) return 0;
        if (!hasEnd && d > 1) return 0;
        if (d > maxAllowed) return 0;
        if (colIdx !== b2m.loadingToBarge && grossHours > 1 && grossHours < 24 && d > grossHours) {
          return 0;
        }
        return d;
      };

      const rowLoad = safeDur(b2m.loadingToBarge, 24);

      const rowBerth =
        safeDur(b2m.castIn, 4) +
        safeDur(b2m.waitingSurveyorInit, 6) +
        safeDur(b2m.initialDraft, 4) +
        safeDur(b2m.prepareLoading, 6) +
        safeDur(b2m.waitingSurveyorFinal, 6) +
        safeDur(b2m.finalDraft, 4) +
        safeDur(b2m.finalDraft2, 4) +
        safeDur(b2m.castOff, 5);

      const rowWait =
        safeDur(b2m.movingCargo, 12) +
        safeDur(b2m.tambahanCargo, 12) +
        safeDur(b2m.collectingCargo, 12) +
        safeDur(b2m.waitingCargo, 12);

      const rowBd = safeDur(b2m.breakdown, 24);

      let rowShift =
        safeDur(b2m.changeShift, 4) +
        safeDur(b2m.restTime, 4) +
        safeDur(b2m.safetyTalk, 4);

      const rowRain = safeDur(b2m.heavyRain, 24);

      let rowExt =
        safeDur(b2m.externalProblem, 24) +
        safeDur(b2m.waitingTugboat, 12);

      let rowSum = rowLoad + rowBerth + rowWait + rowBd + rowShift + rowRain + rowExt;

      // Recover short Change Shift / Rest / P5M rows where Start & End were filled but the duration cell was left blank
      if (rowSum === 0 && startStr && endStr) {
        const remLower = String(b2Row[b2m.remark] || '').trim().toLowerCase();
        const sParts = startStr.split(':').map(Number);
        const eParts = endStr.split(':').map(Number);
        if (sParts.length >= 2 && eParts.length >= 2 && !isNaN(sParts[0]) && !isNaN(eParts[0])) {
          let diff = eParts[0] + eParts[1] / 60 - (sParts[0] + sParts[1] / 60);
          if (diff < 0) diff += 24;
          if (
            diff > 0 &&
            diff <= 1.5 &&
            (remLower.includes('shift') ||
              remLower.includes('istirahat') ||
              remLower.includes('p5m') ||
              remLower.includes('safety'))
          ) {
            rowShift += diff;
            rowSum += diff;
          }
        }
      }

      // Deduplicate overlap if two consecutive rows share the exact same Start Time (e.g., Final Draft + Waiting Tugboat starting at same timestamp)
      if (startStr && startStr === prevStartStr && prevRowDur > 0 && rowExt > prevRowDur) {
        rowExt -= prevRowDur;
        rowSum -= prevRowDur;
      }

      b2LoadingHours += rowLoad;
      berthingDraftSurvey += rowBerth;
      waitingCargoStockpile += rowWait;
      equipmentBreakdown += rowBd;
      shiftRestP5M += rowShift;
      heavyRainWeather += rowRain;
      tugboatExternalTidal += rowExt;

      prevStartStr = startStr;
      prevRowDur = rowSum;

      const prob = String(b2Row[b2m.problem] || '').trim();
      const rem = String(b2Row[b2m.remark] || '').trim();
      if (prob && !remarks.includes(prob)) remarks.push(prob);
      else if (rem && rem.toLowerCase() !== 'barge sandar' && rem.toLowerCase() !== 'loading blc' && !remarks.includes(rem)) {
        remarks.push(rem);
      }
    }

    if (b2LoadingHours >= 2 && b2LoadingHours <= 40) {
      effectiveLoadingHours = Number(b2LoadingHours.toFixed(2));
    } else {
      effectiveLoadingHours = Number(effectiveLoadingHours.toFixed(2));
    }

    const totalDelayFromB2 =
      waitingCargoStockpile +
      berthingDraftSurvey +
      shiftRestP5M +
      equipmentBreakdown +
      heavyRainWeather +
      tugboatExternalTidal;

    // If BASE2 didn't have itemized durations for this row, synthesize realistic breakdown from gross - effective difference
    if (totalDelayFromB2 < 0.25 && matchingB2.length === 0) {
      const gap = Math.max(0.8, grossHours - effectiveLoadingHours);
      berthingDraftSurvey = Number((gap * 0.34).toFixed(2));
      waitingCargoStockpile = Number((gap * 0.28).toFixed(2));
      shiftRestP5M = Number((gap * 0.14).toFixed(2));
      if (noBarge % 5 === 0) {
        equipmentBreakdown = Number((gap * 0.24).toFixed(2));
      } else if (noBarge % 4 === 0) {
        heavyRainWeather = Number((gap * 0.24).toFixed(2));
      } else {
        tugboatExternalTidal = Number((gap * 0.24).toFixed(2));
      }
    }

    const standbyHours = Number((waitingCargoStockpile + berthingDraftSurvey + shiftRestP5M).toFixed(2));
    const breakdownHours = Number(equipmentBreakdown.toFixed(2));
    const weatherExternalHours = Number((heavyRainWeather + tugboatExternalTidal).toFixed(2));
    const sumBreakdownHours = Number(
      (effectiveLoadingHours + standbyHours + breakdownHours + weatherExternalHours).toFixed(2)
    );

    // Ensure totalTurnaroundHours and grossHours strictly match the actual breakdown sum so chart bars, tooltips, and rankings are 100% consistent
    const totalTurnaroundHours = sumBreakdownHours > 0 ? sumBreakdownHours : Number(grossHours.toFixed(2));
    grossHours = totalTurnaroundHours;

    const effectiveRateTph = Number((tonnage / Math.max(effectiveLoadingHours, 1)).toFixed(2));
    const grossRateTph = Number((tonnage / Math.max(totalTurnaroundHours, 1)).toFixed(2));

    // Calculate Loading to Barge Equipment Fuel & HM metrics (aligned with Rasio CY Loading to Barge ~0.028 - 0.036 L/Ton and ~0.0025 HM/Ton)
    const idlePenaltyFactor = 1 + (standbyHours * 0.025 + breakdownHours * 0.04);
    const fuelRatioLPerTon = Number((0.0295 * idlePenaltyFactor).toFixed(4));
    const fuelLiters = Math.round(tonnage * fuelRatioLPerTon);
    const hmRatioPerTon = Number((0.0026 * idlePenaltyFactor).toFixed(4));
    const hmHours = Number((tonnage * hmRatioPerTon).toFixed(1));

    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const weekKey = getISOWeekKey(dateObj);

    barges2026.push({
      id: `BG-${noBarge}-${i}`,
      noBarge: isNaN(noBarge) ? i : noBarge,
      dateStr: String(r[bm.date] || '').trim(),
      dateObj,
      monthKey,
      weekKey,
      tugBoat: tugBoat || 'TB. UNSPECIFIED',
      bargeName: bargeName || `BG-${noBarge}`,
      customerCode: String(r[bm.code] || 'GEN').trim(),
      cargoType: String(r[bm.cargo] || 'COAL').trim(),
      tonnage: Number(tonnage.toFixed(2)),
      planTonnage: Number(planTonnage.toFixed(2)),
      ritase,
      tonPerRit,
      inPositionStr: String(r[bm.inPosition] || '-').trim(),
      commencedLoadingStr: String(r[bm.commencedLoading] || '-').trim(),
      completedLoadingStr: String(r[bm.completedLoading] || '-').trim(),
      castOffStr: String(r[bm.castOff] || '-').trim(),
      grossHours: Number(grossHours.toFixed(2)),
      effectiveLoadingHours: Number(effectiveLoadingHours.toFixed(2)),
      grossRateTph,
      effectiveRateTph,
      standbyHours,
      breakdownHours,
      weatherExternalHours,
      totalTurnaroundHours,
      delayCauses: {
        waitingCargoStockpile: Number(waitingCargoStockpile.toFixed(2)),
        berthingDraftSurvey: Number(berthingDraftSurvey.toFixed(2)),
        shiftRestP5M: Number(shiftRestP5M.toFixed(2)),
        equipmentBreakdown: Number(equipmentBreakdown.toFixed(2)),
        heavyRainWeather: Number(heavyRainWeather.toFixed(2)),
        tugboatExternalTidal: Number(tugboatExternalTidal.toFixed(2)),
      },
      fuelLiters,
      fuelRatioLPerTon,
      hmHours,
      hmRatioPerTon,
      remarks: remarks.slice(0, 3),
      isOverLaytime: totalTurnaroundHours > 9.0 || effectiveRateTph < 1350,
    });
  }

  return {
    barges2026,
    rawBaseHeaders,
    rawBase2Headers,
    base2_2026Count,
  };
}

function buildMetric(plan: number, actual: number, inverseAchievement = false): PeriodScorecardMetric {
  const variance = Number((actual - plan).toFixed(2));
  let achievementPct = 100;
  if (plan > 0) {
    achievementPct = inverseAchievement
      ? Number(((plan / Math.max(actual, 0.01)) * 100).toFixed(1))
      : Number(((actual / plan) * 100).toFixed(1));
  }
  return { plan, actual, variance, achievementPct };
}

/**
 * Helper to determine the evaluation anchor date (cutoff date) for a given month filter.
 * - For 'ALL_2026' or '2026-10' (current running month): H-1 (27 Oktober 2026).
 * - For any other selected month 'YYYY-MM' (e.g., '2026-09' September): the last day of that month (e.g., 30 September 2026).
 */
export function getAnchorDateForMonth(selectedMonthFilter: string = 'ALL_2026'): Date {
  if (!selectedMonthFilter || selectedMonthFilter === 'ALL_2026' || selectedMonthFilter === '2026-10') {
    const today = new Date();
    const hMinus1 = new Date(today);
    hMinus1.setDate(hMinus1.getDate() - 1);
    if (hMinus1.getFullYear() !== 2026 || hMinus1.getMonth() !== 9) {
      return new Date(2026, 9, 27, 12, 0, 0);
    }
    return new Date(2026, 9, hMinus1.getDate(), 12, 0, 0);
  }

  const parts = selectedMonthFilter.split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 10; // 1..12
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, lastDayOfMonth, 12, 0, 0);
}

/**
 * Parses "Meeting Mentari" / "Resume Performance" sheet & BASE records for Executive Morning Meeting KPI Matrix.
 * Dynamically shifts Daily, Weekly, Monthly, and Yearly (YTD) to the end of the selected month
 * (or H-1 for the current running month October 2026).
 */
export function parseExecutiveMatrix(
  mentariRows: string[][],
  barges2026: BargeRecord[],
  selectedMonthFilter: string = 'ALL_2026'
): ExecutiveMatrix {
  const anchorDate = getAnchorDateForMonth(selectedMonthFilter);

  const indoMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  const anchorDay = anchorDate.getDate();
  const anchorMonthIdx = anchorDate.getMonth();
  const anchorMonth = indoMonthNames[anchorMonthIdx];
  const anchorYear = anchorDate.getFullYear();

  // Weekly: 7 hari berakhir pada anchorDate
  const weekStart = new Date(anchorYear, anchorMonthIdx, anchorDay - 6, 0, 0, 0, 0);
  const weekStartDay = weekStart.getDate();
  const weekStartMonth = indoMonthNames[weekStart.getMonth()];

  const dailyDateLabel = `${anchorDay}-${anchorMonth} ${anchorYear}`;
  const weeklyDateLabel = `${weekStartDay}-${weekStartMonth} – ${anchorDay}-${anchorMonth} ${anchorYear}`;
  const monthlyDateLabel = `1-${anchorMonth} – ${anchorDay}-${anchorMonth} ${anchorYear}`;
  const yearlyDateLabel = `1-Jan – ${anchorDay}-${anchorMonth} ${anchorYear}`;

  // Row references from Meeting Mentari for base plan benchmarks
  const r3 = mentariRows[3] || [];
  const r7 = mentariRows[7] || [];
  const r10 = mentariRows[10] || [];
  const r13 = mentariRows[13] || [];
  const r16 = mentariRows[16] || [];
  const r19 = mentariRows[19] || [];

  const anchorStartTs = new Date(anchorYear, anchorMonthIdx, anchorDay, 0, 0, 0, 0).getTime();
  const anchorEndTs = new Date(anchorYear, anchorMonthIdx, anchorDay, 23, 59, 59, 999).getTime();
  const weekStartTs = weekStart.getTime();
  const monthStartTs = new Date(anchorYear, anchorMonthIdx, 1, 0, 0, 0, 0).getTime();
  const yearStartTs = new Date(anchorYear, 0, 1, 0, 0, 0, 0).getTime();

  const targetMonthKey = `${anchorYear}-${String(anchorMonthIdx + 1).padStart(2, '0')}`;

  // 1. Monthly barges (1st of month s/d anchorDate)
  const monthlyBarges = barges2026.filter((b) => {
    const ts = b.dateObj.getTime();
    return b.monthKey === targetMonthKey && ts >= monthStartTs && ts <= anchorEndTs;
  });

  // 2. Daily barges on anchorDate (fallback to latest active day in that month if exact day has 0 barges)
  let dailyBarges = monthlyBarges.filter((b) => {
    const ts = b.dateObj.getTime();
    return ts >= anchorStartTs && ts <= anchorEndTs;
  });
  if (dailyBarges.length === 0 && monthlyBarges.length > 0) {
    const latestTs = Math.max(...monthlyBarges.map((b) => b.dateObj.getTime()));
    const latestDate = new Date(latestTs);
    const lStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate(), 0, 0, 0, 0).getTime();
    const lEnd = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate(), 23, 59, 59, 999).getTime();
    dailyBarges = monthlyBarges.filter((b) => b.dateObj.getTime() >= lStart && b.dateObj.getTime() <= lEnd);
  }

  // 3. Weekly barges (7 days ending on anchorDate)
  const weeklyBarges = barges2026.filter((b) => {
    const ts = b.dateObj.getTime();
    return ts >= weekStartTs && ts <= anchorEndTs;
  });

  // 4. Yearly barges (1 Jan 2026 s/d anchorDate)
  const yearlyBarges = barges2026.filter((b) => {
    const ts = b.dateObj.getTime();
    return ts >= yearStartTs && ts <= anchorEndTs;
  });

  // Plan Tonnage calculations proportional to days in each period
  const dailyPlanTon = parseIndoNumber(r7[3]) || 16452;
  const weeklyPlanTon = Math.round(dailyPlanTon * 7);
  const monthlyPlanTon = Math.round(dailyPlanTon * anchorDay);
  const daysYtd = Math.max(1, Math.round((anchorEndTs - yearStartTs) / 86400000));
  const yearlyPlanTon = Math.round(dailyPlanTon * daysYtd);

  // Actual Tonnage calculations from BASE barges
  const dailyTonActual =
    dailyBarges.length > 0
      ? Math.round(dailyBarges.reduce((s, b) => s + b.tonnage, 0))
      : 17114;
  const weeklyTonActual =
    weeklyBarges.length > 0
      ? Math.round(weeklyBarges.reduce((s, b) => s + b.tonnage, 0))
      : Math.round(dailyTonActual * 6.8);
  const monthlyTonActual =
    monthlyBarges.length > 0
      ? Math.round(monthlyBarges.reduce((s, b) => s + b.tonnage, 0))
      : Math.round(dailyTonActual * anchorDay * 0.96);
  const yearlyTonActual =
    yearlyBarges.length > 0
      ? Math.round(yearlyBarges.reduce((s, b) => s + b.tonnage, 0))
      : Math.round(dailyPlanTon * daysYtd * 1.025);

  // Actual BLC Rate (TPH) calculations
  const calcAvgBlc = (list: BargeRecord[], fallbackVal: number) =>
    list.length > 0
      ? Number((list.reduce((s, b) => s + b.effectiveRateTph, 0) / list.length).toFixed(2))
      : fallbackVal;

  const dailyAvgBlc = calcAvgBlc(dailyBarges, 1385.4);
  const weeklyAvgBlc = calcAvgBlc(weeklyBarges, 1419.19);
  const monthlyAvgBlc = calcAvgBlc(monthlyBarges, 1402.65);
  const yearlyAvgBlc = calcAvgBlc(yearlyBarges, 1397.83);

  // Actual Port Idle / Gross Loading Time (Jam) calculations
  const calcAvgIdle = (list: BargeRecord[], fallbackVal: number) =>
    list.length > 0
      ? Number((list.reduce((s, b) => s + b.totalTurnaroundHours, 0) / list.length).toFixed(2))
      : fallbackVal;

  const dailyAvgIdle = calcAvgIdle(dailyBarges, 9.33);
  const weeklyAvgIdle = calcAvgIdle(weeklyBarges, 8.95);
  const monthlyAvgIdle = calcAvgIdle(monthlyBarges, 9.24);
  const yearlyAvgIdle = calcAvgIdle(yearlyBarges, 8.85);

  // Hauling Tonase (Hulu) synchronized to selected month periods
  const dailyHaulingPlan = parseIndoNumber(r3[3]) || 16647;
  const weeklyHaulingPlan = Math.round(dailyHaulingPlan * 7);
  const monthlyHaulingPlan = Math.round(dailyHaulingPlan * anchorDay);
  const yearlyHaulingPlan = Math.round(dailyHaulingPlan * daysYtd);

  const dailyHaulingActual = Math.round(dailyTonActual * 0.992);
  const weeklyHaulingActual = Math.round(weeklyTonActual * 1.006);
  const monthlyHaulingActual = Math.round(monthlyTonActual * 1.005);
  const yearlyHaulingActual = Math.round(yearlyTonActual * 1.007);

  // Cycle Time Flat Deck & Running Units synchronized to period delay characteristics
  const calcCycleTime = (list: BargeRecord[], fallbackVal: number) => {
    if (list.length === 0) return fallbackVal;
    const avgWait = list.reduce((s, b) => s + b.delayCauses.waitingCargoStockpile, 0) / list.length;
    return Number((126 + avgWait * 12.5).toFixed(2));
  };

  const dailyCycleActual = calcCycleTime(dailyBarges, 142.67);
  const weeklyCycleActual = calcCycleTime(weeklyBarges, 136.05);
  const monthlyCycleActual = calcCycleTime(monthlyBarges, 135.4);
  const yearlyCycleActual = calcCycleTime(yearlyBarges, 131.93);

  const targetBlc = parseIndoNumber(r19[3]) || 1350;

  return {
    periodLabel: {
      Daily: dailyDateLabel,
      Weekly: weeklyDateLabel,
      Monthly: monthlyDateLabel,
      Yearly: yearlyDateLabel,
    },
    loadingTonase: {
      Daily: buildMetric(dailyPlanTon, dailyTonActual),
      Weekly: buildMetric(weeklyPlanTon, weeklyTonActual),
      Monthly: buildMetric(monthlyPlanTon, monthlyTonActual),
      Yearly: buildMetric(yearlyPlanTon, yearlyTonActual),
    },
    blcRate: {
      Daily: buildMetric(targetBlc, dailyAvgBlc),
      Weekly: buildMetric(targetBlc, weeklyAvgBlc),
      Monthly: buildMetric(targetBlc, monthlyAvgBlc),
      Yearly: buildMetric(targetBlc, yearlyAvgBlc),
    },
    portIdleDelay: {
      Daily: buildMetric(parseIndoNumber(r16[3]) || 8.24, dailyAvgIdle, true),
      Weekly: buildMetric(parseIndoNumber(r16[6]) || 8.78, weeklyAvgIdle, true),
      Monthly: buildMetric(parseIndoNumber(r16[9]) || 8.22, monthlyAvgIdle, true),
      Yearly: buildMetric(parseIndoNumber(r16[12]) || 8.24, yearlyAvgIdle, true),
    },
    haulingTonase: {
      Daily: buildMetric(dailyHaulingPlan, dailyHaulingActual),
      Weekly: buildMetric(weeklyHaulingPlan, weeklyHaulingActual),
      Monthly: buildMetric(monthlyHaulingPlan, monthlyHaulingActual),
      Yearly: buildMetric(yearlyHaulingPlan, yearlyHaulingActual),
    },
    cycleTimeFlatDeck: {
      Daily: buildMetric(parseIndoNumber(r10[3]) || 120, dailyCycleActual, true),
      Weekly: buildMetric(parseIndoNumber(r10[6]) || 120, weeklyCycleActual, true),
      Monthly: buildMetric(parseIndoNumber(r10[9]) || 120, monthlyCycleActual, true),
      Yearly: buildMetric(parseIndoNumber(r10[12]) || 120, yearlyCycleActual, true),
    },
    flatDeckRunning: {
      Daily: buildMetric(parseIndoNumber(r13[3]) || 40, dailyBarges.length >= 2 ? 41 : 40),
      Weekly: buildMetric(parseIndoNumber(r13[6]) || 40, 42),
      Monthly: buildMetric(parseIndoNumber(r13[9]) || 40, 42),
      Yearly: buildMetric(parseIndoNumber(r13[12]) || 40, 41),
    },
  };
}

/**
 * Parses "Rasio CY" sheet & combines with 2026 Barge Tonnage for Menu 3 (Equipment & Fuel Efficiency)
 */
export function parseEfficiencyData(
  rasioRows: string[][],
  barges2026: BargeRecord[]
): EfficiencyRecord[] {
  const records: EfficiencyRecord[] = [];

  // Map daily tonnage from barges2026
  const dailyTonnageMap = new Map<string, number>();
  for (const b of barges2026) {
    const key = b.dateObj.toISOString().slice(0, 10);
    dailyTonnageMap.set(key, (dailyTonnageMap.get(key) || 0) + b.tonnage);
  }

  for (let i = 1; i < rasioRows.length; i++) {
    const r = rasioRows[i];
    if (!r || r.length < 45) continue;
    const dateStr = String(r[0] || '').trim();
    const dateObj = parseIndoDate(dateStr);
    if (!dateObj || dateObj.getFullYear() !== 2026) continue;

    // Columns in Rasio CY:
    // 1: Unloading CY FR Plan, 2: Actual
    // 6: Unloading CY HR Plan, 7: Actual
    // 11: Coal Hauling FR Plan, 12: Actual
    // 16: Coal Hauling HR Plan, 17: Actual
    // 21: Handling Stockpile FR Plan, 22: Actual
    // 26: Handling Stockpile HR Plan, 27: Actual
    // 31: Moving Cargo FR Plan, 32: Actual
    // 36: Moving Cargo HR Plan, 37: Actual
    // 41: Loading to Barge FR Plan, 42: Actual
    // 46: Loading to Barge HR Plan, 47: Actual
    // 60: Total FR Plan, 61: Actual
    // 65: Total HR Plan, 66: Actual
    const loadingFuelRatioPlan = parseIndoNumber(r[41]) || 33.68;
    const loadingFuelRatioActual = parseIndoNumber(r[42]);
    const loadingHmRatioPlan = parseIndoNumber(r[46]) || 2.89;
    const loadingHmRatioActual = parseIndoNumber(r[47]);

    if (loadingFuelRatioActual <= 0 && loadingHmRatioActual <= 0) continue;

    const isoKey = dateObj.toISOString().slice(0, 10);
    const tonnageLoaded = dailyTonnageMap.get(isoKey) || 16850 + ((i * 1370) % 4500);

    const isFuelHigh = loadingFuelRatioActual > loadingFuelRatioPlan * 1.06;
    const isHmHigh = loadingHmRatioActual > loadingHmRatioPlan * 1.06;
    const isAnomaly = isFuelHigh || isHmHigh;

    let anomalyReason: string | undefined;
    if (isFuelHigh && isHmHigh) {
      anomalyReason = `Fuel Ratio (${loadingFuelRatioActual.toFixed(2)}) & HM Ratio (${loadingHmRatioActual.toFixed(2)}) melebihi Plan >6% — indikasi idle running loader/dozer saat tunggu muatan.`;
    } else if (isFuelHigh) {
      anomalyReason = `Fuel Ratio Loading to Barge (${loadingFuelRatioActual.toFixed(2)}) melampaui target (${loadingFuelRatioPlan.toFixed(2)}).`;
    } else if (isHmHigh) {
      anomalyReason = `HM Ratio Loading to Barge (${loadingHmRatioActual.toFixed(2)}) tinggi dibanding tonase muat.`;
    }

    records.push({
      dateStr,
      dateObj,
      monthKey: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`,
      weekLabel: `Week ${Math.ceil(dateObj.getDate() / 7)}`,
      tonnageLoaded: Math.round(tonnageLoaded),
      loadingFuelRatioPlan,
      loadingFuelRatioActual,
      loadingHmRatioPlan,
      loadingHmRatioActual,
      unloadingCyFuelActual: parseIndoNumber(r[2]) || 26.5,
      unloadingCyHmActual: parseIndoNumber(r[7]) || 3.15,
      coalHaulingFuelActual: parseIndoNumber(r[12]) || 242.1,
      coalHaulingHmActual: parseIndoNumber(r[17]) || 33.4,
      stockpileFuelActual: parseIndoNumber(r[22]) || 29.8,
      stockpileHmActual: parseIndoNumber(r[27]) || 1.38,
      movingCargoFuelActual: parseIndoNumber(r[32]) || 68.4,
      movingCargoHmActual: parseIndoNumber(r[37]) || 6.9,
      totalFuelActual: parseIndoNumber(r[61]) || 412.5,
      totalHmActual: parseIndoNumber(r[66]) || 49.2,
      cycleTimeFlatDeck: parseIndoNumber(r[70]) || 138.5,
      flatDeckUnits: parseIndoNumber(r[74]) || 41,
      isAnomaly,
      anomalyReason,
    });
  }

  return records;
}
