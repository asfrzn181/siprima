/** Backup Firestore harian. Jalankan pasangTrigger() sekali setelah deploy. */
function backupHarian() {
  var config;
  try {
    config = backupProps_();
    var names = ['suratMasuk', 'suratKeluar', 'users', 'masterBidang', 'masterNomor', 'pengaturan', 'counters', 'auditLog'];
    var collections = {};
    names.forEach(function (name) { collections[name] = listCollection_(name, config); });
    var stamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    var payload = { generatedAt: new Date().toISOString(), timezone: 'Asia/Jakarta', collections: collections };
    var folder = DriveApp.getFolderById(config.backupFolderId);
    var file = folder.createFile('backup_' + stamp + '.json', JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
    writeOrdinaryRecap_(collections, config, stamp);
    retainBackups_(folder, 30);
    if (config.successEmail === 'true' && config.adminEmail) MailApp.sendEmail(config.adminEmail, 'Backup SiPrima berhasil ' + stamp, 'Backup tersimpan sebagai ' + file.getName() + '.');
    return { ok: true, fileId: file.getId(), name: file.getName() };
  } catch (error) {
    var message = error && error.stack ? error.stack : String(error);
    try { if (config && config.adminEmail) MailApp.sendEmail(config.adminEmail, 'Backup SiPrima gagal', message); } catch (mailError) { Logger.log(mailError); }
    Logger.log(message);
    return { ok: false, error: message };
  }
}

function pasangTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) { if (trigger.getHandlerFunction() === 'backupHarian') ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('backupHarian').timeBased().atHour(1).everyDays(1).create();
}

function restoreDariJson(fileId, dryRun) {
  var simulate = dryRun !== false;
  var file = DriveApp.getFileById(fileId);
  var payload = JSON.parse(file.getBlob().getDataAsString());
  var config = backupProps_();
  var report = { dryRun: simulate, fileId: fileId, collections: {}, total: 0 };
  Object.keys(payload.collections || {}).forEach(function (name) {
    var items = payload.collections[name] || [];
    report.collections[name] = items.length; report.total += items.length;
    if (!simulate) items.forEach(function (item) { firestorePatch_(name, item.id, item.data, config); });
  });
  return report;
}

function backupProps_() {
  var p = PropertiesService.getScriptProperties();
  var result = { apiKey: p.getProperty('FIREBASE_API_KEY'), projectId: p.getProperty('FIREBASE_PROJECT_ID'), backupFolderId: p.getProperty('BACKUP_FOLDER_ID'), backupSheetId: p.getProperty('BACKUP_SHEET_ID'), adminEmail: p.getProperty('ADMIN_EMAIL'), successEmail: p.getProperty('KIRIM_EMAIL_SUKSES') || 'false' };
  if (!result.projectId || !result.backupFolderId) throw new Error('Isi FIREBASE_PROJECT_ID dan BACKUP_FOLDER_ID di Script Properties.');
  return result;
}

function listCollection_(name, config) {
  var output = []; var token = '';
  do {
    var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(config.projectId) + '/databases/(default)/documents/' + encodeURIComponent(name) + '?pageSize=300';
    if (token) url += '&pageToken=' + encodeURIComponent(token);
    var value = fetchJson_(url, { method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    (value.documents || []).forEach(function (document) { var parts = document.name.split('/'); output.push({ id: parts[parts.length - 1], data: firestoreDocumentToObject_(document) }); });
    token = value.nextPageToken || '';
  } while (token);
  return output;
}

function firestorePatch_(collectionName, id, data, config) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(config.projectId) + '/databases/(default)/documents/' + encodeURIComponent(collectionName) + '/' + encodeURIComponent(id);
  UrlFetchApp.fetch(url, { method: 'patch', contentType: 'application/json', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify({ fields: jsToFirestoreFields_(data) }), muteHttpExceptions: false });
}

function jsToFirestoreFields_(data) {
  var result = {}; Object.keys(data || {}).forEach(function (key) { result[key] = jsToFirestoreValue_(data[key]); }); return result;
}
function jsToFirestoreValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(jsToFirestoreValue_) } };
  if (typeof value === 'object') return { mapValue: { fields: jsToFirestoreFields_(value) } };
  return { stringValue: String(value) };
}

function writeOrdinaryRecap_(collections, config, stamp) {
  var rows = [['Jenis', 'No. Surat/Agenda', 'Tanggal', 'Asal/Tujuan', 'Hal', 'Sifat', 'Status']];
  (collections.suratMasuk || []).forEach(function (item) { if ((item.data.sifat || 'biasa') === 'biasa') rows.push(['Masuk', item.data.noAgenda || '', item.data.tglTerima || '', item.data.asal || '', item.data.hal || '', item.data.sifat || 'biasa', item.data.status || '']); });
  (collections.suratKeluar || []).forEach(function (item) { if ((item.data.sifat || 'biasa') === 'biasa') rows.push(['Keluar', item.data.noSurat || '', item.data.tglSurat || '', item.data.tujuan || '', item.data.hal || '', item.data.sifat || 'biasa', item.data.status || '']); });
  var spreadsheet;
  if (config.backupSheetId) spreadsheet = SpreadsheetApp.openById(config.backupSheetId); else { spreadsheet = SpreadsheetApp.create('Rekap Surat Biasa SiPrima'); var spreadsheetFile = DriveApp.getFileById(spreadsheet.getId()); spreadsheetFile.moveTo(DriveApp.getFolderById(config.backupFolderId)); PropertiesService.getScriptProperties().setProperty('BACKUP_SHEET_ID', spreadsheet.getId()); }
  var sheet = spreadsheet.getSheets()[0]; sheet.clearContents(); sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows); sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
}

function retainBackups_(folder, maxFiles) {
  var files = []; var iterator = folder.getFiles(); while (iterator.hasNext()) { var file = iterator.next(); if (/^backup_\d{4}-\d{2}-\d{2}\.json$/.test(file.getName())) files.push(file); }
  files.sort(function (a, b) { return b.getName().localeCompare(a.getName()); }); files.slice(maxFiles).forEach(function (file) { file.setTrashed(true); });
}
