import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, Timestamp, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase.js';
import { formatSequence, monthRoman } from './letter-numbering-core.js';
export { formatSequence, monthRoman } from './letter-numbering-core.js';

const DEFAULT_FORMAT = '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (value) => encodeURIComponent(String(value || ''));
const asDate = (value) => {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Tanggal surat tidak valid.');
  return date;
};
const normalizeFormat = (format) => {
  const value = String(format || DEFAULT_FORMAT).trim();
  return value === '{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}' ? DEFAULT_FORMAT : value;
};
const render = (format, values) => normalizeFormat(format).replace(/\{(KODE|UNIT|TAHUN|BULAN|BULAN_ROMAWI|BIDANG)\}|\{URUT:(\d+)\}/g, (_, name, width) => {
  if (name) return String(values[name] ?? '');
  return `${String(values.URUT ?? '').padStart(Number(width), '0')}${values.URUT_SUFFIX || ''}`;
});
const jakartaParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(asDate(date)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
};
const sha256 = async (value) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const actorData = (actor = {}) => ({ uid: actor.uid || '', nama: actor.nama || actor.email || '', role: actor.profile?.role || '' });
const retry = async (operation, attempts = 6) => {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      const code = String(error?.code || '').toLowerCase();
      const retryable = ['aborted', 'failed-precondition', 'unavailable', 'deadline-exceeded'].some((item) => code.includes(item));
      if (!retryable || attempt === attempts - 1) throw error;
      await sleep(100 * (2 ** attempt) + Math.floor(Math.random() * 100));
    }
  }
  throw lastError;
};
const settingsTtl = { data: null, time: 0 };
const getSettings = async () => {
  if (settingsTtl.data && (Date.now() - settingsTtl.time < 10 * 60 * 1000)) {
    return settingsTtl.data;
  }
  const snap = await getDoc(doc(db, 'pengaturan', 'umum'));
  const data = snap.exists() ? snap.data() : {};
  const res = { scope: data.numberingScope === 'PER_KLASIFIKASI' ? 'PER_KLASIFIKASI' : 'GLOBAL_PER_TAHUN', reservationMinutes: Math.max(1, Number(data.reservationMinutes || 15)) };
  settingsTtl.data = res;
  settingsTtl.time = Date.now();
  return res;
};

const masterCache = new Map();
const getMaster = async (jenisId) => {
  if (masterCache.has(jenisId)) {
    const item = masterCache.get(jenisId);
    if (Date.now() - item.time < 10 * 60 * 1000) return item.data;
  }
  const snap = await getDoc(doc(db, 'masterNomor', jenisId));
  if (!snap.exists() || snap.data().aktif !== true) throw new Error('Jenis nomor surat tidak aktif.');
  const data = { id: snap.id, ...snap.data() };
  masterCache.set(jenisId, { data, time: Date.now() });
  return data;
};

const bidangCache = new Map();
const getBidang = async (kode) => {
  const normalized = String(kode || '').trim();
  if (bidangCache.has(normalized)) {
    const item = bidangCache.get(normalized);
    if (Date.now() - item.time < 10 * 60 * 1000) return item.data;
  }
  const snap = await getDocs(query(collection(db, 'masterBidang'), where('kode', '==', normalized), limit(1)));
  if (snap.empty || snap.docs[0].data().aktif !== true) throw new Error(`Bidang dengan kode ${normalized} belum terdaftar atau tidak aktif.`);
  const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
  bidangCache.set(normalized, { data, time: Date.now() });
  return data;
};
const readAuditHead = async (transaction) => {
  const head = await transaction.get(doc(db, 'letter_audit_heads', 'global'));
  return head.exists() ? String(head.data().last_hash || '') : '';
};
const writeAuditInTransaction = async (transaction, { letterId, action, actor, before, after, previousHash }) => {
  const payload = JSON.stringify({ letter_id: letterId, action, actor: actorData(actor), before_json: before || null, after_json: after || null });
  const hash = await sha256(`${previousHash || ''}${payload}`);
  const auditRef = doc(collection(db, 'letter_audit_log'));
  const now = Timestamp.now();
  transaction.set(auditRef, { id: auditRef.id, letter_id: letterId, action, actor: actorData(actor), timestamp: now, before_json: before || null, after_json: after || null, prev_hash: previousHash || '', hash });
  transaction.set(doc(db, 'letter_audit_heads', 'global'), { last_hash: hash, updated_at: now });
};
const buildNumber = ({ master, unit, seq, seqSuffix = null, date, scopeKey }) => {
  const parts = jakartaParts(date);
  return { seq: Number(seq), seq_suffix: seqSuffix == null ? null : String(seqSuffix), klasifikasi: String(master.kode), unit: String(unit), bulan: parts.month, bulan_romawi: monthRoman(parts.month), tahun: parts.year, scope_key: scopeKey, full_number: render(master.format, { KODE: master.kode, URUT: seq, URUT_SUFFIX: seqSuffix ? `.${seqSuffix}` : '', UNIT: unit, TAHUN: parts.year, BULAN: String(parts.month).padStart(2, '0'), BULAN_ROMAWI: monthRoman(parts.month), BIDANG: unit }) };
};
const expiry = (minutes) => Timestamp.fromDate(new Date(Date.now() + minutes * 60000));

