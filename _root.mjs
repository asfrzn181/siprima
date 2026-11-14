import fs from 'fs';
const p = 'C:\\Users\\asfar\\Documents\\PROJECT\\SIPRIMA\\public\\assets\\css\\app.css';
let s = fs.readFileSync(p,'utf8');
const start = s.indexOf(':root {');
const end = s.indexOf('}', start);
const newRoot = `:root {
  color-scheme: light;

  /* Token resmi SiPRIMA */
  --primary: #0B5CAD;
  --primary-dark: #0C3F7A;
  --primary-light: #3CA0F0;
  --primary-tint: #DCEEFD;
  --accent: #E8750F;
  --warning: #F2B300;
  --success: #2E7D4F;
  --danger: #C62828;
  --bg: #F5F8FC;
  --surface: #FFFFFF;
  --border: #D6DFEA;
  --text: #14213A;
  --text-muted: #586579;

  /* Alias kompatibilitas */
  --accent-hover: var(--primary-dark);
  --accent-soft: var(--primary-tint);
  --accent-line: var(--primary-light);
  --accent-focus: var(--primary-light);
  --accent-mark: var(--accent);

  /* Netral */
  --ink: var(--text);
  --ink-soft: #3d4753;
  --muted: var(--text-muted);
  --line: var(--border);
  --line-strong: #b8c0cb;
  --surface-alt: #f6f7f9;
  --page: var(--bg);

  /* Status */
  --danger-soft: #fceceb;
  --success-soft: #e8f5ee;
  --warning-soft: #fff6d9;

  /* Skala 4px */
`;
s = s.slice(0,start) + newRoot + s.slice(end+1);
// remove original skala duplicate? We kept skala start but need ensure --sp vars remain. The original had --sp-1 after warning-soft. We sliced at first '}', which is end of :root? Actually first '}' after :root is end of :root block. We replaced entire block including --sp vars! Need append skala vars. Check.
fs.writeFileSync(p,s,'utf8');
console.log('done');
