import { BaseRecord, Base2Record, ProcessedBarge, DelayMetric } from '../types';

/**
 * Parsing tanggal secara aman dan tahan terhadap berbagai format (ISO, Indonesian, YYYY-MM-DD, dll.)
 */
export function safeParseDate(val: string | Date | undefined | null, defaultYear = 2026): Date {
  if (!val) return new Date(defaultYear, 9, 1, 8, 0, 0);
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date(defaultYear, 9, 1, 8, 0, 0) : val;

  const s = String(val).trim();
  if (!s) return new Date(defaultYear, 9, 1, 8, 0, 0);

  // 1. Google Sheets GViz Date: "Date(YYYY,M,D)" (M adalah 0-indexed)
  const matchGviz = s.match(/Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})(?:,\s*(\d{1,2}),\s*(\d{1,2})(?:,\s*(\d{1,2}))?)?/i);
  if (matchGviz) {
    const year = parseInt(matchGviz[1], 10);
    const month = parseInt(matchGviz[2], 10);
    const day = parseInt(matchGviz[3], 10);
    const hh = matchGviz[4] ? parseInt(matchGviz[4], 10) : 8;
    const mm = matchGviz[5] ? parseInt(matchGviz[5], 10) : 0;
    const ss = matchGviz[6] ? parseInt(matchGviz[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss);
  }

  // 2. Format Indonesia: "1-Okt-26 08:15:00" atau "30-Sep-26"
  const matchInd = s.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3,})[\s\-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchInd) {
    const day = parseInt(matchInd[1], 10);
    const monthStr = matchInd[2].toLowerCase();
    let year = parseInt(matchInd[3], 10);
    if (year < 100) year += 2000;

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4,
      jun: 5, jul: 6, agu: 7, ags: 7, aug: 7,
      sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };
    const month = monthMap[monthStr.substring(0, 3)] ?? 9;
    const hh = matchInd[4] ? parseInt(matchInd[4], 10) : 8;
    const mm = matchInd[5] ? parseInt(matchInd[5], 10) : 0;
    const ss = matchInd[6] ? parseInt(matchInd[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss);
  }

  // 3. Format YYYY-MM-DD HH:mm:ss atau YYYY-MM-DD
  const matchYmd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchYmd) {
    const year = parseInt(matchYmd[1], 10);
    const month = parseInt(matchYmd[2], 10) - 1;
    const day = parseInt(matchYmd[3], 10);
    const hh = matchYmd[4] ? parseInt(matchYmd[4], 10) : 8;
    const mm = matchYmd[5] ? parseInt(matchYmd[5], 10) : 0;
    const ss = matchYmd[6] ? parseInt(matchYmd[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss);
  }

  // 4. Format DD/MM/YYYY
  const matchDmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchDmy) {
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) year += 2000;
    const month = parseInt(matchDmy[2], 10) - 1;
    const day = parseInt(matchDmy[1], 10);
    const hh = matchDmy[4] ? parseInt(matchDmy[4], 10) : 8;
    const mm = matchDmy[5] ? parseInt(matchDmy[5], 10) : 0;
    const ss = matchDmy[6] ? parseInt(matchDmy[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss);
  }

  // 5. Fallback standar JS Date
  const isoCandidate = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
  const d = new Date(isoCandidate);
  if (!isNaN(d.getTime())) {
    return d;
  }

  return new Date(defaultYear, 9, 1, 8, 0, 0);
}

/**
 * Format tampilan tanggal operasional Indonesia: e.g. "1-Okt-26" atau "30-Sep-26"
 */
