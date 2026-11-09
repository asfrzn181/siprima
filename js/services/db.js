import { collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, orderBy, where, limit, startAfter, runTransaction, Timestamp, writeBatch, getCountFromServer } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase.js';
import { renderNomorFormat } from './nomor.js';
import { correctLetterNumber, expireReservedLetterNumbers, getLetterNumberByFullNumber, issueLetterNumber, reserveLetterNumber, reuseVoidedLetterNumber, updateLetterMetadata, voidLetterNumber } from './letter-numbering.js';
export { correctLetterNumber, expireReservedLetterNumbers, getLetterNumberByFullNumber, reserveLetterNumber, reuseVoidedLetterNumber, voidLetterNumber } from './letter-numbering.js';
export { db };

const userProfileCache = new Map();
export const getUserProfile = async (uid, forceRefresh = false) => {
  if (!uid) return null;
  const cacheKey = `profile_${uid}`;
  if (!forceRefresh) {
    if (userProfileCache.has(uid)) {
      const cached = userProfileCache.get(uid);
      if (Date.now() - cached.time < 5 * 60 * 1000) return cached.data;
    }
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.time < 5 * 60 * 1000) {
          userProfileCache.set(uid, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  if (data) {
    const entry = { data, time: Date.now() };
    userProfileCache.set(uid, entry);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(entry)); } catch {}
  }
  return data;
};
export const listUsers = async () => {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('nama')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};
const pageFromQuery = async (collectionName, orderField, direction = 'asc', cursor = null, pageSize = 20, constraints = []) => {
  const queryParts = [...constraints, orderBy(orderField, direction)];
  if (cursor) queryParts.push(startAfter(cursor));
  queryParts.push(limit(pageSize + 1));
  const snap = await getDocs(query(collection(db, collectionName), ...queryParts));
  const docs = snap.docs.slice(0, pageSize);
  return { items: docs.map((item) => ({ id: item.id, ...item.data() })), nextCursor: snap.docs.length > pageSize ? docs.at(-1) : null };
};
export const listUsersPage = (cursor = null, pageSize = 20) => pageFromQuery('users', 'nama', 'asc', cursor, pageSize);
export const listMasterBidangPage = (cursor = null, pageSize = 20) => pageFromQuery('masterBidang', 'nama', 'asc', cursor, pageSize);
export const listMasterNomorPage = (cursor = null, pageSize = 20) => pageFromQuery('masterNomor', 'nama', 'asc', cursor, pageSize);
export const listAuditLogPage = (cursor = null, pageSize = 20) => pageFromQuery('auditLog', 'waktu', 'desc', cursor, pageSize);
export const createUserProfile = async (uid, profile) => setDoc(doc(db, 'users', uid), { ...profile, uid, aktif: true });
export const updateUserProfile = async (uid, changes) => {
  const ref = doc(db, 'users', uid);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Profil pengguna tidak ditemukan.');
  const previous = current.data();
  const data = { uid, email: String(previous.email || '').trim(), nama: String(changes.nama ?? previous.nama ?? '').trim(), role: changes.role ?? previous.role, bidang: String(changes.bidang ?? previous.bidang ?? '').trim(), aktif: changes.aktif ?? previous.aktif === true };
  await setDoc(ref, data);
  userProfileCache.delete(uid);
  try { sessionStorage.removeItem(`profile_${uid}`); } catch {}
  return data;
};
export const listMasterBidang = async () => {
  const snap = await getDocs(query(collection(db, 'masterBidang'), where('aktif', '==', true), orderBy('nama')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

let settingsCache = null;
export const getAppSettings = async (forceRefresh = false) => {
  if (!forceRefresh) {
    if (settingsCache && (Date.now() - settingsCache.time < 10 * 60 * 1000)) {
      return settingsCache.data;
    }
    try {
      const stored = sessionStorage.getItem('app_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.time < 10 * 60 * 1000) {
          settingsCache = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  const snap = await getDoc(doc(db, 'pengaturan', 'umum'));
  const data = snap.exists() ? snap.data() : {};
  const entry = { data, time: Date.now() };
  settingsCache = entry;
  try { sessionStorage.setItem('app_settings', JSON.stringify(entry)); } catch {}
  return data;
};

const modeForSession = (session, sifat) => {
  if (session.profile.role !== 'bidang') return sifat === 'semua' ? ['semua'] : [sifat];
  if (sifat === 'biasa' || sifat === 'rahasia') return [sifat];
  return ['biasa', 'rahasia'];
};
const toMillis = (value) => value?.toMillis ? value.toMillis() : 0;
const docToSurat = (item) => ({ id: item.id, ...item.data() });

export const listSuratMasuk = async (session, filters = {}, cursors = [], options = {}) => {
  const exportAll = options.exportAll === true;
  const search = String(filters.search || '').trim();
  const hasDateFilter = Boolean(filters.tglMulai || filters.tglSelesai);
  const modes = modeForSession(session, filters.sifat || 'semua');
  const searchFields = ['noSurat', 'hal', 'asal'];
  if (search) {
    const hits = await Promise.all(searchFields.flatMap((field) => modes.map(async (mode) => {
      const constraints = [where(field, '>=', search), where(field, '<=', `${search}\uf8ff`)];
      if (filters.status && filters.status !== 'semua') constraints.push(where('status', '==', filters.status));
      if (mode === 'biasa') constraints.push(where('sifat', '==', 'biasa'));
      if (mode === 'rahasia') {
        constraints.push(where('sifat', '==', 'rahasia'));
        if (session.profile.role === 'bidang') constraints.push(where('aksesBidang', 'array-contains', session.profile.bidang));
      }
      const snap = await getDocs(query(collection(db, 'suratMasuk'), ...constraints, orderBy(field), ...(exportAll ? [] : [limit(20)])));
      return snap.docs;
    })));
    const unique = new Map();
    hits.flat().forEach((item) => unique.set(item.id, item));
    const items = [...unique.values()].map(docToSurat).sort((a, b) => toMillis(b.dibuatPada) - toMillis(a.dibuatPada));
    return { items: exportAll ? items : items.slice(0, 20), nextCursors: [], hasNext: false, searchMode: true };
  }
  const results = await Promise.all(modes.map(async (mode, index) => {
    const constraints = [];
    if (filters.status && filters.status !== 'semua') constraints.push(where('status', '==', filters.status));
    if (filters.tglMulai) constraints.push(where('tglTerima', '>=', Timestamp.fromDate(filters.tglMulai)));
    if (filters.tglSelesai) constraints.push(where('tglTerima', '<=', Timestamp.fromDate(filters.tglSelesai)));
    if (mode === 'biasa') constraints.push(where('sifat', '==', 'biasa'));
    if (mode === 'rahasia') {
      constraints.push(where('sifat', '==', 'rahasia'));
      if (session.profile.role === 'bidang') constraints.push(where('aksesBidang', 'array-contains', session.profile.bidang));
    }
    constraints.push(orderBy(hasDateFilter ? 'tglTerima' : 'dibuatPada', 'desc'));
    if (!exportAll && cursors[index]) constraints.push(startAfter(cursors[index]));
    if (!exportAll) constraints.push(limit(20));
    const snap = await getDocs(query(collection(db, 'suratMasuk'), ...constraints));
    return { docs: snap.docs, hasMore: !exportAll && snap.docs.length === 20 };
  }));
  const unique = new Map();
  results.flatMap((result) => result.docs).forEach((item) => unique.set(item.id, item));
  const sortField = hasDateFilter ? 'tglTerima' : 'dibuatPada';
  const items = [...unique.values()].map(docToSurat).sort((a, b) => toMillis(b[sortField]) - toMillis(a[sortField]));
  const visibleItems = exportAll ? items : items.slice(0, 20);
  return { items: visibleItems, nextCursors: results.map((result) => result.docs.at(-1) || null), hasNext: results.some((result) => result.hasMore), searchMode: false };
};

export const listSuratMasukForExport = (session, filters = {}) => listSuratMasuk(session, filters, [], { exportAll: true });

export const createSuratMasuk = async (payload, uid) => {
  const year = payload.tglTerima.toDate().getFullYear();
  const counterRef = doc(db, 'counters', `agendaMasuk_${year}`);
  const suratRef = doc(collection(db, 'suratMasuk'));
  return runTransaction(db, async (transaction) => {
    const counter = await transaction.get(counterRef);
    const next = counter.exists() ? Number(counter.data().last || 0) + 1 : 1;
    const data = { ...payload, noAgenda: `${year}/${String(next).padStart(3, '0')}`, status: 'Baru', dibuatOleh: { uid, nama: payload.dibuatOleh.nama }, dibuatPada: Timestamp.now() };
    if (counter.exists()) transaction.update(counterRef, { last: next }); else transaction.set(counterRef, { last: next });
    transaction.set(suratRef, data);
    return { id: suratRef.id, ...data };
  });
};
export const updateSuratMasuk = async (id, changes) => updateDoc(doc(db, 'suratMasuk', id), changes);

export const writeAudit = async ({ uid, nama, aksi, koleksi, docId, sebelum = null, sesudah = null }) => addDoc(collection(db, 'auditLog'), { uid, nama, aksi, koleksi, docId, sebelum, sesudah, waktu: Timestamp.now() });

export const saveDisposisi = async ({ id, kepada, diputuskanOleh, catatan, actor }) => {
  const ref = doc(db, 'suratMasuk', id); const before = await getDoc(ref); if (!before.exists()) throw new Error('Surat tidak ditemukan.');
  const current = before.data(); const tindakLanjut = { ...(current.tindakLanjut || {}) };
  kepada.forEach((kode) => { if (!tindakLanjut[kode]) tindakLanjut[kode] = { status: 'Belum', tanggal: null, catatan: '' }; });
  const changes = { aksesBidang: kepada, disposisi: { kepada, diputuskanOleh, dicatatOleh: { uid: actor.uid, nama: actor.nama || '' }, tanggal: Timestamp.now(), catatan: catatan || '' }, tindakLanjut, status: 'Didisposisikan', diubahPada: Timestamp.now() };
  await updateDoc(ref, changes); await writeAudit({ uid: actor.uid, nama: actor.nama || '', aksi: 'ubah disposisi', koleksi: 'suratMasuk', docId: id, sebelum: current, sesudah: { ...current, ...changes } });
};

export const saveTindakLanjut = async ({ id, bidangKode, catatan, actor }) => {
  const ref = doc(db, 'suratMasuk', id); const before = await getDoc(ref); if (!before.exists()) throw new Error('Surat tidak ditemukan.');
  const current = before.data(); const allowed = current.aksesBidang || []; if (!allowed.includes(bidangKode)) throw new Error('Surat ini tidak ditujukan ke bidang Anda.');
  const tindakLanjut = { ...(current.tindakLanjut || {}), [bidangKode]: { status: 'Sudah', tanggal: Timestamp.now(), catatan: String(catatan || '').trim() } };
  const selesai = allowed.length > 0 && allowed.every((kode) => tindakLanjut[kode]?.status === 'Sudah');
  const changes = { tindakLanjut, status: selesai ? 'Selesai' : 'Didisposisikan', diubahPada: Timestamp.now() };
  await updateDoc(ref, changes); await writeAudit({ uid: actor.uid, nama: actor.nama || '', aksi: 'tindak lanjut', koleksi: 'suratMasuk', docId: id, sebelum: current, sesudah: { ...current, ...changes } });
};

export const listInbox = async (session) => {
  if (session.profile.role !== 'bidang') return [];
  const snap = await getDocs(query(collection(db, 'suratMasuk'), where('aksesBidang', 'array-contains', session.profile.bidang), orderBy('dibuatPada', 'desc'), limit(100)));
  return snap.docs.map(docToSurat);
};
export const listInboxPage = async (session, cursor = null, pageSize = 20) => {
  if (session.profile.role !== 'bidang') return { items: [], nextCursor: null };
  return pageFromQuery('suratMasuk', 'dibuatPada', 'desc', cursor, pageSize, [where('aksesBidang', 'array-contains', session.profile.bidang)]);
};

let masterBidangCache = null;
export const listAllMasterBidang = async (forceRefresh = false) => {
  if (!forceRefresh) {
    if (masterBidangCache && (Date.now() - masterBidangCache.time < 10 * 60 * 1000)) {
      return masterBidangCache.data;
    }
    try {
      const stored = sessionStorage.getItem('master_bidang_all');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.time < 10 * 60 * 1000) {
          masterBidangCache = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  const snap = await getDocs(query(collection(db, 'masterBidang'), orderBy('nama')));
  const data = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  const entry = { data, time: Date.now() };
  masterBidangCache = entry;
  try { sessionStorage.setItem('master_bidang_all', JSON.stringify(entry)); } catch {}
  return data;
};
const masterBidangCodeCache = new Map();
export const getMasterBidangByKode = async (kode) => { const normalized = String(kode || '').trim(); if (!normalized) return null; if (masterBidangCodeCache.has(normalized)) return masterBidangCodeCache.get(normalized); const snap = await getDocs(query(collection(db, 'masterBidang'), where('kode', '==', normalized), limit(1))); const item = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }; if (item) masterBidangCodeCache.set(normalized, item); return item; };
export const listMasterNomor = async () => { const snap = await getDocs(query(collection(db, 'masterNomor'), orderBy('nama'))); return snap.docs.map((item) => ({ id: item.id, ...item.data() })); };
const masterNomorSearchCache = new Map();
const masterNomorByIdCache = new Map();
const normalizeMasterNomor = (item) => ({ id: item.id, ...item, kode: String(item.kode || '').trim(), nama: String(item.nama || '').trim(), aktif: item.aktif !== false });
const normalizeNomorFormat = (format) => String(format || '').trim() === '{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}' ? '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}' : String(format || '').trim();
export const getMasterNomor = async (id) => { if (!id) return null; if (masterNomorByIdCache.has(id)) return masterNomorByIdCache.get(id); const snap = await getDoc(doc(db, 'masterNomor', id)); if (!snap.exists()) return null; const item = normalizeMasterNomor({ id: snap.id, ...snap.data() }); masterNomorByIdCache.set(id, item); return item; };
export const searchMasterNomorByCode = async (keyword, maxResults = 5) => { const normalized = String(keyword || '').trim(); if (normalized.length < 3) return []; const cacheKey = `${normalized.toLowerCase()}::${maxResults}`; if (masterNomorSearchCache.has(cacheKey)) return masterNomorSearchCache.get(cacheKey); const nameKeys = [...new Set([normalized, normalized.toUpperCase(), `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`])]; const [codeSnap, ...nameSnaps] = await Promise.all([getDocs(query(collection(db, 'masterNomor'), where('kode', '>=', normalized), where('kode', '<=', `${normalized}\uf8ff`), orderBy('kode'), limit(maxResults))), ...nameKeys.map((nameKey) => getDocs(query(collection(db, 'masterNomor'), where('nama', '>=', nameKey), where('nama', '<=', `${nameKey}\uf8ff`), orderBy('nama'), limit(maxResults))))]); const docs = [codeSnap, ...nameSnaps].flatMap((snap) => snap.docs); const unique = new Map(docs.map((item) => [item.id, normalizeMasterNomor({ id: item.id, ...item.data() })])); const items = [...unique.values()].filter((item) => item.aktif && item.kode && item.nama).sort((a, b) => `${a.kode} ${a.nama}`.localeCompare(`${b.kode} ${b.nama}`, 'id', { numeric: true })).slice(0, maxResults); items.forEach((item) => masterNomorByIdCache.set(item.id, item)); masterNomorSearchCache.set(cacheKey, items); return items; };
export const previewNomorSurat = async ({ jenisId, bidangKode, tanggal }) => { const master = await getMasterNomor(jenisId); if (!master || !master.aktif) throw new Error('Pilih jenis nomor surat yang aktif.'); const bidangData = await getMasterBidangByKode(bidangKode); if (!bidangData || bidangData.aktif !== true) throw new Error(`Bidang dengan kode ${bidangKode} belum terdaftar atau tidak aktif.`); const date = tanggal instanceof Date ? tanggal : new Date(tanggal); const year = date.getFullYear(); const counterId = `${jenisId}_${year}${master.urutanPerBidang === true ? `_${bidangKode}` : ''}`; const counterSnap = await getDoc(doc(db, 'counters', counterId)); const next = counterSnap.exists() ? Number(counterSnap.data().last || 0) + 1 : 1; return { noSurat: renderNomorFormat(normalizeNomorFormat(master.format), { KODE: master.kode, UNIT: bidangKode, TAHUN: year, BULAN: String(date.getMonth() + 1).padStart(2, '0'), BULAN_ROMAWI: ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][date.getMonth()], BIDANG: bidangKode, URUT: next }), next, year, unit: bidangKode, unitNama: bidangData.nama }; };
export const saveMasterBidang = async (id, data) => { masterBidangCache = null; try { sessionStorage.removeItem('master_bidang_all'); } catch {} return setDoc(doc(db, 'masterBidang', id), data, { merge: true }); };
export const saveMasterNomor = async (id, data) => { masterNomorByIdCache.delete(id); masterNomorSearchCache.clear(); return setDoc(doc(db, 'masterNomor', id), data); };
export const saveMasterNomorBatch = async (rows, onProgress = () => {}) => { masterNomorByIdCache.clear(); masterNomorSearchCache.clear(); const chunkSize = 400; let processed = 0; for (let start = 0; start < rows.length; start += chunkSize) { const batch = writeBatch(db); rows.slice(start, start + chunkSize).forEach(({ id, data }) => batch.set(doc(db, 'masterNomor', id), data)); await batch.commit(); processed += Math.min(chunkSize, rows.length - start); onProgress(processed, rows.length); } return processed; };
export const saveAppSettings = async (data) => { settingsCache = null; try { sessionStorage.removeItem('app_settings'); } catch {} return setDoc(doc(db, 'pengaturan', 'umum'), data, { merge: true }); };

const listVisibleModes = (session, sifat = 'semua') => modeForSession(session, sifat);
export const listSuratKeluar = async (session, filters = {}, cursors = [], options = {}) => {
  const exportAll = options.exportAll === true;
  const modes = listVisibleModes(session, filters.sifat || 'semua'); const search = String(filters.search || '').trim(); const results = await Promise.all(modes.map(async (mode, index) => {
    const constraints = [];
    if (filters.status && filters.status !== 'semua') constraints.push(where('status', '==', filters.status));
    if (mode === 'biasa') constraints.push(where('sifat', '==', 'biasa'));
    if (mode === 'rahasia') { constraints.push(where('sifat', '==', 'rahasia')); if (session.profile.role === 'bidang') constraints.push(where('aksesBidang', 'array-contains', session.profile.bidang)); }
    if (search) { constraints.push(where('noSurat', '>=', search), where('noSurat', '<=', `${search}\uf8ff`), orderBy('noSurat')); } else { constraints.push(orderBy('tglSurat', 'desc')); if (!exportAll && cursors[index]) constraints.push(startAfter(cursors[index])); if (!exportAll) constraints.push(limit(20)); }
    const snap = await getDocs(query(collection(db, 'suratKeluar'), ...constraints)); return { docs: snap.docs, hasMore: !search && snap.docs.length === 20 };
  }));
  const unique = new Map(); results.flatMap((result) => result.docs).forEach((item) => unique.set(item.id, item)); const allItems = [...unique.values()].map(docToSurat).sort((a, b) => toMillis(b.tglSurat) - toMillis(a.tglSurat)); const items = exportAll ? allItems : allItems.slice(0, 20); return { items, nextCursors: results.map((result) => result.docs.at(-1) || null), hasNext: !exportAll && results.some((result) => result.hasMore), searchMode: Boolean(search) };
};
export const listSuratKeluarForExport = (session, filters = {}) => listSuratKeluar(session, filters, [], { exportAll: true });
export const getSuratKeluarById = async (id) => { const snap = await getDoc(doc(db, 'suratKeluar', id)); return snap.exists() ? { id: snap.id, ...snap.data() } : null; };

export const createSuratKeluar = async (payload, actor) => { const actorProfile = actor.profile || await getUserProfile(actor.uid); const bidangKode = String(actorProfile?.role === 'bidang' ? actorProfile.bidang : (payload.bidangPembuat || actorProfile?.bidang || '')).trim(); if (!payload.jenisId) throw new Error('Jenis nomor surat belum dipilih dari autocomplete.'); if (!bidangKode) throw new Error('Akun pengguna belum memiliki kode bidang. Isi bidang pada profil pengguna terlebih dahulu.'); const idempotencyKey = payload.idempotencyKey || `${actor.uid}_${Date.now()}_${Math.random().toString(36).slice(2)}`; const reservation = payload.reservationId ? { id: payload.reservationId } : await reserveLetterNumber({ jenisId: payload.jenisId, bidangKode, letterDate: payload.tglSurat, actor: { ...actor, profile: actorProfile }, idempotencyKey, metadata: { perihal: payload.hal, tujuan: payload.tujuan }, replacesLetterId: payload.replacesLetterId || null }); return issueLetterNumber({ reservationId: reservation.id, payload, actor: { ...actor, profile: actorProfile } }); };
export const updateSuratKeluar = async (id, changes, actor) => {
  const ref = doc(db, 'suratKeluar', id); const beforeSnap = await getDoc(ref); if (!beforeSnap.exists()) throw new Error('Surat tidak ditemukan.'); const before = beforeSnap.data();
  if (before.letterNumberId) {
    const metadata = {}; if (changes.hal != null) metadata.perihal = changes.hal; if (changes.tujuan != null) metadata.tujuan = changes.tujuan; if (changes.tglSurat != null) metadata.letter_date = changes.tglSurat;
    if (Object.keys(metadata).length) await updateLetterMetadata({ letterNumberId: before.letterNumberId, suratId: id, changes: metadata, actor, expectedVersion: Number(before.letterRowVersion || 1) });
    const residual = { ...changes }; delete residual.hal; delete residual.tujuan; delete residual.tglSurat; delete residual.letterNumberId;
    if (Object.keys(residual).length) { await updateDoc(ref, residual); await writeAudit({ uid: actor.uid, nama: actor.nama || '', aksi: 'ubah metadata tambahan surat keluar', koleksi: 'suratKeluar', docId: id, sebelum: before, sesudah: { ...before, ...changes } }); }
    return { id, ...before, ...changes };
  }
  await updateDoc(ref, changes); await writeAudit({ uid: actor.uid, nama: actor.nama || '', aksi: 'ubah surat keluar', koleksi: 'suratKeluar', docId: id, sebelum: before, sesudah: { ...before, ...changes } }); return { id, ...before, ...changes };
};
export const cancelSuratKeluar = async (id, alasan, actor) => { const ref = doc(db, 'suratKeluar', id); const snap = await getDoc(ref); if (!snap.exists()) throw new Error('Surat tidak ditemukan.'); const data = snap.data(); if (data.letterNumberId) return voidLetterNumber({ letterNumberId: data.letterNumberId, reason: alasan, actor, suratId: id }); return updateSuratKeluar(id, { status: 'Dibatalkan', alasanBatal: String(alasan || '').trim() }, actor); };
export const correctSuratKeluar = async ({ oldLetterNumberId, payload, actor, reason }) => correctLetterNumber({ oldLetterNumberId, newPayload: payload, actor, reason });
export const correctSuratKeluarById = async ({ suratId, payload, actor, reason }) => {
  const oldRef = doc(db, 'suratKeluar', suratId); const oldSnap = await getDoc(oldRef); if (!oldSnap.exists()) throw new Error('Surat lama tidak ditemukan.'); const oldData = oldSnap.data();
  if (oldData.status === 'Dibatalkan') throw new Error('Surat lama sudah dibatalkan.');
  if (oldData.letterNumberId) return correctLetterNumber({ oldLetterNumberId: oldData.letterNumberId, newPayload: payload, actor, reason });
  const replacement = await createSuratKeluar(payload, actor);
  const cleanReason = String(reason || 'Koreksi nomor oleh admin').trim(); const now = Timestamp.now(); await updateDoc(oldRef, { status: 'Dibatalkan', alasanBatal: cleanReason, diubahPada: now }); await writeAudit({ uid: actor.uid, nama: actor.nama || '', aksi: 'koreksi surat keluar lama', koleksi: 'suratKeluar', docId: suratId, sebelum: oldData, sesudah: { ...oldData, status: 'Dibatalkan', alasanBatal: cleanReason, diubahPada: now, replacedById: replacement.id } }); return replacement;
};
export const listAuditLog = async () => { const snap = await getDocs(query(collection(db, 'auditLog'), orderBy('waktu', 'desc'), limit(200))); return snap.docs.map(docToSurat); };

export const getLaporanSuratKeluar = async (session, filters = {}) => {
  const modes = modeForSession(session, filters.sifat || 'semua');
  const results = await Promise.all(modes.map(async (mode) => {
    const constraints = [];
    if (filters.tglMulai) constraints.push(where('tglSurat', '>=', Timestamp.fromDate(filters.tglMulai)));
    if (filters.tglSelesai) constraints.push(where('tglSurat', '<=', Timestamp.fromDate(filters.tglSelesai)));
    if (mode === 'biasa') constraints.push(where('sifat', '==', 'biasa'));
    if (mode === 'rahasia') {
      constraints.push(where('sifat', '==', 'rahasia'));
      if (session.profile.role === 'bidang') constraints.push(where('aksesBidang', 'array-contains', session.profile.bidang));
    }
    if (filters.status && filters.status !== 'semua') constraints.push(where('status', '==', filters.status));
    constraints.push(orderBy('tglSurat', 'desc'));
    const snap = await getDocs(query(collection(db, 'suratKeluar'), ...constraints));
    return snap.docs;
  }));
  const unique = new Map();
  results.flat().forEach((item) => unique.set(item.id, item));
  const items = [...unique.values()]
    .map(docToSurat)
    .sort((a, b) => toMillis(b.tglSurat) - toMillis(a.tglSurat));
  return { items };
};

export const getLaporanSuratMasuk = async (session, filters = {}) => {
  const modes = modeForSession(session, filters.sifat || 'semua');
  const results = await Promise.all(modes.map(async (mode) => {
    const constraints = [];
    if (filters.tglMulai) constraints.push(where('tglTerima', '>=', Timestamp.fromDate(filters.tglMulai)));
    if (filters.tglSelesai) constraints.push(where('tglTerima', '<=', Timestamp.fromDate(filters.tglSelesai)));
    if (mode === 'biasa') constraints.push(where('sifat', '==', 'biasa'));
    if (mode === 'rahasia') {
      constraints.push(where('sifat', '==', 'rahasia'));
      if (session.profile.role === 'bidang') constraints.push(where('aksesBidang', 'array-contains', session.profile.bidang));
    }
    if (filters.status && filters.status !== 'semua') constraints.push(where('status', '==', filters.status));
    constraints.push(orderBy('tglTerima', 'desc'));
    const snap = await getDocs(query(collection(db, 'suratMasuk'), ...constraints));
    return snap.docs;
  }));
  const unique = new Map();
  results.flat().forEach((item) => unique.set(item.id, item));
  const items = [...unique.values()]
    .map(docToSurat)
    .sort((a, b) => toMillis(b.tglTerima) - toMillis(a.tglTerima));
  return { items };
};

export const getDashboardStats = async (session, forceRefresh = false) => {
  const cacheKey = 'dashboard_stats';
  if (!forceRefresh) {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.time < 2 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch {}
  }
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

  const [snapBaru, snapTotal, snapBulan] = await Promise.all([
    getCountFromServer(query(collection(db, 'suratMasuk'), where('status', '==', 'Baru'))),
    getCountFromServer(collection(db, 'suratMasuk')),
    getCountFromServer(query(collection(db, 'suratMasuk'), where('tglTerima', '>=', startOfMonthTimestamp)))
  ]);

  const data = {
    baru: snapBaru.data().count,
    total: snapTotal.data().count,
    bulan: snapBulan.data().count
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
  } catch {}

  return data;
};