export const reserveLetterNumber = async ({ jenisId, bidangKode, letterDate, actor, idempotencyKey, metadata = {}, replacesLetterId = null }) => retry(async () => {
  const [master, bidang, settings] = await Promise.all([getMaster(jenisId), getBidang(bidangKode), getSettings()]);
  const date = asDate(letterDate); const parts = jakartaParts(date); const scopeKey = settings.scope === 'PER_KLASIFIKASI' ? master.kode : 'GLOBAL';
  const idemId = key(idempotencyKey || `${actor.uid}_${jenisId}_${date.toISOString()}_${Math.random()}`); const idemRef = doc(db, 'letter_idempotency', idemId); const counterRef = doc(db, 'letter_counters', key(`${parts.year}_${scopeKey}`)); const letterRef = doc(collection(db, 'letter_numbers'));
  return runTransaction(db, async (transaction) => {
    const existingIdem = await transaction.get(idemRef);
    if (existingIdem.exists()) { const existing = await transaction.get(doc(db, 'letter_numbers', existingIdem.data().letter_id)); if (!existing.exists()) throw new Error('Kunci idempotensi menunjuk data nomor yang tidak ditemukan.'); return { id: existing.id, ...existing.data() }; }
    const counter = await transaction.get(counterRef); const auditHead = await readAuditHead(transaction); const seq = counter.exists() ? Number(counter.data().last_seq || 0) + 1 : 1; const number = buildNumber({ master, unit: bidang.kode, seq, date, scopeKey }); const indexRef = doc(db, 'letter_number_index', key(number.full_number)); const index = await transaction.get(indexRef); if (index.exists()) throw new Error('Nomor surat sudah terdaftar. Ulangi proses Generate Nomor.');
    const now = Timestamp.now(); const after = { id: letterRef.id, ...number, jenisId: master.id, status: 'RESERVED', letter_date: Timestamp.fromDate(date), perihal: metadata.perihal || '', tujuan: metadata.tujuan || '', created_by: actorData(actor), issued_at: null, voided_at: null, voided_by: null, void_reason: '', replaced_by_id: replacesLetterId || null, replacement_of_id: null, reservation_expires_at: expiry(settings.reservationMinutes), idempotency_key: idempotencyKey || idemId, row_version: 1, created_at: now };
    if (counter.exists()) transaction.update(counterRef, { last_seq: seq, updated_at: now }); else transaction.set(counterRef, { tahun: parts.year, scope: settings.scope, scope_key: scopeKey, last_seq: seq, updated_at: now });
    transaction.set(letterRef, after); transaction.set(indexRef, { letter_id: letterRef.id, full_number: number.full_number, created_at: now }); transaction.set(idemRef, { letter_id: letterRef.id, created_at: now });
    await writeAuditInTransaction(transaction, { letterId: letterRef.id, action: 'RESERVE', actor, before: null, after, previousHash: auditHead }); return after;
  });
});

