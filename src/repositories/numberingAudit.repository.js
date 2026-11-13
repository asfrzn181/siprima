import { Timestamp } from 'firebase-admin/firestore';
import { KOLEKSI } from '../constants/index.js';
import { hashSha256 } from '../utils/hash.js';
import { refDokumen, refKoleksi } from './base.repository.js';

const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || '',
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || aktor.role || ''
});

export const bacaAuditHead = async (transaction) => {
  const head = await transaction.get(refDokumen(KOLEKSI.LETTER_AUDIT_HEADS, 'global'));
  return head.exists ? String(head.data().last_hash || '') : '';
};

export const tulisAuditDalamTransaksi = async (
  transaction,
  { letterId, action, actor, before, after, previousHash }
) => {
  const payload = JSON.stringify({
    letter_id: letterId,
    action,
    actor: dataAktor(actor),
    before_json: before || null,
    after_json: after || null
  });
  const hash = hashSha256(`${previousHash || ''}${payload}`);
  const auditRef = refKoleksi(KOLEKSI.LETTER_AUDIT_LOG).doc();
  const now = Timestamp.now();
  transaction.set(auditRef, {
    id: auditRef.id,
    letter_id: letterId,
    action,
    actor: dataAktor(actor),
    timestamp: now,
    before_json: before || null,
    after_json: after || null,
    prev_hash: previousHash || '',
    hash
  });
  transaction.set(refDokumen(KOLEKSI.LETTER_AUDIT_HEADS, 'global'), {
    last_hash: hash,
    updated_at: now
  });
};
