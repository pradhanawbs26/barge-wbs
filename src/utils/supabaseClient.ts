import { createClient } from '@supabase/supabase-js';
import { BaseRecord, Base2Record } from '../types';

// Ambil kredensial Supabase dari Environment Variables atau default dari user
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://frdodxeeonkccytsfqjq.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZG9keGVlb25rY2N5dHNmcWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDgwNzUsImV4cCI6MjEwODU4NDA3NX0.uwwwUd9E4jp9C6PB9SEez2W77XiokBCekoLlBKmrY90';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Membaca data BaseRecords (Volume) dari tabel Supabase `barges_base`
 */
export async function fetchBaseRecordsFromSupabase(): Promise<BaseRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('barges_base')
      .select('*')
      .order('loading_date', { ascending: true });

    if (error) {
      console.error('Supabase fetch error (barges_base):', error);
      return [];
    }

    return (data || []).map((row) => ({
      voyageNo: row.voyage_no || '',
      TB: row.tug_boat || '',
      BG: row.barge_name || '',
      DD: row.loading_date || '',
      'Ton/Rit': Number(row.ton_rit) || 0
    }));
  } catch (err) {
    console.error('Error in fetchBaseRecordsFromSupabase:', err);
    return [];
  }
}

/**
 * Membaca data Base2Records (Log Aktifitas & Delay) dari tabel Supabase `barge_activity_logs`
 */
export async function fetchBase2RecordsFromSupabase(): Promise<Base2Record[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('barge_activity_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase fetch error (barge_activity_logs):', error);
      return [];
    }

    return (data || []).map((row) => ({
      voyageNo: row.voyage_no || '',
      TB: row.tug_boat || '',
      BG: row.barge_name || '',
      DD: row.loading_date || '',
      actualDate: row.activity_date || '',
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      'Cast-in': row.cast_in || '',
      Loading: Number(row.loading_duration) || 0,
      'Cast off': row.cast_off || '',
      Breakdown: Number(row.breakdown_duration) || 0,
      'Heavy Rain': Number(row.heavy_rain_duration) || 0,
      Waiting: Number(row.waiting_duration) || 0
    }));
  } catch (err) {
    console.error('Error in fetchBase2RecordsFromSupabase:', err);
    return [];
  }
}

/**
 * Otomatis menyimpan/mengunggah data hasil impor Google Spreadsheet ke Supabase
 */
export async function uploadRecordsToSupabase(
  baseRecords: BaseRecord[],
  base2Records: Base2Record[]
): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Client Supabase belum siap.' };
  }

  try {
    // 1. Map data BASE
    const basePayload = baseRecords.map((r) => ({
      voyage_no: String(r.voyageNo || ''),
      tug_boat: String(r.TB || ''),
      barge_name: String(r.BG || ''),
      loading_date: r.DD && r.DD.length === 10 ? r.DD : new Date().toISOString().split('T')[0],
      ton_rit: Number(r['Ton/Rit']) || 0
    }));

    if (basePayload.length > 0) {
      const { error: err1 } = await supabase
        .from('barges_base')
        .upsert(basePayload, { onConflict: 'voyage_no' });

      if (err1) {
        console.warn('Supabase upsert warning (barges_base):', err1.message);
      }
    }

    // 2. Map data BASE2
    const base2Payload = base2Records.map((r2) => ({
      voyage_no: String(r2.voyageNo || ''),
      tug_boat: String(r2.TB || ''),
      barge_name: String(r2.BG || ''),
      loading_date: r2.DD && r2.DD.length === 10 ? r2.DD : new Date().toISOString().split('T')[0],
      activity_name: 'Cycle Loading / Activity Log',
      loading_duration: Number(r2.Loading) || 0,
      breakdown_duration: Number(r2.Breakdown) || 0,
      heavy_rain_duration: Number(r2['Heavy Rain']) || 0,
      waiting_duration: Number(r2.Waiting) || 0,
      cast_in: r2['Cast-in'] || '',
      cast_off: r2['Cast off'] || ''
    }));

    if (base2Payload.length > 0) {
      const { error: err2 } = await supabase
        .from('barge_activity_logs')
        .insert(base2Payload);

      if (err2) {
        console.warn('Supabase insert warning (barge_activity_logs):', err2.message);
      }
    }

    return {
      success: true,
      message: `Berhasil mengunggah ${baseRecords.length} baris volume & ${base2Records.length} log delay ke Supabase!`
    };
  } catch (err: any) {
    console.error('Error uploading to Supabase:', err);
    return {
      success: false,
      message: err.message || 'Gagal mengunggah data ke Supabase.'
    };
  }
}
