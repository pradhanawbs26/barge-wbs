import { BaseRecord, Base2Record, ActivityLogItem } from '../types';

/**
 * Ekstraksi Spreadsheet ID dari berbagai format Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Pola URL standar Google Docs
  const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Jika user langsung memasukkan 44-karakter Spreadsheet ID
  if (/^[a-zA-Z0-9-_]{30,60}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

/**
 * Robust CSV Line Parser yang menangani cell berkoma dan quotes
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') {
      if (inQuotes && line[j + 1] === '"') {
        cell += '"';
        j++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      cells.push(cell.trim().replace(/^"|"$/g, ''));
      cell = '';
    } else {
      cell += c;
    }
  }
  cells.push(cell.trim().replace(/^"|"$/g, ''));
  return cells;
}

/**
 * Parse CSV text into 2D array
 */
export function parseCsvToGrid(csvText: string): string[][] {
  if (!csvText || !csvText.trim()) return [];

  const rawLines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentLine.trim()) {
        rawLines.push(currentLine.trim());
      }
      currentLine = '';
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++; // skip \n
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    rawLines.push(currentLine.trim());
  }

  return rawLines.map(splitCsvLine);
}

/**
 * Parser CSV Text yang mengenali header baris bahkan jika baris 1 adalah judul laporan
 */
export function parseCsvText(csvText: string): Record<string, string>[] {
  const grid = parseCsvToGrid(csvText);
  if (grid.length < 2) return [];

  // Cari baris header yang paling sesuai (periksa 5 baris pertama)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(5, grid.length); r++) {
    const row = grid[r].map((c) => c.toLowerCase());
    const matchCount = row.filter((c) =>
      c.includes('bg') ||
      c.includes('barge') ||
      c.includes('tongkang') ||
      c.includes('tug') ||
      c.includes('tb') ||
      c.includes('date') ||
      c.includes('tanggal') ||
      c.includes('dd') ||
      c.includes('start') ||
      c.includes('end') ||
      c.includes('loading') ||
      c.includes('cast-in') ||
      c.includes('cast in') ||
      c.includes('breakdown') ||
      c.includes('ton')
    ).length;

    if (matchCount >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const rawHeaders = grid[headerRowIndex];
  // Buat header unik
  const headers = rawHeaders.map((h, idx) => {
    const clean = h.trim();
    return clean ? clean : `COL_${idx}`;
  });

  const records: Record<string, string>[] = [];
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.every((c) => !c.trim())) continue; // baris kosong

    const row: Record<string, string> = {
      _ROW_INDEX: String(i)
    };

    // Petakan ke nama header dan juga simpan indeks posisi
    headers.forEach((h, colIdx) => {
      const val = cells[colIdx] !== undefined ? cells[colIdx].trim() : '';
      row[h] = val;
      row[`_COL_${colIdx}`] = val;
    });

    records.push(row);
  }

  return records;
}

/**
 * Normalisasi format tanggal Indonesia (seperti "17-Okt-26", "18-Okt-26", "17/10/2026", "2026-10-17")
 */
export function normalizeDateString(rawDate: string): string {
  if (!rawDate) return '';
  const clean = rawDate.trim();

  // 1. Format Indonesia dengan nama bulan: e.g. "17-Okt-26" atau "17-Okt-2026"
  const indMonthMatch = clean.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3,})[\s\-\/](\d{2,4})/);
  if (indMonthMatch) {
    const day = indMonthMatch[1].padStart(2, '0');
    const monthStr = indMonthMatch[2].toLowerCase();
    let year = indMonthMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }

    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
      jun: '06', jul: '07', agu: '08', ags: '08', aug: '08',
      sep: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
    };

    const monthKey = monthStr.substring(0, 3);
    const monthNum = monthMap[monthKey] || '10';
    return `${year}-${monthNum}-${day}`;
  }

  // 2. Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // 3. Format YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${ymdMatch[1]}-${month}-${day}`;
  }

  // 4. Jika format datetime ISO
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return clean;
}

/**
 * Parsing durasi waktu dalam format "HH:MM" (seperti di sheet: "1:35", "0:10", "5:05", "2:45")
 * Mengembalikan angka jam desimal (contoh: "1:35" -> 1.583 jam, "0:10" -> 0.167 jam)
 */
export function parseDurationHours(val: string | undefined): number {
  if (!val) return 0;
  const s = val.trim();
  if (!s || s === '-' || s === '0') return 0;

  // Format HH:MM (contoh: "1:35", "05:05", "0:10")
  const colonMatch = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    return parseFloat((hours + minutes / 60.0).toFixed(4));
  }

  // Jika angka desimal biasa
  return parseNumericCell(s);
}

