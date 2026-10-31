import * as XLSX from 'xlsx';
import { FOCUS_YEAR, HAULING_CONFIG, HaulingConfig } from '../config/haulingConfig';
import {
  DailyKaItem,
  HaulingKpiResult,
  HaulingPeriodMetrics,
  HaulingRecord,
  MonthlyKaSummary,
  PeriodType,
} from '../types';

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

const INDO_SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const INDO_FULL_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Format Date object to 'YYYY-MM-DD'
 */
export function toIsoDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse Date from Indonesian string ('30-Oktober-2026', '2026-10-30', '10/30/2026')
 */
export function parseHaulingDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0);
  }
  const str = String(val).trim();
  if (!str) return null;

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // DD-MMMM-YYYY or DD-MMM-YY (e.g. '30-Oktober-2026')
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

  // MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    const month = p1 <= 12 ? p1 - 1 : p2 - 1;
    const day = p1 <= 12 ? p2 : p1;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  return null;
}

/**
 * Aturan 3: Konversi INCOMING, Waktu Bongkaran, dan Jumlah FD ke angka dengan toleransi
 * (buang karakter non-digit seperti backtick atau spasi).
 * Nilai non-numerik yang tak terselamatkan (mis. teks "MIP" atau sel kosong) -> null.
 */