export function formatDisplayDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).trim();
  if (!clean || clean === '-' || clean === '0') return '-';

  if (/^\d{1,2}-[a-zA-Z]{3}-\d{2,4}$/.test(clean)) {
    return clean;
  }
  const d = safeParseDate(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = months[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  return `${day}-${m}-${y}`;
}

/**
 * Format angka desimal agar seragam dan bebas bias:
 * - 'comma' (Standar Baku Indonesia): Desimal koma (,), ribuan titik (.) -> Contoh: 0,4 | 8,5 | 1.129,7 | 9.602,31
 * - 'dot' (Standar Sistem/Internasional): Desimal titik (.), ribuan koma (,) -> Contoh: 0.4 | 8.5 | 1,129.7 | 9,602.31
 */
export function formatDecimalNumber(
  val: number | undefined | null,
  decimals: number = 1,
  separator: 'comma' | 'dot' = 'comma'
): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const num = Number(val);
  if (separator === 'comma') {
    return num.toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } else {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
}

/**
 * Format jam operasional (misal "0,4 h" atau "8,5 h" vs "0.4 h")
 */
export function formatHours(
  hours: number | undefined | null,
  decimals: number = 1,
  separator: 'comma' | 'dot' = 'comma'
): string {
  if (hours === undefined || hours === null || isNaN(hours)) {
    return separator === 'comma' ? '0,0 h' : '0.0 h';
  }
  return `${formatDecimalNumber(hours, decimals, separator)} h`;
}

/**
 * Ekstraksi Month_Year acuan dari Kolom D (DD Pemuatan)
 */
export function getMonthYearFromDateString(dateStr: string | undefined): string {
  if (!dateStr || !dateStr.trim()) return '';
  const clean = String(dateStr).trim();
  if (clean === '-' || clean === '0') return '';

  // GViz Date format: Date(2026, 9, 1) -> 9 is October (0-indexed)
  const gvizMatch = clean.match(/Date\((\d{4}),\s*(\d{1,2})/i);
  if (gvizMatch) {
    const year = gvizMatch[1];
    const monthNum = parseInt(gvizMatch[2], 10); // 0-indexed in GViz
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[monthNum] || 'Oktober'} ${year}`;
  }

  // 1. Format Indonesia "1-Okt-26" atau "30-Sep-26"
  const indMatch = clean.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3,})[\s\-\/](\d{2,4})/);
  if (indMatch) {
    const monthStr = indMatch[2].toLowerCase();
    const monthNames: Record<string, string> = {
      jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April',
      mei: 'Mei', may: 'Mei', jun: 'Juni', jul: 'Juli',
      agu: 'Agustus', ags: 'Agustus', aug: 'Agustus',
      sep: 'September', okt: 'Oktober', oct: 'Oktober',
      nov: 'November', des: 'Desember', dec: 'Desember'
    };
    let year = indMatch[3];
    if (year.length === 2) year = `20${year}`;
    const mName = monthNames[monthStr.substring(0, 3)] || 'Oktober';
    return `${mName} ${year}`;
  }

  // 2. Format YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const monthNum = parseInt(ymdMatch[2], 10);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mName = months[monthNum - 1] || 'Oktober';
    return `${mName} ${year}`;
  }

  // 3. Format DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    const monthNum = parseInt(dmyMatch[2], 10);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mName = months[monthNum - 1] || 'Oktober';
    return `${mName} ${year}`;
  }

  const d = safeParseDate(clean);
  if (!isNaN(d.getTime())) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  return '';
}

export const TARGET_BLC_RATE = 1350.0; // Ton / Jam

/**
 * Memproses dan memvalidasi dataset persis seperti logika Pandas dalam skrip Python:
 * a. Bersihkan spasi dan baris NaN
 * b. Standarisasi kolom kunci 'BG' menjadi uppercase
 * c. Left Join df_base2 dengan df_base berdasarkan ['BG', 'DD']
 * d. Ekstraksi Month_Year (contoh: "Oktober 2026") mengutamakan Kolom D (DD)
 * e. Hitung Idle Time berurutan berdasarkan 'Cast off' menggunakan shift(1)
 * f. Hitung performa BLC: Waktu Target, Aktual Produktivitas, dan Status
 */
export function preprocessBargeData(
  baseRecords: BaseRecord[],
  base2Records: Base2Record[]
): ProcessedBarge[] {
  // 1. Data Cleaning:
  // Sheet BASE: baris valid memiliki nomor urutan tongkang (voyageNo) atau nama tongkang (BG)
  const validBase = baseRecords.filter(
    (b) => b && ((b.voyageNo && b.voyageNo.trim() !== '') || (b.BG && b.BG.trim() !== ''))
  );
  // Sheet BASE2: baris valid memiliki nama tongkang atau nomor urutan
  const validBase2 = base2Records.filter(
    (b2) => b2 && ((b2.BG && b2.BG.trim() !== '') || (b2.voyageNo && b2.voyageNo.trim() !== ''))
  );

  // Buat lookup maps dari sheet BASE:
  // a. Menurut nomor urutan tongkang / Voyage No (Column A pada BASE dan BASE2)
  const baseMapByVoyage = new Map<string, number>();
  const baseDateByVoyage = new Map<string, string>();
  // b. Menurut BG + DD
  const baseMapByBgDd = new Map<string, number>();
  // c. Menurut BG saja
  const baseMapByBg = new Map<string, number>();
  const baseDateByBg = new Map<string, string>();

  validBase.forEach((item) => {
    const ton = Number(item['Ton/Rit']) || 0;
    const d = item.DD ? item.DD.trim() : '';

    if (item.voyageNo && item.voyageNo.trim()) {
      const vKey = item.voyageNo.trim().toUpperCase();
      if (ton > 0) {
        baseMapByVoyage.set(vKey, ton);
      }
      if (d) {
        baseDateByVoyage.set(vKey, d);
      }
      const intVal = parseInt(vKey, 10);
      if (!isNaN(intVal)) {
        if (ton > 0) baseMapByVoyage.set(String(intVal), ton);
        if (d) baseDateByVoyage.set(String(intVal), d);
      }
    }
    if (item.BG && item.BG.trim()) {
      const cleanBg = item.BG.trim().toUpperCase();
      if (item.DD && item.DD.trim() && ton > 0) {
        baseMapByBgDd.set(`${cleanBg}__${item.DD.trim()}`, ton);
      }
      if (ton > 0) baseMapByBg.set(cleanBg, ton);
      if (d) baseDateByBg.set(cleanBg, d);
    }
  });

  // 2. Left Join base2 dengan base (Muatan Tongkang diambil dari Kolom H Sheet BASE via Kolom A)
  const mergedRaw = validBase2.map((item, index) => {
    const cleanBg = (item.BG || '').trim().toUpperCase();
    let cleanDd = (item.DD || '').trim();
    const cleanVoyage = (item.voyageNo || '').trim().toUpperCase();

    // Fallback Tanggal DD jika di sheet BASE2 kosong:
    // 1. Ambil dari sheet BASE berdasarkan nomor urutan Voyage (Kolom A)
    if (!cleanDd && cleanVoyage) {
      cleanDd = baseDateByVoyage.get(cleanVoyage) || baseDateByVoyage.get(String(parseInt(cleanVoyage, 10))) || '';
    }
    // 2. Ambil dari sheet BASE berdasarkan nama tongkang (BG)
    if (!cleanDd && cleanBg) {
      cleanDd = baseDateByBg.get(cleanBg) || '';
    }
    // 3. Ambil dari actualDate atau Cast-in
    if (!cleanDd && item.actualDate) {
      cleanDd = item.actualDate.trim();
    }
    if (!cleanDd && item['Cast-in']) {
      cleanDd = item['Cast-in'].split(' ')[0].trim();
    }

    // Prioritas 1: Cocokkan Muatan via Column A (Nomor Urutan Tongkang / Voyage)
    let tonRit = 0;
    if (cleanVoyage) {
      tonRit = baseMapByVoyage.get(cleanVoyage) || 0;
      if (!tonRit) {
        const intVoyage = parseInt(cleanVoyage, 10);
        if (!isNaN(intVoyage)) {
          tonRit = baseMapByVoyage.get(String(intVoyage)) || 0;
        }
      }
    }
    // Prioritas 2: Cocokkan via BG + DD
    if (!tonRit && cleanBg && cleanDd) {
      tonRit = baseMapByBgDd.get(`${cleanBg}__${cleanDd}`) || 0;
    }
    // Prioritas 3: Cocokkan via BG saja
    if (!tonRit && cleanBg) {
      tonRit = baseMapByBg.get(cleanBg) || 0;
    }
    // Fallback default
    if (!tonRit || tonRit <= 0) {
      tonRit = 8000;
    }

    const castInDate = safeParseDate(item['Cast-in']);
    const castOffDate = safeParseDate(item['Cast off']);

    // Hitung Month_Year mengutamakan Kolom D (DD pemuatan tongkang)
    let monthYear = '';
    if (cleanDd) {
      monthYear = getMonthYearFromDateString(cleanDd);
    }
    if (!monthYear && !isNaN(castInDate.getTime())) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      monthYear = `${months[castInDate.getMonth()]} ${castInDate.getFullYear()}`;
    }
    if (!monthYear) {
      monthYear = 'Semua Periode 2026';
    }

    const loading = Number(item.Loading) || 0;
    const breakdown = Number(item.Breakdown) || 0;
    const heavyRain = Number(item['Heavy Rain']) || 0;
    const waiting = Number(item.Waiting) || 0;
    const totalDelay = breakdown + heavyRain + waiting;
    const berthDuration = !isNaN(castInDate.getTime()) && !isNaN(castOffDate.getTime())
      ? (castOffDate.getTime() - castInDate.getTime()) / (1000 * 3600)
      : loading + totalDelay;

    // Performa BLC:
    // Waktu Target = Ton/Rit / 1350
    const waktuTarget = tonRit / TARGET_BLC_RATE;
    // Aktual Produktivitas = Ton/Rit / Loading
    const aktualProduktivitas = loading > 0 ? tonRit / loading : 0;
    // Status = Jika Waktu Aktual (Loading) <= Waktu Target maka "Sesuai Target", jika lebih maka "Over Time"
    const status: 'Sesuai Target' | 'Over Time' =
      loading <= waktuTarget ? 'Sesuai Target' : 'Over Time';

    return {
      id: `barge-${index}-${cleanBg}`,
      voyageNo: item.voyageNo,
      TB: item.TB || 'TB. TRANS POWER 01',
      BG: cleanBg,
      DD: cleanDd,
      TonRit: tonRit,
      CastIn: item['Cast-in'],
      CastInDate: castInDate,
      Loading: loading,
      CastOff: item['Cast off'],
      CastOffDate: castOffDate,
      Breakdown: breakdown,
      HeavyRain: heavyRain,
      Waiting: waiting,
      TotalDelay: totalDelay,
      BerthDuration: berthDuration,
      Month_Year: monthYear,
      WaktuTarget: waktuTarget,
      AktualProduktivitas: aktualProduktivitas,
      Status: status,
      IdleTime: 0, // dihitung setelah disortir
      activityDetails: item.activityDetails || [],
      rowCount: item.activityDetails ? item.activityDetails.length : 1
    };
  });

  // 3. Urutkan data berdasarkan 'Cast off' (seperti: df.sort_values(by='Cast off'))
  mergedRaw.sort((a, b) => a.CastOffDate.getTime() - b.CastOffDate.getTime());

  // 4. Hitung Idle Time menggunakan logika shift(1) pada kolom 'Cast off'
  // Idle Time = Cast-in tongkang ini - Cast off tongkang sebelumnya
  const processed: ProcessedBarge[] = mergedRaw.map((barge, idx, array) => {
    if (idx === 0) {
      return {
        ...barge,
        IdleTime: 0,
        PrevCastOff: undefined
      };
    }
    const prevBarge = array[idx - 1];
    const prevCastOff = prevBarge.CastOff;
    const diffHours =
      (barge.CastInDate.getTime() - prevBarge.CastOffDate.getTime()) / (1000 * 3600);
    // Jika jeda negatif (misal tumpang tindih jetty), jadikan 0
    const idleTime = Math.max(0, diffHours);

    return {
      ...barge,
      IdleTime: parseFloat(idleTime.toFixed(2)),
      PrevCastOff: prevCastOff
    };
  });

  return processed;
}

/**
 * Menghitung metrik Pareto Delay dinamis berdasarkan seluruh aktivitas & delay Kolom H..AA
 */
export function calculateDelayPareto(barges: ProcessedBarge[]): DelayMetric[] {
  // Kumpulkan seluruh log aktivitas non-loading
  const categoryMap = new Map<string, { totalJam: number; color: string }>();

  // Warna kategori standar operasional
  const defaultColorMap: Record<string, string> = {
    'Breakdown': '#ef4444',
    'Waiting Cargo': '#f59e0b',
    'Change Shift': '#8b5cf6',
    'Rest Time': '#6366f1',
    'Heavy Rain': '#3b82f6',
    'Surveyor Draft Survey': '#06b6d4',
    'Prepare Loading': '#10b981',
    'Moving Cargo': '#14b8a6',
    'Standby': '#94a3b8'
  };

  barges.forEach((b) => {
    if (b.activityDetails && b.activityDetails.length > 0) {
      b.activityDetails.forEach((act) => {
        // Hanya hitung delay / non-loading items
        if (act.category === 'Loading') return;

        const name = act.activityName.trim();
        const duration = act.durationHours;
        if (duration <= 0) return;

        if (!categoryMap.has(name)) {
          const color =
            defaultColorMap[name] ||
            (act.category === 'Breakdown'
              ? '#ef4444'
              : act.category === 'Heavy Rain'
              ? '#3b82f6'
              : act.category === 'Waiting'
              ? '#f59e0b'
              : act.category === 'Shift / Rest'
              ? '#8b5cf6'
              : act.category === 'Surveyor'
              ? '#06b6d4'
              : '#64748b');

          categoryMap.set(name, { totalJam: 0, color });
        }
        categoryMap.get(name)!.totalJam += duration;
      });
    } else {
      // Fallback jika tidak ada granular activity details
      if (b.Breakdown > 0) {
        const entry = categoryMap.get('Breakdown') || { totalJam: 0, color: '#ef4444' };
        entry.totalJam += b.Breakdown;
        categoryMap.set('Breakdown', entry);
      }
      if (b.HeavyRain > 0) {
        const entry = categoryMap.get('Heavy Rain') || { totalJam: 0, color: '#3b82f6' };
        entry.totalJam += b.HeavyRain;
        categoryMap.set('Heavy Rain', entry);
      }
      if (b.Waiting > 0) {
        const entry = categoryMap.get('Waiting Cargo') || { totalJam: 0, color: '#f59e0b' };
        entry.totalJam += b.Waiting;
        categoryMap.set('Waiting Cargo', entry);
      }
    }
  });

  // Jika belum ada data delay sama sekali
  if (categoryMap.size === 0) {
    return [
      { kategori: 'Breakdown BLC', totalJam: 0, kumulatifJam: 0, kumulatifPersen: 0, color: '#ef4444' },
      { kategori: 'Heavy Rain', totalJam: 0, kumulatifJam: 0, kumulatifPersen: 0, color: '#3b82f6' },
      { kategori: 'Waiting Cargo', totalJam: 0, kumulatifJam: 0, kumulatifPersen: 0, color: '#f59e0b' }
    ];
  }

  // Ubah ke array dan sort descending untuk Pareto
  const categories: { kategori: string; totalJam: number; color: string }[] = [];
  categoryMap.forEach((val, key) => {
    categories.push({
      kategori: key,
      totalJam: parseFloat(val.totalJam.toFixed(2)),
      color: val.color
    });
  });

  categories.sort((a, b) => b.totalJam - a.totalJam);

  const totalAll = categories.reduce((sum, item) => sum + item.totalJam, 0);

  let cumulative = 0;
  return categories.map((cat) => {
    cumulative += cat.totalJam;
    const pct = totalAll > 0 ? (cumulative / totalAll) * 100 : 0;
    return {
      kategori: cat.kategori,
      totalJam: parseFloat(cat.totalJam.toFixed(2)),
      kumulatifJam: parseFloat(cumulative.toFixed(2)),
      kumulatifPersen: parseFloat(pct.toFixed(1)),
      color: cat.color
    };
  });
}
