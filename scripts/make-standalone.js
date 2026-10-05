import fs from 'node:fs';
import path from 'node:path';

const rootIndexHtml = path.resolve(process.cwd(), 'index.html');
const devIndexHtml = path.resolve(process.cwd(), 'index.dev.html');

// 1. Keep a backup of dev index.html if not already backed up
if (fs.existsSync(rootIndexHtml) && !fs.existsSync(devIndexHtml)) {
  const currentRoot = fs.readFileSync(rootIndexHtml, 'utf8');
  if (currentRoot.includes('/src/main.tsx') || currentRoot.includes('/src/main.jsx')) {
    fs.writeFileSync(devIndexHtml, currentRoot, 'utf8');
  }
}

const distIndexHtml = path.resolve(process.cwd(), 'dist/index.html');

if (!fs.existsSync(distIndexHtml)) {
  console.error('dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

let html = fs.readFileSync(distIndexHtml, 'utf8');

// 2. Clean up any modulepreload links
html = html.replace(/<link\s+rel="modulepreload"[^>]*>/gi, '');

// 3. Find the main bundle script tag (the large application bundle)
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let bundleScriptContent = null;
let fullBundleTag = null;

while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  // Bundle script will be larger than 50KB
  if (content.length > 50000) {
    bundleScriptContent = content;
    fullBundleTag = match[0];
    break;
  }
}

if (bundleScriptContent && fullBundleTag) {
  // Remove the script from its original location (likely in <head>)
  html = html.replace(fullBundleTag, '');

  // Place clean standard script before </body>
  const bodyEndIdx = html.lastIndexOf('</body>');
  const standaloneScript = `\n<script>\n${bundleScriptContent}\n</script>\n`;

  if (bodyEndIdx !== -1) {
    html = html.slice(0, bodyEndIdx) + standaloneScript + html.slice(bodyEndIdx);
  } else {
    html += standaloneScript;
  }
} else {
  // Fallback: replace any type="module"
  html = html.replace(/<script\s+type="module"/gi, '<script');
}

// 4. Ensure dist directory exists and write standalone files
const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write to BOTH dist/index.html AND root index.html so opening either one works!
fs.writeFileSync(distIndexHtml, html, 'utf8');
fs.writeFileSync(rootIndexHtml, html, 'utf8');

console.log('✅ Standalone bundle successfully written to dist/index.html AND index.html!');
