import fs from 'node:fs';
import path from 'node:path';

const distIndexHtml = path.resolve(process.cwd(), 'dist/index.html');

if (!fs.existsSync(distIndexHtml)) {
  console.error('dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(distIndexHtml, 'utf8');

// 1. Remove modulepreload links that may cause file:// warning/CORS
html = html.replace(/<link\s+rel="modulepreload"[^>]*>/gi, '');

// 2. Transform <script type="module"> into standard <script> for file:// standalone double-click portability
html = html.replace(/<script\s+type="module"/gi, '<script');

// 3. Ensure all inline script content is cleanly preserved
fs.writeFileSync(distIndexHtml, html, 'utf8');

console.log('✅ Standalone bundle successfully prepared in dist/index.html for file:// execution!');