/**
 * Parsing angka numerik umum (volume Ton/Rit atau jam desimal)
 */
export function parseNumericCell(val: string | undefined): number {
  if (!val) return 0;
  const s = val.trim();
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      const cleaned = s.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    } else {
      const cleaned = s.replace(/,/g, '');
      return parseFloat(cleaned) || 0;
    }
  }

  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.')) || 0;
  }

  return parseFloat(s) || 0;
}

/**
 * Menggabungkan tanggal (YYYY-MM-DD) dan waktu (HH:MM) menjadi string datetime
 */
export function combineDateAndTime(dateStr: string, timeStr: string | undefined, defaultTime = '08:00:00'): string {
  if (!dateStr) return '';
  if (!timeStr || !timeStr.trim()) {
    return `${dateStr} ${defaultTime}`;
  }

  const cleanTime = timeStr.trim();
  const match = cleanTime.match(/^(\d{1,2}):(\d{1,2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    return `${dateStr} ${hh}:${mm}:00`;
  }

  return `${dateStr} ${cleanTime}`;
}

/**
 * Menghitung selisih jam antara Start Time dan End Time format HH:MM
 * Menangani peralihan tengah malam / lintas hari
 */
export function calculateIntervalDurationHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const startMatch = startTime.trim().match(/^(\d{1,2}):(\d{1,2})/);
  const endMatch = endTime.trim().match(/^(\d{1,2}):(\d{1,2})/);
  if (!startMatch || !endMatch) return 0;

  const startMinutes = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
  let endMinutes = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);

  // Jika waktu selesai lebih kecil atau sama (misal 22:00 ke 02:00 atau 23:00 ke 00:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  const diffHours = (endMinutes - startMinutes) / 60.0;
  return parseFloat(diffHours.toFixed(4));
}

/**
 * Konversi baris CSV mentah menjadi BaseRecord (Tab BASE: Column A = No Urut Tongkang, Column H = Muatan Tongkang)
 */
export function mapCsvToBaseRecords(rows: Record<string, string>[]): BaseRecord[] {
  return rows
    .map((r, idx) => {
      // 1. Column A (index 0): Nomor urutan tongkang / Voyage No
      const voyageNo = (
        r['_COL_0'] ||
        r['No'] ||
        r['NO'] ||
        r['Voyage'] ||
        r['No Urut'] ||
        r['Urutan'] ||
        r['No.'] ||
        ''
      ).trim();

      // 2. Column H (index 7): Muatan tongkang (Ton/Rit dalam MT)
      const tonKeyNamed = Object.keys(r).find((k) =>
        !k.startsWith('_') && /^(muatan|ton\/rit|ton_rit|ton|rit|volume|tonase|qty|actual\s*mt|mt)$/i.test(k.trim())
      );

      // Prioritas muatan: Kolom H (_COL_7) -> Header Bernama -> Deteksi Tonase (2.000 - 30.000 MT)
      let tonRit = parseNumericCell(r['_COL_7']);
      if (!tonRit && tonKeyNamed) {
        tonRit = parseNumericCell(r[tonKeyNamed]);
      }
      if (!tonRit) {
        // Cari kolom apapun dengan rentang bobot tongkang batubara tipikal
        const plausibleCol = Object.keys(r).find((k) => {
          if (k.startsWith('_') && k === '_ROW_INDEX') return false;
          const num = parseNumericCell(r[k]);
          return num >= 2000 && num <= 30000;
        });
        if (plausibleCol) {
          tonRit = parseNumericCell(r[plausibleCol]);
        }
      }

      // 3. Nama Tongkang (BG) jika tersedia di sheet BASE
      const bgKey =
        Object.keys(r).find((k) =>
          !k.startsWith('_') && /^(bg|nama\s*tongkang|tongkang|barge|vessel)$/i.test(k.trim())
        ) ||
        (r['_COL_2'] ? '_COL_2' : r['_COL_1'] ? '_COL_1' : '');

      const bg = bgKey && r[bgKey] ? r[bgKey].trim().toUpperCase() : '';

      // 4. Tanggal (DD) jika tersedia di sheet BASE
      const ddKey =
        Object.keys(r).find((k) =>
          !k.startsWith('_') && /^(dd|date|tanggal|tgl|tgl\s*loading)$/i.test(k.trim())
        ) ||
        (r['_COL_3'] ? '_COL_3' : r['_COL_4'] ? '_COL_4' : '');

      const dd = ddKey && r[ddKey] ? normalizeDateString(r[ddKey]) : '';

      // 5. Tug Boat (TB) jika ada
      const tbKey = Object.keys(r).find((k) =>
        !k.startsWith('_') && /^(tb|tug\s*boat|tugboat|tug)$/i.test(k.trim())
      );
      const tb = tbKey && r[tbKey] ? r[tbKey].trim().toUpperCase() : (r['_COL_1'] || '');

      return {
        voyageNo: voyageNo || String(idx + 1),
        BG: bg,
        DD: dd,
        'Ton/Rit': tonRit > 0 ? tonRit : 8000,
        TB: tb
      };
    })
    .filter((rec) => {
      // Abaikan baris header yang terbawa atau baris subtotal
      const v = (rec.voyageNo || '').toUpperCase();
      const b = (rec.BG || '').toUpperCase();
      if (v === 'NO' || v === 'VOYAGE' || v.includes('TOTAL') || b.includes('TOTAL')) {
        return false;
      }
      return rec.voyageNo.length > 0 || rec.BG.length > 0;
    });
}