export function parseTolerantHaulingNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }

  // Buang backtick, tanda kutip tunggal, dan spasi
  let str = String(val).replace(/[`'\s]/g, '').trim();
  if (!str || str === '-' || str === '–') return null;

  // Jika mengandung huruf alfabet (seperti "MIP", "MT", "N/A"), tidak terselamatkan -> null
  if (/[A-Za-z]/.test(str)) return null;

  // Buang karakter non-numerik selain digit, titik, koma, dan minus
  str = str.replace(/[^0-9.,-]/g, '');
  if (!str || str === '-' || str === '.' || str === ',') return null;

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Format Indonesia: "2.814,77" -> "2814.77"
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US: "2,814.77" -> "2814.77"
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = str.split('.');
    if (
      parts.length > 2 ||
      (parts.length === 2 && parts[1].length === 3 && Math.abs(parseInt(parts[0], 10)) >= 1)
    ) {
      str = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Aturan 5: Normalisasi CARGO:
 * Hapus awalan "PRODUCT ", rapikan spasi di sekitar tanda "-", rapikan spasi ganda, uppercase. Jangan pecah blend.
 */
export function normalizeCargoName(val: unknown): string {
  const raw = String(val ?? '').trim();
  if (!raw) return 'UNSPECIFIED';
  return raw
    .replace(/^PRODUCT\s+/i, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Pembersihan Data Sheet "Volume Hauling" (Sekali di lapisan data, difilter ke FOCUS_YEAR = 2026)
 * Kolom B (idx 1): DATE
 * Kolom C (idx 2): MONTH (diabaikan, diturunkan dari DATE)
 * Kolom D (idx 3): CODE
 * Kolom E (idx 4): CARGO
 * Kolom F (idx 5): INCOMING (MT)
 * Kolom H (idx 7): NO.KA
 * Kolom I (idx 8): Waktu Bongkaran (menit)
 * Kolom J (idx 9): Jumlah FD
 * Kolom K (idx 10): Shift
 * Kolom P (idx 15): Kendala
 */
export function cleanVolumeHaulingRows(
  rawRows: unknown[][],
  focusYear: number = FOCUS_YEAR,
  outlierThreshold: number = HAULING_CONFIG.outlierDurationThresholdMinutes
): HaulingRecord[] {
  const records: HaulingRecord[] = [];
  if (!rawRows || rawRows.length <= 1) return records;

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length < 6) continue;

    // 1. Ambil hanya baris dengan DATE valid dan tahun === FOCUS_YEAR (2026)
    const dateObj = parseHaulingDate(r[1]);
    if (!dateObj || dateObj.getFullYear() !== focusYear) continue;

    // 1 & 3. INCOMING numerik (> 0); abaikan baris kosong di bawah data (hanya berisi "MT")
    const incomingTon = parseTolerantHaulingNumber(r[5]);
    if (incomingTon === null || incomingTon <= 0) continue;

    // 2. Turunkan bulan langsung dari DATE (abaikan kolom MONTH)
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateIso = `${yyyy}-${mm}-${dd}`;
    const monthKey = `${yyyy}-${mm}`;
    const dateStr = `${parseInt(dd, 10)}-${INDO_SHORT_MONTHS[dateObj.getMonth()]}-${yyyy}`;

    // 3. Waktu Bongkaran & Jumlah FD dengan toleransi; non-numerik ("MIP" / kosong) -> null
    const rawDurasi = parseTolerantHaulingNumber(r[8]);
    const durasiMenit = rawDurasi !== null && rawDurasi > 0 ? rawDurasi : null;

    const rawFd = parseTolerantHaulingNumber(r[9]);
    const jumlahFd = rawFd !== null && rawFd > 0 ? rawFd : null;

    // 4. NO.KA bertipe campuran -> simpan sebagai string, trim, hapus spasi internal
    const noKa = String(r[7] ?? '').trim().replace(/\s+/g, '');

    // 5. CARGO normalisasi
    const cargo = normalizeCargoName(r[4]);

    // 7. Shift bernilai campuran (1, 2, "1>2", "2>1") -> hapus spasi sebelum dipakai
    const shift = String(r[10] ?? '').trim().replace(/\s+/g, '');

    const code = String(r[3] ?? '').trim();
    const kendala = String(r[15] ?? '').trim();

    records.push({
      id: `KA-${dateIso}-${i}`,
      rowNumber: i + 1,
      dateObj,
      dateIso,
      dateStr,
      monthKey,
      code,
      cargo,
      incomingTon,
      noKa,
      durasiMenit,
      jumlahFd,
      shift,
      kendala,
      isOutlierDuration: durasiMenit !== null && durasiMenit > outlierThreshold,
    });
  }

  return records;
}

/**
 * Parse langsung dari workbook XLSX (SheetJS) jika user mengunggah file .xlsx
 */
export function parseVolumeHaulingXlsx(
  buffer: ArrayBuffer,
  focusYear: number = FOCUS_YEAR
): HaulingRecord[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes('volume hauling')) || wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
  });
  return cleanVolumeHaulingRows(rawRows, focusYear);
}

/**
 * Clamp tanggal referensi agar selalu berada di dalam FOCUS_YEAR (1 Jan 2026 s.d. 31 Des 2026)
 */
export function clampDateToFocusYear(
  dateInput: Date | string | null | undefined,
  focusYear: number = FOCUS_YEAR,
  fallbackIso: string = HAULING_CONFIG.defaultRefDateIso
): Date {
  const parsed = typeof dateInput === 'string' ? parseHaulingDate(dateInput) : dateInput;
  const minDate = new Date(focusYear, 0, 1, 12, 0, 0);
  const maxDate = new Date(focusYear, 11, 31, 12, 0, 0);

  if (!parsed || isNaN(parsed.getTime())) {
    return parseHaulingDate(fallbackIso) || new Date(focusYear, 9, 30, 12, 0, 0);
  }
  if (parsed.getFullYear() < focusYear) return minDate;
  if (parsed.getFullYear() > focusYear) return maxDate;
  return new Date(focusYear, parsed.getMonth(), parsed.getDate(), 12, 0, 0);
}

/**
 * Hitung tanggal terakhir yang memiliki data di tahun FOCUS_YEAR (default: 2026-10-30)
 */
export function getLatestHaulingDateIso(
  rows: HaulingRecord[],
  focusYear: number = FOCUS_YEAR
): string {
  const valid = rows.filter((r) => r.dateObj.getFullYear() === focusYear);
  if (valid.length === 0) return HAULING_CONFIG.defaultRefDateIso;
  let maxTs = 0;
  let maxIso = HAULING_CONFIG.defaultRefDateIso;
  for (const r of valid) {
    const ts = r.dateObj.getTime();
    if (ts > maxTs) {
      maxTs = ts;
      maxIso = r.dateIso;
    }
  }
  return maxIso;
}

/**
 * Hitung jumlah hari kalender dan Plan Tonase prorata untuk rentang [startDate, endDate].
 * Jika ada bulan di dalam periode yang belum diisi di config.planTonPerBulan,
 * kembalikan planTon = null agar UI menampilkan "–" (bukan 0).
 */
function computeCalendarAndPlanForRange(
  startDate: Date,
  endDate: Date,
  config: HaulingConfig
): {
  calendarDays: number;
  planTon: number | null;
  planKaPeriode: number | null;
  planKaPerHari: number | null;
} {
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12, 0, 0);

  let calendarDays = 0;
  let totalPlanTon = 0;
  let hasMissingMonthPlan = false;

  while (cur <= end) {
    calendarDays++;
    const mk = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const monthlyPlan = config.planTonPerBulan[mk];
    if (monthlyPlan === undefined || monthlyPlan === null || monthlyPlan <= 0) {
      hasMissingMonthPlan = true;
    } else {
      const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      totalPlanTon += monthlyPlan / daysInMonth;
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (calendarDays === 0 || hasMissingMonthPlan) {
    return {
      calendarDays,
      planTon: null,
      planKaPeriode: null,
      planKaPerHari: null,
    };
  }

  const planKaPeriode = totalPlanTon / config.planTonPerKa;
  const planKaPerHari = planKaPeriode / calendarDays;

  return {
    calendarDays,
    planTon: totalPlanTon,
    planKaPeriode,
    planKaPerHari,
  };
}

/**
 * Fungsi murni computeHaulingKpi(rows, refDate, config, options)
 * Menghitung metrik Daily, Weekly, Monthly, dan Yearly 2026 berdasarkan tanggal referensi.
 */
export function computeHaulingKpi(
  rows: HaulingRecord[],
  refDateInput: Date | string,
  config: HaulingConfig = HAULING_CONFIG,
  options?: { excludeOutlierDuration?: boolean }
): HaulingKpiResult {
  const excludeOutlier = options?.excludeOutlierDuration ?? false;
  const focusYear = config.focusYear || FOCUS_YEAR;

  // Guard: pastikan hanya baris tahun FOCUS_YEAR yang dihitung
  const rows2026 = rows.filter((r) => r.dateObj.getFullYear() === focusYear);

  const byMonthCount: Record<string, number> = {};
  for (const r of rows2026) {
    byMonthCount[r.monthKey] = (byMonthCount[r.monthKey] || 0) + 1;
  }

  const refDate = clampDateToFocusYear(refDateInput, focusYear, config.defaultRefDateIso);
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();
  const refMonthShort = INDO_SHORT_MONTHS[refMonth];

  const yearStart = new Date(focusYear, 0, 1, 12, 0, 0);
  const monthStart = new Date(focusYear, refMonth, 1, 12, 0, 0);

  // Weekly = 7 hari berakhir di tanggal referensi, tidak boleh melewati 1 Jan 2026
  const rawWeekStart = new Date(focusYear, refMonth, refDay - 6, 12, 0, 0);
  const weekStart = rawWeekStart < yearStart ? yearStart : rawWeekStart;

  const dailyLabel = `${refDay}-${refMonthShort} ${refYear}`;
  const weeklyLabel = `${weekStart.getDate()}-${INDO_SHORT_MONTHS[weekStart.getMonth()]} – ${refDay}-${refMonthShort} ${refYear}`;
  const monthlyLabel = `1-${refMonthShort} – ${refDay}-${refMonthShort} ${refYear}`;
  const yearlyLabel = `1-Jan – ${refDay}-${refMonthShort} ${refYear}`;

  const buildPeriodMetrics = (
    period: PeriodType,
    label: string,
    startDate: Date,
    endDate: Date
  ): HaulingPeriodMetrics => {
    const startIso = toIsoDateStr(startDate);
    const endIso = toIsoDateStr(endDate);

    const periodRows = rows2026.filter(
      (r) => r.dateIso >= startIso && r.dateIso <= endIso
    );

    const { calendarDays, planTon, planKaPeriode, planKaPerHari } =
      computeCalendarAndPlanForRange(startDate, endDate, config);

    const hasData = periodRows.length > 0;
    const totalKa = periodRows.length;

    const actualTon = hasData
      ? periodRows.reduce((sum, r) => sum + r.incomingTon, 0)
      : null;

    const tonAchievementPct =
      planTon !== null && planTon > 0 && actualTon !== null
        ? (actualTon / planTon) * 100
        : null;

    const outlierCount = periodRows.filter(
      (r) =>
        r.durasiMenit !== null &&
        r.durasiMenit > config.outlierDurationThresholdMinutes
    ).length;

    const validDurRows = periodRows.filter(
      (r) =>
        r.durasiMenit !== null &&
        (!excludeOutlier || r.durasiMenit <= config.outlierDurationThresholdMinutes)
    );
    const actualDurasi =
      validDurRows.length > 0
        ? validDurRows.reduce((sum, r) => sum + (r.durasiMenit as number), 0) /
          validDurRows.length
        : null;
    const selisihDurasi =
      actualDurasi !== null ? actualDurasi - config.planDurasiMenit : null;

    const validFdRows = periodRows.filter((r) => r.jumlahFd !== null);
    const actualFd =
      validFdRows.length > 0
        ? validFdRows.reduce((sum, r) => sum + (r.jumlahFd as number), 0) /
          validFdRows.length
        : null;
    const selisihFd = actualFd !== null ? actualFd - config.planFdPerKa : null;

    // KA per Hari = jumlah KA dibongkar dalam periode / jumlah hari kalender dalam periode
    // Jika periode sama sekali tidak memiliki data (mis. bulan masa depan Nov/Des 2026), tampilkan null ("–")
    const actualKaPerHari =
      hasData && calendarDays > 0 ? totalKa / calendarDays : null;

    const kaAchievementPct =
      planKaPerHari !== null && planKaPerHari > 0 && actualKaPerHari !== null
        ? (actualKaPerHari / planKaPerHari) * 100
        : null;

    return {
      period,
      label,
      startDateIso: startIso,
      endDateIso: endIso,
      calendarDays,
      hasData,
      planTon,
      actualTon,
      tonAchievementPct,
      planDurasi: config.planDurasiMenit,
      actualDurasi,
      selisihDurasi,
      outlierCount,
      planFd: config.planFdPerKa,
      actualFd,
      selisihFd,
      totalKa,
      planKaPeriode,
      planKaPerHari,
      actualKaPerHari,
      kaAchievementPct,
    };
  };

  return {
    refDateIso: toIsoDateStr(refDate),
    refDateLabel: dailyLabel,
    excludeOutlierDuration: excludeOutlier,
    totalRows2026: rows2026.length,
    byMonthCount,
    periods: {
      Daily: buildPeriodMetrics('Daily', dailyLabel, refDate, refDate),
      Weekly: buildPeriodMetrics('Weekly', weeklyLabel, weekStart, refDate),
      Monthly: buildPeriodMetrics('Monthly', monthlyLabel, monthStart, refDate),
      Yearly: buildPeriodMetrics('Yearly', yearlyLabel, yearStart, refDate),
    },
  };
}

/**
 * Fungsi murni computeDailyKa(rows, startDate, endDate, config, options)
 * Menghasilkan deret harian untuk grafik "Jumlah KA Dibongkar per Hari" dan tabel detail.
 * Hari tanpa KA tetap muncul sebagai bar 0.
 */
export function computeDailyKa(
  rows: HaulingRecord[],
  startDateInput: Date | string,
  endDateInput: Date | string,
  config: HaulingConfig = HAULING_CONFIG,
  options?: { excludeOutlierDuration?: boolean }
): DailyKaItem[] {
  const excludeOutlier = options?.excludeOutlierDuration ?? false;
  const focusYear = config.focusYear || FOCUS_YEAR;

  const startDate = clampDateToFocusYear(startDateInput, focusYear, '2026-10-01');
  const endDate = clampDateToFocusYear(endDateInput, focusYear, config.defaultRefDateIso);

  const rows2026 = rows.filter((r) => r.dateObj.getFullYear() === focusYear);
  const byDateMap = new Map<string, HaulingRecord[]>();
  for (const r of rows2026) {
    const list = byDateMap.get(r.dateIso) || [];
    list.push(r);
    byDateMap.set(r.dateIso, list);
  }

  const items: DailyKaItem[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12, 0, 0);

  while (cur <= end) {
    const dateIso = toIsoDateStr(cur);
    const day = cur.getDate();
    const monShort = INDO_SHORT_MONTHS[cur.getMonth()];
    const year = cur.getFullYear();
    const monthKey = `${year}-${String(cur.getMonth() + 1).padStart(2, '0')}`;

    const dayRows = byDateMap.get(dateIso) || [];
    const jumlahKa = dayRows.length;
    const totalTonase = dayRows.reduce((s, r) => s + r.incomingTon, 0);

    const validDurRaw = dayRows.filter((r) => r.durasiMenit !== null);
    const avgDurasiRaw =
      validDurRaw.length > 0
        ? validDurRaw.reduce((s, r) => s + (r.durasiMenit as number), 0) / validDurRaw.length
        : null;

    const validDur = dayRows.filter(
      (r) =>
        r.durasiMenit !== null &&
        (!excludeOutlier || r.durasiMenit <= config.outlierDurationThresholdMinutes)
    );
    const avgDurasi =
      validDur.length > 0
        ? validDur.reduce((s, r) => s + (r.durasiMenit as number), 0) / validDur.length
        : null;

    const validFd = dayRows.filter((r) => r.jumlahFd !== null);
    const avgFd =
      validFd.length > 0
        ? validFd.reduce((s, r) => s + (r.jumlahFd as number), 0) / validFd.length
        : null;

    const kendalaList: string[] = [];
    const outlierDetails: string[] = [];
    let hasOutlier = false;

    for (const r of dayRows) {
      if (r.isOutlierDuration) {
        hasOutlier = true;
        outlierDetails.push(
          `KA ${r.noKa || '-'}: ${r.durasiMenit} menit${r.kendala ? ` (${r.kendala})` : ''}`
        );
      }
      if (r.kendala && !kendalaList.includes(r.kendala)) {
        kendalaList.push(r.kendala);
      }
    }

    const monthlyPlan = config.planTonPerBulan[monthKey];
    let planKa: number | null = null;
    if (monthlyPlan !== undefined && monthlyPlan !== null && monthlyPlan > 0) {
      const daysInMonth = new Date(year, cur.getMonth() + 1, 0).getDate();
      planKa = monthlyPlan / daysInMonth / config.planTonPerKa;
    }

    items.push({
      dateIso,
      dateLabel: `${day} ${monShort}`,
      fullDateLabel: `${String(day).padStart(2, '0')} ${INDO_FULL_MONTHS[cur.getMonth()]} ${year}`,
      monthKey,
      jumlahKa,
      planKa,
      totalTonase,
      avgDurasi,
      avgDurasiRaw,
      avgFd,
      kendalaList,
      hasOutlier,
      outlierDetails,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return items;
}

/**
 * Agregasi per bulan (Jan s.d. bulan referensi 2026) untuk tampilan grafik "Yearly 2026"
 * dengan nilai rata-rata KA/hari per bulan agar tetap terbaca.
 */
export function computeMonthlyKaSummaries(
  rows: HaulingRecord[],
  refDateInput: Date | string,
  config: HaulingConfig = HAULING_CONFIG,
  options?: { excludeOutlierDuration?: boolean }
): MonthlyKaSummary[] {
  const excludeOutlier = options?.excludeOutlierDuration ?? false;
  const focusYear = config.focusYear || FOCUS_YEAR;
  const refDate = clampDateToFocusYear(refDateInput, focusYear, config.defaultRefDateIso);
  const maxMonthIdx = refDate.getMonth();

  const rows2026 = rows.filter(
    (r) => r.dateObj.getFullYear() === focusYear && r.dateIso <= toIsoDateStr(refDate)
  );

  const summaries: MonthlyKaSummary[] = [];

  for (let mIdx = 0; mIdx <= maxMonthIdx; mIdx++) {
    const monthKey = `${focusYear}-${String(mIdx + 1).padStart(2, '0')}`;
    const daysInFullMonth = new Date(focusYear, mIdx + 1, 0).getDate();
    const calendarDays = mIdx === maxMonthIdx ? refDate.getDate() : daysInFullMonth;

    const mRows = rows2026.filter((r) => r.monthKey === monthKey);
    const jumlahKa = mRows.length;
    const kaPerHari = calendarDays > 0 ? jumlahKa / calendarDays : 0;
    const totalTonase = mRows.reduce((s, r) => s + r.incomingTon, 0);

    const validDur = mRows.filter(
      (r) =>
        r.durasiMenit !== null &&
        (!excludeOutlier || r.durasiMenit <= config.outlierDurationThresholdMinutes)
    );
    const avgDurasi =
      validDur.length > 0
        ? validDur.reduce((s, r) => s + (r.durasiMenit as number), 0) / validDur.length
        : null;

    const validFd = mRows.filter((r) => r.jumlahFd !== null);
    const avgFd =
      validFd.length > 0
        ? validFd.reduce((s, r) => s + (r.jumlahFd as number), 0) / validFd.length
        : null;

    const kendalaList: string[] = [];
    const outlierDetails: string[] = [];
    let hasOutlier = false;

    for (const r of mRows) {
      if (r.isOutlierDuration) {
        hasOutlier = true;
        outlierDetails.push(
          `${r.dateStr} (KA ${r.noKa || '-'}): ${r.durasiMenit} menit${r.kendala ? ` — ${r.kendala}` : ''}`
        );
      }
      if (r.kendala && !kendalaList.includes(r.kendala)) {
        kendalaList.push(r.kendala);
      }
    }

    const monthlyPlan = config.planTonPerBulan[monthKey];
    let planKaPerHari: number | null = null;
    if (monthlyPlan !== undefined && monthlyPlan !== null && monthlyPlan > 0) {
      planKaPerHari = monthlyPlan / daysInFullMonth / config.planTonPerKa;
    }

    summaries.push({
      monthKey,
      monthLabel: `${INDO_SHORT_MONTHS[mIdx]} 26`,
      fullMonthLabel: `${INDO_FULL_MONTHS[mIdx]} ${focusYear}`,
      calendarDays,
      jumlahKa,
      kaPerHari,
      planKaPerHari,
      totalTonase,
      avgDurasi,
      avgFd,
      kendalaList: kendalaList.slice(0, 5),
      hasOutlier,
      outlierDetails,
    });
  }

  return summaries;
}

/**
 * Formatter sesuai spesifikasi:
 * Locale id-ID: titik untuk ribuan, koma untuk desimal (589.177; 136,68).
 * Tonase tanpa desimal, durasi/FD/KA per hari 2 desimal, persen 1 desimal, jumlah KA bulat.
 * Jika data suatu periode kosong (null / undefined / NaN), tampilkan "–".
 */
export function formatHaulingTon(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  return Math.round(val).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  });
}

export function formatHaulingTonExact(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatHaulingDec2(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatHaulingSignedDec2(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  const formatted = Math.abs(val).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (val > 0.0001) return `+${formatted}`;
  if (val < -0.0001) return `-${formatted}`;
  return '0,00';
}

export function formatHaulingPct(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  return `${val.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatHaulingInt(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '–';
  return Math.round(val).toLocaleString('id-ID', {
    maximumFractionDigits: 0,
  });
}
