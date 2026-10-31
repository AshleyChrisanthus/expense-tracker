import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

export function updateCacheBusting(rootDir = path.resolve(__dirname, '..')) {
  const distIndexPath = path.join(rootDir, 'dist/index.html');
  const rootIndexPath = path.join(rootDir, 'index.html');

  const targetIndexPath = fs.existsSync(distIndexPath) ? distIndexPath : rootIndexPath;
  if (!fs.existsSync(targetIndexPath)) {
    throw new Error(`index.html not found in: ${rootDir}`);
  }

  const htmlHash = computeFileHash(targetIndexPath);
  const swPaths = [
    path.join(rootDir, 'sw.js'),
    path.join(rootDir, 'public/sw.js'),
    path.join(rootDir, 'dist/sw.js')
  ];

  let updatedCount = 0;
  const newCacheName = `expense-tracker-vault-${htmlHash}`;
  const swCacheRegex = /const CACHE_NAME = ['"][^'"]+['"];/;

  for (const swPath of swPaths) {
    if (fs.existsSync(swPath)) {
      let swContent = fs.readFileSync(swPath, 'utf8');
      const newDeclaration = `const CACHE_NAME = '${newCacheName}';`;
      if (swCacheRegex.test(swContent) && !swContent.includes(newDeclaration)) {
        swContent = swContent.replace(swCacheRegex, newDeclaration);
        fs.writeFileSync(swPath, swContent, 'utf8');
        updatedCount++;
        console.log(`[Cache-Bust] Updated ${path.relative(rootDir, swPath)} CACHE_NAME -> ${newCacheName}`);
      }
    }
  }

  return { htmlHash, newCacheName, updatedCount };
}

if (process.argv[1] && process.argv[1].endsWith('cache_bust.js')) {
  try {
    const result = updateCacheBusting();
    console.log(`✅ Cache-busting complete! Active cache key: ${result.newCacheName}`);
  } catch (err) {
    console.error('[Cache-Bust] Error:', err.message);
    process.exit(1);
  }
}