export const issueLetterNumber = async ({ reservationId, payload, actor }) => retry(() => runTransaction(db, async (transaction) => {
  const letterRef = doc(db, 'letter_numbers', reservationId); const letterSnap = await transaction.get(letterRef); if (!letterSnap.exists()) throw new Error('Reservasi nomor tidak ditemukan.'); const before = letterSnap.data(); if (before.status === 'ISSUED') { const existingSurat = before.letter_id ? await transaction.get(doc(db, 'suratKeluar', before.letter_id)) : null; return existingSurat?.exists() ? { id: existingSurat.id, ...existingSurat.data(), letterNumberId: letterSnap.id } : { id: letterSnap.id, ...before }; } if (before.status !== 'RESERVED') throw new Error('Nomor tidak dapat diterbitkan dari status saat ini.'); if (before.reservation_expires_at?.toDate && before.reservation_expires_at.toDate().getTime() < Date.now()) throw new Error('Reservasi nomor sudah kedaluwarsa. Generate nomor baru.');
  const suratRef = doc(collection(db, 'suratKeluar')); const auditHead = await readAuditHead(transaction); const now = Timestamp.now(); const after = { ...before, status: 'ISSUED', letter_id: suratRef.id, perihal: payload.hal, tujuan: payload.tujuan, letter_date: payload.tglSurat, issued_at: now, row_version: Number(before.row_version || 1) + 1 };
  const surat = { noSurat: before.full_number, jenisId: payload.jenisId, tglSurat: payload.tglSurat, tujuan: payload.tujuan, hal: payload.hal, isiRingkas: payload.isiRingkas, sifat: payload.sifat, tandaTangan: payload.tandaTangan || 'BASAH', fileId: '', fileUrl: String(payload.fileUrl || '').trim(), bidangPembuat: before.unit, dibuatOleh: { uid: actor.uid, nama: actor.nama || '' }, status: 'Aktif', alasanBatal: '', aksesBidang: payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [], letterNumberId: letterRef.id, letterRowVersion: after.row_version, dibuatPada: now };
  transaction.set(suratRef, surat); transaction.update(letterRef, after); await writeAuditInTransaction(transaction, { letterId: letterRef.id, action: 'ISSUE', actor, before, after, previousHash: auditHead }); return { id: suratRef.id, ...surat, letterNumberId: letterRef.id };
}));

export const voidLetterNumber = async ({ letterNumberId, reason, actor, replacedById = null, suratId = null }) => {
  const cleanReason = String(reason || '').trim() || 'Surat dibatalkan';
  return retry(() => runTransaction(db, async (transaction) => {
    const letterRef = doc(db, 'letter_numbers', letterNumberId); const letterSnap = await transaction.get(letterRef); if (!letterSnap.exists()) throw new Error('Nomor surat tidak ditemukan.'); const before = letterSnap.data(); if (!['RESERVED', 'ISSUED'].includes(before.status)) throw new Error('Nomor sudah dibatalkan.'); const linkedSuratId = suratId || before.letter_id; const suratRef = linkedSuratId ? doc(db, 'suratKeluar', linkedSuratId) : null; const suratSnap = suratRef ? await transaction.get(suratRef) : null; const auditHead = await readAuditHead(transaction); const now = Timestamp.now(); const replacement = replacedById || before.replaced_by_id || null; const after = { ...before, status: 'VOID', voided_at: now, voided_by: actorData(actor), void_reason: cleanReason, replaced_by_id: replacement, row_version: Number(before.row_version || 1) + 1 };
    transaction.update(letterRef, { status: 'VOID', voided_at: now, voided_by: actorData(actor), void_reason: cleanReason, replaced_by_id: replacement, row_version: after.row_version }); if (suratRef && suratSnap?.exists()) transaction.update(suratRef, { status: 'Dibatalkan', alasanBatal: cleanReason, letterRowVersion: after.row_version }); await writeAuditInTransaction(transaction, { letterId: letterNumberId, action: 'VOID', actor, before, after, previousHash: auditHead }); return after;
  }));
};