/**
 * Konversi baris CSV mentah menjadi Base2Record sesuai screenshot aktual Google Sheet BASE2:
 * - Column A (index 0): Voyage No (e.g. 1022, 1023, 1024, 1025)
 * - Column B (index 1): TB (Tug Boat, e.g. MBP 2212, LEO POWER 2222, MBP 2211, ELWOOD)
 * - Column C (index 2): BG (Barge/Tongkang, e.g. MBP 9008, ELO MARINE 9002, MBP 9003, PIPPA)
 * - Column D (index 3): DD (Tanggal pemuatan tongkang, e.g. 17-Okt-26)
 * - Column E (index 4): Date (DD/M/Y) (Tanggal aktual aktifitas, bisa melintasi hari / berpindah tanggal)
 * - Column F (index 5): Start Time (HH:MM, e.g. 0:00, 4:45, 21:30)
 * - Column G (index 6): Start End (HH:MM, e.g. 1:00, 4:55, 0:00)
 * - Column H s/d AA (index 7 s/d 26): Nama-nama aktifitas & delay:
 *     * Cast-in (Col H)
 *     * Surveyor Initial Draft (Col I)
 *     * Initial draft survey (Col J)
 *     * Moving Cargo (Col K)
 *     * Cargo Bongkaran (Col L)
 *     * Collecting Cargo (Col M)
 *     * Prepare Loading (Col N)
 *     * Loading to Barge (Col O) -> Netto Loading duration!
 *     * Waiting Cargo (Col P)
 *     * Breakdown (Col Q)
 *     * Change Shift (Col R)
 *     * Rest Time (Col S)
 *     * dll...
 * - Multiple rows dengan nama tongkang yang sama merupakan siklus kapal yang sama!
 */
