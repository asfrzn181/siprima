import 'dotenv/config';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { query, tutupPool } from './src/config/db.js';

const { app } = await import('./src/app.js');
const [admin] = await query("SELECT id, email, password_hash FROM users WHERE email = 'admin@dinas.go.id'");
if (!admin) { console.error('admin not found'); process.exit(1); }
const sandi = 'SmokeTest123!';
await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(sandi, 10), admin.id]);

const agen = request.agent(app);
const csrf = await agen.get('/api/auth/csrf');
const token = csrf.body.data.token;
const masuk = await agen.post('/api/auth/login').set('x-csrf-token', token).send({ email: admin.email, password: sandi });
console.log('login:', masuk.status, masuk.body.message);

// PUT counter
const put = await agen.put('/api/nomor/counter').set('x-csrf-token', token).send({ jenis: 'nomor', tahun: 2026, scopeKey: 'SURAT_KELUAR', lastSeq: 5000 });
console.log('PUT:', put.status, put.body.message, put.body.data);

// GET counter
const get = await agen.get('/api/nomor/counter');
console.log('GET nomor:', JSON.stringify(get.body.data?.nomor?.find(x=>x.scope_key==='SURAT_KELUAR' && x.tahun===2026)));

await query('UPDATE users SET password_hash = ? WHERE id = ?', [admin.password_hash, admin.id]);
await tutupPool();
process.exit(0);