export const reuseVoidedLetterNumber = async ({ letterNumberId, payload, actor }) => {
  if (actor.profile?.role !== 'admin') throw new Error('Penggunaan kembali nomor hanya dapat dilakukan oleh admin.');
  return retry(() => runTransaction(db, async (transaction) => {
    const letterRef = doc(db, 'letter_numbers', letterNumberId);
    const letterSnap = await transaction.get(letterRef);
    if (!letterSnap.exists()) throw new Error('Register nomor tidak ditemukan.');
    const before = letterSnap.data();
    if (before.status !== 'VOID') throw new Error('Hanya nomor VOID yang dapat digunakan kembali.');
    const date = asDate(payload.tglSurat);
    const oldDate = before.letter_date?.toDate ? before.letter_date.toDate() : null;
    const oldParts = oldDate ? jakartaParts(oldDate) : null;
    const newParts = jakartaParts(date);
    if (oldParts && (oldParts.year !== newParts.year || oldParts.month !== newParts.month || oldParts.day !== newParts.day)) throw new Error('Tanggal penerbitan harus sama persis dengan tanggal nomor yang dibatalkan.');
    const suratRef = before.letter_id ? doc(db, 'suratKeluar', before.letter_id) : doc(collection(db, 'suratKeluar'));
    const suratSnap = before.letter_id ? await transaction.get(suratRef) : null;
    if (before.letter_id && !suratSnap.exists()) throw new Error('Surat terkait nomor VOID tidak ditemukan.');
    if (suratSnap?.exists() && suratSnap.data().dikirimKeLuar === true) throw new Error('Nomor tidak dapat digunakan kembali karena surat sudah dikirim ke pihak luar.');
    const auditHead = await readAuditHead(transaction);
    const now = Timestamp.now();
    const nextVersion = Number(before.row_version || 1) + 1;
    const after = { ...before, status: 'ISSUED', letter_id: suratRef.id, letter_date: payload.tglSurat, perihal: payload.hal, tujuan: payload.tujuan, issued_at: now, reused_at: now, reused_by: actorData(actor), reuse_count: Number(before.reuse_count || 0) + 1, reuse_reason: 'Nomor VOID digunakan kembali oleh admin pada tanggal yang sama', row_version: nextVersion };
    const suratData = { ...(suratSnap?.exists() ? suratSnap.data() : {}), noSurat: before.full_number, jenisId: before.jenisId, tglSurat: payload.tglSurat, tujuan: payload.tujuan, hal: payload.hal, isiRingkas: payload.isiRingkas, sifat: payload.sifat, tandaTangan: payload.tandaTangan || 'BASAH', fileId: suratSnap?.data()?.fileId || '', fileUrl: suratSnap?.data()?.fileUrl || String(payload.fileUrl || '').trim(), bidangPembuat: before.unit, dibuatOleh: suratSnap?.data()?.dibuatOleh || { uid: actor.uid, nama: actor.nama || '' }, status: 'Aktif', alasanBatal: '', aksesBidang: payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [], dikirimKeLuar: false, letterNumberId, letterRowVersion: nextVersion, dibuatPada: suratSnap?.data()?.dibuatPada || now, diubahPada: now };
    transaction.update(letterRef, { status: 'ISSUED', letter_id: suratRef.id, letter_date: payload.tglSurat, perihal: payload.hal, tujuan: payload.tujuan, issued_at: now, reused_at: now, reused_by: actorData(actor), reuse_count: after.reuse_count, reuse_reason: after.reuse_reason, row_version: nextVersion });
    if (suratSnap?.exists()) transaction.update(suratRef, suratData); else transaction.set(suratRef, suratData);
    await writeAuditInTransaction(transaction, { letterId: letterNumberId, action: 'REUSE_VOID', actor, before, after, previousHash: auditHead });
    return { id: suratRef.id, ...suratData };
  }));
};