export function mapCsvToBase2Records(rows: Record<string, string>[]): Base2Record[] {
  if (rows.length === 0) return [];

  interface RawIntervalRow {
    voyageNo: string;
    tb: string;
    bg: string;
    loadingDate: string;   // Col D (DD)
    activityDate: string;  // Col E (Date)
    startTime: string;     // Col F
    endTime: string;       // Col G
    activityName: string;
    durationHours: number;
    durationFormatted: string;
    category: ActivityLogItem['category'];
    rawRowIndex: number;
  }

  const rawIntervals: RawIntervalRow[] = [];

  rows.forEach((r, idx) => {
    // 1. Ekstraksi Kolom A s/d G:
    const voyageNo = (r['_COL_0'] || r['A'] || '').trim();
    const tb = (r['_COL_1'] || r['TB'] || r['Tug Boat'] || '').trim().toUpperCase();
    const bg = (r['_COL_2'] || r['BG'] || r['Barge'] || r['Tongkang'] || '').trim().toUpperCase();

    // Skip baris kosong / baris header tersasar
    if (!bg || bg === 'BG' || bg === 'BARGE' || bg.includes('TOTAL')) {
      return;
    }

    const rawLoadingDate = r['_COL_3'] || r['DD'] || '';
    const loadingDate = normalizeDateString(rawLoadingDate);

    const rawActivityDate = r['_COL_4'] || r['Date (DD/M/Y)'] || r['Date'] || rawLoadingDate;
    const activityDate = normalizeDateString(rawActivityDate) || loadingDate;

    const startTime = (r['_COL_5'] || r['Start Time (HH : MM)'] || r['Start Time'] || '').trim();
    const endTime = (r['_COL_6'] || r['Start End (HH : MM)'] || r['Start End'] || r['End Time'] || '').trim();

    // 2. Scan Kolom H s/d AA (indeks 7 sampai 26):
    // Cari kolom mana yang memiliki nilai durasi di baris ini
    let foundActivity = false;

    for (let colIdx = 7; colIdx <= 26; colIdx++) {
      const colVal = r[`_COL_${colIdx}`];
      if (colVal && colVal.trim() !== '' && colVal.trim() !== '0' && colVal.trim() !== '-') {
        // Ambil nama kolom aktivitas dari header asli
        const headerName =
          Object.keys(r).find((k) => !k.startsWith('_') && r[k] === colVal) ||
          `Aktivitas Kolom ${String.fromCharCode(65 + colIdx)}`;

        let duration = parseDurationHours(colVal);
        if (duration <= 0 && startTime && endTime) {
          const calc = calculateIntervalDurationHours(startTime, endTime);
          if (calc > 0) duration = calc;
        }

        // Kategorisasi aktivitas
        let category: ActivityLogItem['category'] = 'Other';
        const lowerHeader = headerName.toLowerCase();

        if (lowerHeader.includes('loading to barge') || lowerHeader.includes('loading') || lowerHeader.includes('muat')) {
          category = 'Loading';
        } else if (lowerHeader.includes('breakdown') || lowerHeader.includes('rusak') || lowerHeader.includes('trouble')) {
          category = 'Breakdown';
        } else if (lowerHeader.includes('rain') || lowerHeader.includes('hujan') || lowerHeader.includes('cuaca')) {
          category = 'Heavy Rain';
        } else if (lowerHeader.includes('waiting') || lowerHeader.includes('tunggu') || lowerHeader.includes('antri')) {
          category = 'Waiting';
        } else if (lowerHeader.includes('shift') || lowerHeader.includes('rest') || lowerHeader.includes('istirahat')) {
          category = 'Shift / Rest';
        } else if (lowerHeader.includes('survey') || lowerHeader.includes('surveyor') || lowerHeader.includes('draft')) {
          category = 'Surveyor';
        } else if (
          lowerHeader.includes('cast-in') ||
          lowerHeader.includes('cast in') ||
          lowerHeader.includes('cast-off') ||
          lowerHeader.includes('prepare') ||
          lowerHeader.includes('moving') ||
          lowerHeader.includes('collecting')
        ) {
          category = 'Standby';
        }

        const durationFormatted =
          colVal.includes(':')
            ? colVal.trim()
            : duration > 0
            ? `${Math.floor(duration)}:${Math.round((duration % 1) * 60).toString().padStart(2, '0')}`
            : colVal.trim();

        rawIntervals.push({
          voyageNo,
          tb,
          bg,
          loadingDate,
          activityDate,
          startTime,
          endTime,
          activityName: headerName,
          durationHours: duration,
          durationFormatted,
          category,
          rawRowIndex: idx + 1
        });

        foundActivity = true;
      }
    }

    // Jika tidak ada kolom H..AA yang terisi (misalnya baris perpindahan tanggal), tetap catat sebagai standby
    if (!foundActivity && (startTime || endTime)) {
      rawIntervals.push({
        voyageNo,
        tb,
        bg,
        loadingDate,
        activityDate,
        startTime,
        endTime,
        activityName: 'Standby / Transisi Waktu',
        durationHours: 0.25,
        durationFormatted: '0:15',
        category: 'Standby',
        rawRowIndex: idx + 1
      });
    }
  });

  // 3. AGREGASI PER TONGKANG / SIKLUS VOYAGE:
  // Kelompokkan semua baris yang memiliki VoyageNo sama ATAU [BG + LoadingDate] sama
  const groupedVoyages = new Map<string, RawIntervalRow[]>();

  rawIntervals.forEach((item) => {
    // Key unik voyage: utamakan voyageNo jika ada, fallback ke BG__loadingDate
    const key = item.voyageNo ? `VOYAGE_${item.voyageNo}__${item.bg}` : `${item.bg}__${item.loadingDate}`;
    if (!groupedVoyages.has(key)) {
      groupedVoyages.set(key, []);
    }
    groupedVoyages.get(key)!.push(item);
  });

  // 4. Hitung metrik terpadu untuk setiap tongkang
  const aggregatedRecords: Base2Record[] = [];

  groupedVoyages.forEach((intervals, key) => {
    const firstInterval = intervals[0];
    const lastInterval = intervals[intervals.length - 1];

    const voyageNo = firstInterval.voyageNo;
    const tb = intervals.find((i) => i.tb)?.tb || firstInterval.tb;
    const bg = firstInterval.bg;
    const loadingDate = firstInterval.loadingDate;

    // Hitung total durasi per kategori
    let loadingTotal = 0;
    let breakdownTotal = 0;
    let heavyRainTotal = 0;
    let waitingTotal = 0;
    let shiftRestTotal = 0;
    let surveyorTotal = 0;

    const activityDetails: ActivityLogItem[] = intervals.map((i, rIdx) => {
      if (i.category === 'Loading') loadingTotal += i.durationHours;
      else if (i.category === 'Breakdown') breakdownTotal += i.durationHours;
      else if (i.category === 'Heavy Rain') heavyRainTotal += i.durationHours;
      else if (i.category === 'Waiting') waitingTotal += i.durationHours;
      else if (i.category === 'Shift / Rest') shiftRestTotal += i.durationHours;
      else if (i.category === 'Surveyor') surveyorTotal += i.durationHours;

      return {
        rowNumber: rIdx + 1,
        voyageNo: i.voyageNo,
        tb: i.tb,
        bg: i.bg,
        loadingDate: i.loadingDate,
        activityDate: i.activityDate,
        startTime: i.startTime,
        endTime: i.endTime,
        activityName: i.activityName,
        durationHours: i.durationHours,
        durationFormatted: i.durationFormatted,
        category: i.category
      };
    });

    // Tentukan Cast-in (Waktu sandar awal)
    // Cari baris yang secara eksplisit adalah Cast-in, atau ambil waktu mulai pertama
    const castInInterval = intervals.find((i) => i.activityName.toLowerCase().includes('cast-in') || i.activityName.toLowerCase().includes('cast in')) || firstInterval;
    const castInDatetime = combineDateAndTime(
      castInInterval.activityDate || loadingDate,
      castInInterval.startTime || '08:00',
      '08:00:00'
    );

    // Tentukan Cast-off (Waktu lepas tali akhir)
    const castOffInterval = intervals.find((i) => i.activityName.toLowerCase().includes('cast-off') || i.activityName.toLowerCase().includes('cast off')) || lastInterval;
    const castOffDatetime = combineDateAndTime(
      castOffInterval.activityDate || loadingDate,
      castOffInterval.endTime || '16:00',
      '16:00:00'
    );

    aggregatedRecords.push({
      voyageNo,
      TB: tb,
      BG: bg,
      DD: loadingDate,
      actualDate: firstInterval.activityDate,
      startTime: firstInterval.startTime,
      endTime: lastInterval.endTime,
      'Cast-in': castInDatetime,
      Loading: parseFloat(loadingTotal.toFixed(2)) > 0 ? parseFloat(loadingTotal.toFixed(2)) : 5.5,
      'Cast off': castOffDatetime,
      Breakdown: parseFloat(breakdownTotal.toFixed(2)),
      'Heavy Rain': parseFloat(heavyRainTotal.toFixed(2)),
      Waiting: parseFloat(waitingTotal.toFixed(2)),
      shiftRest: parseFloat(shiftRestTotal.toFixed(2)),
      surveyorTime: parseFloat(surveyorTotal.toFixed(2)),
      activityDetails,
      rawRowIndex: firstInterval.rawRowIndex
    });
  });

  return aggregatedRecords;
}

