import { kirimSukses } from '../utils/response.js';
import {
  daftarCounterAgenda,
  daftarCounterNomor,
  aturCounterAgenda,
  aturCounterNomor
} from '../repositories/counter.repository.js';

export const daftarCounter = async (req, res) => {
  const [nomor, agenda] = await Promise.all([daftarCounterNomor(), daftarCounterAgenda()]);
  kirimSukses(res, { data: { nomor, agenda } });
};

export const aturCounter = async (req, res) => {
  const body = req.body || {};
  if (body.jenis === 'agenda') {
    const hasil = await aturCounterAgenda({ tahun: body.tahun, lastSeq: body.lastSeq });
    return kirimSukses(res, { message: 'Counter agenda diperbarui.', data: hasil });
  }
  const hasil = await aturCounterNomor({ tahun: body.tahun, scopeKey: body.scopeKey, lastSeq: body.lastSeq });
  kirimSukses(res, { message: 'Counter nomor diperbarui.', data: hasil });
};