export const updateLetterMetadata = async ({ letterNumberId, changes, actor, expectedVersion, suratId = null }) => retry(() => runTransaction(db, async (transaction) => {
  const ref = doc(db, 'letter_numbers', letterNumberId); const snap = await transaction.get(ref); if (!snap.exists()) throw new Error('Register nomor tidak ditemukan.'); const before = snap.data(); if (Number(before.row_version || 1) !== Number(expectedVersion)) throw new Error('Data sudah berubah. Muat ulang sebelum menyimpan.'); const linkedSuratId = suratId || before.letter_id; const suratRef = linkedSuratId ? doc(db, 'suratKeluar', linkedSuratId) : null; const suratSnap = suratRef ? await transaction.get(suratRef) : null; const auditHead = await readAuditHead(transaction); const after = { ...before, perihal: changes.perihal ?? before.perihal, tujuan: changes.tujuan ?? before.tujuan, letter_date: changes.letter_date ?? before.letter_date, row_version: Number(before.row_version || 1) + 1 };
  transaction.update(ref, { perihal: after.perihal, tujuan: after.tujuan, letter_date: after.letter_date, row_version: after.row_version }); if (suratRef && suratSnap?.exists()) transaction.update(suratRef, { ...(changes.tujuan == null ? {} : { tujuan: changes.tujuan }), ...(changes.perihal == null ? {} : { hal: changes.perihal }), ...(changes.letter_date == null ? {} : { tglSurat: changes.letter_date }), letterRowVersion: after.row_version }); await writeAuditInTransaction(transaction, { letterId: letterNumberId, action: 'EDIT_METADATA', actor, before, after, previousHash: auditHead }); return after;
}));

export const expireReservedLetterNumbers = async (actor) => {
  const snap = await getDocs(query(collection(db, 'letter_numbers'), where('status', '==', 'RESERVED'), where('reservation_expires_at', '<=', Timestamp.now()), orderBy('reservation_expires_at'), limit(100))); const results = []; for (const item of snap.docs) results.push(await voidLetterNumber({ letterNumberId: item.id, reason: 'Reservasi kedaluwarsa otomatis', actor })); return results;
};

export const reserveInsertedLetterNumber = async ({ anchorLetterId, bidangKode, letterDate, actor, metadata = {}, idempotencyKey }) => retry(async () => {
  if (actor.profile?.role !== 'admin') throw new Error('Nomor sisipan hanya dapat dibuat oleh admin.'); const anchor = await getDoc(doc(db, 'letter_numbers', anchorLetterId)); if (!anchor.exists()) throw new Error('Nomor induk untuk sisipan tidak ditemukan.'); const anchorData = anchor.data(); const [master, bidang, settings] = await Promise.all([getMaster(anchorData.jenisId || ''), getBidang(bidangKode || anchorData.unit), getSettings()]); const date = asDate(letterDate); const parts = jakartaParts(date); const anchorDate = anchorData.letter_date?.toDate ? anchorData.letter_date.toDate() : null; if (parts.year !== Number(anchorData.tahun) || (anchorDate && anchorDate.getTime() > date.getTime())) throw new Error('Tanggal sisipan harus setelah atau sama dengan tanggal nomor induk dan masih pada tahun yang sama.'); const scopeKey = settings.scope === 'PER_KLASIFIKASI' ? master.kode : 'GLOBAL'; const idemId = key(idempotencyKey || `${actor.uid}_insert_${anchorLetterId}_${date.toISOString()}`); const idemRef = doc(db, 'letter_idempotency', idemId);
  return runTransaction(db, async (transaction) => {
    const existingIdem = await transaction.get(idemRef); if (existingIdem.exists()) { const existing = await transaction.get(doc(db, 'letter_numbers', existingIdem.data().letter_id)); return { id: existing.id, ...existing.data() }; } const [anchorSnap, auditHead] = await Promise.all([transaction.get(doc(db, 'letter_numbers', anchorLetterId)), readAuditHead(transaction)]); if (!anchorSnap.exists()) throw new Error('Nomor induk untuk sisipan tidak ditemukan.'); const existingRows = await getDocs(query(collection(db, 'letter_numbers'), where('tahun', '==', parts.year), where('scope_key', '==', scopeKey), where('seq', '==', Number(anchorData.seq)), orderBy('seq_suffix'))); const used = new Set(existingRows.docs.map((item) => String(item.data().seq_suffix || ''))); let suffix = 1; while (used.has(String(suffix))) suffix += 1; const number = buildNumber({ master, unit: bidang.kode, seq: Number(anchorData.seq), seqSuffix: suffix, date, scopeKey }); const letterRef = doc(collection(db, 'letter_numbers')); const indexRef = doc(db, 'letter_number_index', key(number.full_number)); const index = await transaction.get(indexRef); if (index.exists()) throw new Error('Nomor sisipan sudah terdaftar.'); const now = Timestamp.now(); const after = { id: letterRef.id, ...number, jenisId: master.id, status: 'RESERVED', letter_date: Timestamp.fromDate(date), perihal: metadata.perihal || '', tujuan: metadata.tujuan || '', created_by: actorData(actor), issued_at: null, voided_at: null, voided_by: null, void_reason: '', replaced_by_id: null, replacement_of_id: anchorLetterId, reservation_expires_at: expiry(settings.reservationMinutes), idempotency_key: idempotencyKey || idemId, row_version: 1, created_at: now }; transaction.set(letterRef, after); transaction.set(indexRef, { letter_id: letterRef.id, full_number: number.full_number, created_at: now }); transaction.set(idemRef, { letter_id: letterRef.id, created_at: now }); await writeAuditInTransaction(transaction, { letterId: letterRef.id, action: 'RESERVE_INSERT', actor, before: null, after, previousHash: auditHead }); return after;
  });
});