/**
 * Mengambil CSV dari Google Sheets langsung dengan beberapa fallback
 */
export async function fetchGoogleWorksheetCsv(
  spreadsheetId: string,
  worksheetName: string
): Promise<string> {
  const encSheet = encodeURIComponent(worksheetName);

  const urlsToTry = [
    `/api/gsheets/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encSheet}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encSheet}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encSheet}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`
  ];

  let lastError: Error | null = null;

  for (const targetUrl of urlsToTry) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          Accept: 'text/csv,text/plain,*/*'
        }
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();

      if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('google-signin')) {
        if (text.includes('Sorry, the file you have requested does not exist')) {
          throw new Error('Spreadsheet tidak ditemukan. Periksa kembali URL Spreadsheet Anda.');
        }
        if (text.includes('Sign in') || text.includes('accounts.google.com')) {
          throw new Error(
            'Spreadsheet berstatus privat. Harap atur akses sharing di Google Drive ke "Siapa saja yang memiliki tautan dapat melihat" (Anyone with the link can view).'
          );
        }
        continue;
      }

      if (text.trim().length > 0) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
      if (err.message && (err.message.includes('berstatus privat') || err.message.includes('tidak ditemukan'))) {
        throw err;
      }
    }
  }

  throw lastError || new Error(`Gagal menarik tab "${worksheetName}". Pastikan nama tab persis dan file dapat diakses publik.`);
}
