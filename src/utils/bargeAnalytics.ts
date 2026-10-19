import { BaseRecord, Base2Record, ProcessedBarge, DelayMetric } from '../types';

export const TARGET_BLC_RATE = 1350.0; // Ton / Jam

/**
 * Memproses dan memvalidasi dataset persis seperti logika Pandas dalam skrip Python:
 * a. Bersihkan spasi dan baris NaN
 * b. Standarisasi kolom kunci 'BG' menjadi uppercase
 * c. Left Join df_base2 dengan df_base berdasarkan ['BG', 'DD']
 * d. Ekstraksi Month_Year (contoh: "October 2026")
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
  // b. Menurut BG + DD
  const baseMapByBgDd = new Map<string, number>();
  // c. Menurut BG saja
  const baseMapByBg = new Map<string, number>();

  validBase.forEach((item) => {
    const ton = Number(item['Ton/Rit']) || 0;
    if (ton > 0) {
      if (item.voyageNo && item.voyageNo.trim()) {
        const vKey = item.voyageNo.trim().toUpperCase();
        baseMapByVoyage.set(vKey, ton);
        const intVal = parseInt(vKey, 10);
        if (!isNaN(intVal)) {
          baseMapByVoyage.set(String(intVal), ton);
        }
      }
      if (item.BG && item.BG.trim()) {
        const cleanBg = item.BG.trim().toUpperCase();
        if (item.DD && item.DD.trim()) {
          baseMapByBgDd.set(`${cleanBg}__${item.DD.trim()}`, ton);
        }
        baseMapByBg.set(cleanBg, ton);
      }
    }
  });

  // 2. Left Join base2 dengan base (Muatan Tongkang diambil dari Kolom H Sheet BASE via Kolom A)
  const mergedRaw = validBase2.map((item, index) => {
    const cleanBg = (item.BG || '').trim().toUpperCase();
    const cleanDd = (item.DD || '').trim();
    const cleanVoyage = (item.voyageNo || '').trim().toUpperCase();

    // Prioritas 1: Cocokkan via Column A (Nomor Urutan Tongkang / Voyage)
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

    const castInDate = new Date(item['Cast-in']);
    const castOffDate = new Date(item['Cast off']);

    // Hitung Month_Year (Januari 2026 s/d Desember 2026)
    const monthNamesId = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthYear = !isNaN(castInDate.getTime())
      ? `${monthNamesId[castInDate.getMonth()]} ${castInDate.getFullYear()}`
      : 'Oktober 2026';

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
