/**
 * Endpoint arsip surat. Deploy sebagai Web App: Execute as Me, Access Anyone.
 * Semua permintaan tetap wajib membawa Firebase ID token di body JSON.
 * Properti wajib: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, DRIVE_ROOT_FOLDER_ID.
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.idToken) throw new Error('Token Firebase wajib dikirim.');
    var actor = authenticate_(body.idToken);
    if (body.aksi === 'upload') return json_({ ok: true, result: upload_(actor, body) });
    if (body.aksi === 'unduh') return json_({ ok: true, result: download_(actor, body) });
    throw new Error('Aksi tidak dikenal. Gunakan upload atau unduh.');
  } catch (error) {
    return json_({ ok: false, error: error && error.message ? error.message : 'Permintaan gagal.' });
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function props_() {
  var properties = PropertiesService.getScriptProperties();
  var values = {
    apiKey: properties.getProperty('FIREBASE_API_KEY'),
    projectId: properties.getProperty('FIREBASE_PROJECT_ID'),
    rootFolderId: properties.getProperty('DRIVE_ROOT_FOLDER_ID')
  };
  if (!values.apiKey || !values.projectId || !values.rootFolderId) throw new Error('Properti Apps Script belum lengkap. Isi FIREBASE_API_KEY, FIREBASE_PROJECT_ID, dan DRIVE_ROOT_FOLDER_ID.');
  return values;
}

function authenticate_(idToken) {
  var config = props_();
  var result = fetchJson_('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(config.apiKey), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ idToken: idToken })
  });
  if (!result.users || !result.users.length || !result.users[0].localId) throw new Error('Token Firebase tidak valid.');
  var uid = result.users[0].localId;
  var profile = firestoreGet_('users', uid, config);
  if (!profile || profile.aktif !== true) throw new Error('Akun tidak aktif atau profil tidak ditemukan.');
  return { uid: uid, profile: profile, config: config };
}

function firestoreGet_(collectionName, documentId, config) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(config.projectId) + '/databases/(default)/documents/' + encodeURIComponent(collectionName) + '/' + encodeURIComponent(documentId);
  var response = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (response.getResponseCode() === 404) return null;
  if (response.getResponseCode() >= 400) throw new Error('Firestore menolak pembacaan data.');
  return firestoreDocumentToObject_(JSON.parse(response.getContentText()));
}

function fetchJson_(url, options) {
  var response = UrlFetchApp.fetch(url, options);
  var text = response.getContentText();
  var value = text ? JSON.parse(text) : {};
  if (response.getResponseCode() >= 400 || value.error) throw new Error((value.error && (value.error.message || value.error.status)) || 'Layanan eksternal menolak permintaan.');
  return value;
}

function firestoreDocumentToObject_(document) {
  var result = {};
  var fields = document.fields || {};
  Object.keys(fields).forEach(function (key) { result[key] = firestoreValueToJs_(fields[key]); });
  return result;
}

function firestoreValueToJs_(value) {
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return new Date(value.timestampValue);
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreValueToJs_);
  if (value.mapValue) {
    var map = {};
    Object.keys(value.mapValue.fields || {}).forEach(function (key) { map[key] = firestoreValueToJs_(value.mapValue.fields[key]); });
    return map;
  }
  return null;
}

function canRead_(actor, surat) {
  var sifat = surat.sifat || 'biasa';
  if (sifat === 'biasa') return true;
  var role = actor.profile.role || '';
  return role === 'admin' || role === 'pimpinan' || (role === 'bidang' && (surat.aksesBidang || []).indexOf(actor.profile.bidang || '') !== -1);
}

function validateFile_(payload) {
  var allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.indexOf(payload.mimeType) === -1) throw new Error('Tipe file harus PDF, JPG, atau PNG.');
  if (!payload.namaFile || !payload.dataBase64) throw new Error('Nama dan isi file wajib dikirim.');
  var bytes = Utilities.base64Decode(payload.dataBase64);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');
  return bytes;
}

function upload_(actor, payload) {
  if (['masuk', 'keluar'].indexOf(payload.jenis) === -1 || !payload.suratId) throw new Error('Jenis surat atau ID surat tidak valid.');
  var collectionName = payload.jenis === 'masuk' ? 'suratMasuk' : 'suratKeluar';
  var surat = firestoreGet_(collectionName, payload.suratId, actor.config);
  if (!surat) throw new Error('Surat tidak ditemukan.');
  var role = actor.profile.role || '';
  var allowed = role === 'admin' || (payload.jenis === 'keluar' && role === 'bidang' && surat.bidangPembuat === actor.profile.bidang);
  if (!allowed) throw new Error('Anda tidak berhak mengunggah scan surat ini.');
  var bytes = validateFile_(payload);
  var dateValue = payload.jenis === 'masuk' ? surat.tglTerima : surat.tglSurat;
  var date = dateValue instanceof Date && !isNaN(dateValue.getTime()) ? dateValue : new Date();
  var root = DriveApp.getFolderById(actor.config.rootFolderId);
  var typeFolder = folder_(root, payload.jenis === 'masuk' ? 'Masuk' : 'Keluar');
  var secretFolder = (surat.sifat || 'biasa') === 'rahasia' ? folder_(typeFolder, 'Rahasia') : typeFolder;
  var yearFolder = folder_(secretFolder, Utilities.formatDate(date, 'Asia/Jakarta', 'yyyy'));
  var monthFolder = folder_(yearFolder, Utilities.formatDate(date, 'Asia/Jakarta', 'MM'));
  var safeName = String(payload.namaFile).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  var file = monthFolder.createFile(Utilities.newBlob(bytes, payload.mimeType, safeName));
  return { fileId: file.getId(), fileUrl: file.getUrl(), namaFile: file.getName(), mimeType: file.getMimeType() };
}

function download_(actor, payload) {
  if (['masuk', 'keluar'].indexOf(payload.jenis) === -1 || !payload.suratId) throw new Error('Jenis surat atau ID surat tidak valid.');
  var collectionName = payload.jenis === 'masuk' ? 'suratMasuk' : 'suratKeluar';
  var surat = firestoreGet_(collectionName, payload.suratId, actor.config);
  if (!surat || !canRead_(actor, surat)) throw new Error('Surat tidak ditemukan atau Anda tidak berhak membacanya.');
  if (!surat.fileId) throw new Error('Scan surat belum tersedia.');
  var file;
  try { file = DriveApp.getFileById(surat.fileId); } catch (error) { throw new Error('File scan tidak ditemukan di Drive.'); }
  var blob = file.getBlob();
  return { namaFile: file.getName(), mimeType: blob.getContentType(), dataBase64: Utilities.base64Encode(blob.getBytes()) };
}

function folder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