export const correctLetterNumber = async ({ oldLetterNumberId, newPayload, actor, reason }) => {
  if (actor.profile?.role !== 'admin') throw new Error('Koreksi nomor hanya dapat dilakukan oleh admin.'); const old = await getDoc(doc(db, 'letter_numbers', oldLetterNumberId)); if (!old.exists()) throw new Error('Nomor lama tidak ditemukan.'); const reservation = await reserveLetterNumber({ ...newPayload, actor, idempotencyKey: newPayload.idempotencyKey, replacesLetterId: oldLetterNumberId }); await voidLetterNumber({ letterNumberId: oldLetterNumberId, reason, actor, replacedById: reservation.id }); return issueLetterNumber({ reservationId: reservation.id, payload: newPayload, actor });
};

export const verifySequence = async (tahun, scopeKey = null) => {
  const constraints = [where('tahun', '==', Number(tahun))]; if (scopeKey) constraints.push(where('scope_key', '==', scopeKey)); const snap = await getDocs(query(collection(db, 'letter_numbers'), ...constraints)); const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => Number(a.seq) - Number(b.seq) || String(a.seq_suffix || '').localeCompare(String(b.seq_suffix || ''))); const groups = new Map(); const used = new Set(); const issues = [];
  for (const row of rows) { const identity = `${row.scope_key}:${row.seq}:${row.seq_suffix || ''}`; if (used.has(identity)) issues.push({ type: 'DUPLICATE_SEQUENCE', id: row.id, identity }); used.add(identity); const expected = render(DEFAULT_FORMAT, { KODE: row.klasifikasi, URUT: row.seq, URUT_SUFFIX: row.seq_suffix ? `.${row.seq_suffix}` : '', UNIT: row.unit, TAHUN: row.tahun }); if (row.full_number !== expected) issues.push({ type: 'NUMBER_MISMATCH', id: row.id, expected, actual: row.full_number }); const groupKey = `${row.tahun}:${row.scope_key}`; if (!groups.has(groupKey)) groups.set(groupKey, new Map()); groups.get(groupKey).set(Number(row.seq), row); }
  for (const [groupKey, group] of groups) { const max = Math.max(...group.keys()); for (let seq = 1; seq <= max; seq += 1) if (!group.has(seq)) issues.push({ type: 'GAP_WITHOUT_VOID', group: groupKey, seq }); }
  return { tahun: Number(tahun), total: rows.length, issues };
};

export const getLetterNumberByFullNumber = async (fullNumber) => {
  const snap = await getDocs(query(collection(db, 'letter_numbers'), where('full_number', '==', String(fullNumber || '').trim()), limit(1)));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};
