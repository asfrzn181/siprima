import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase.js';
// Token dikirim di body JSON agar request text/plain tidak memicu preflight CORS.
const request = async (endpoint, payload) => {
  if (!endpoint) throw new Error('URL Web App Apps Script belum diisi di pengaturan/umum.appsScriptUrl.');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok || result.ok === false) throw new Error(result.error || 'Permintaan arsip gagal.');
  return result.result || result;
};
const fileToBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(new Error('File tidak dapat dibaca.')); reader.readAsDataURL(file); });
export const uploadScan = async ({ endpoint, idToken, jenis, suratId, file }) => { const result = await request(endpoint, { aksi: 'upload', idToken, jenis, suratId, namaFile: file.name, mimeType: file.type, dataBase64: await fileToBase64(file) }); await updateDoc(doc(db, jenis === 'masuk' ? 'suratMasuk' : 'suratKeluar', suratId), { fileId: result.fileId, fileUrl: result.fileUrl || '' }); return result; };
export const downloadScan = async ({ endpoint, idToken, jenis, suratId }) => request(endpoint, { aksi: 'unduh', idToken, jenis, suratId });
export const openDownloadedScan = (result) => {
  const binary = atob(result.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType || 'application/octet-stream' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
