import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';

function localExportPlugin() {
  return {
    name: 'local-export-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const exportsDir = path.resolve(process.cwd(), 'exports');

        if (req.url === '/api/export' && req.method === 'POST') {
          try {
            if (!fs.existsSync(exportsDir)) {
              fs.mkdirSync(exportsDir, { recursive: true });
            }

            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk;
            });

            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
                const filename = data.filename || `expenses-backup-${timestamp}.json`;
                const safeFilename = path.basename(filename);
                const filePath = path.join(exportsDir, safeFilename);

                const content = JSON.stringify(data.payload || data, null, 2);
                fs.writeFileSync(filePath, content, 'utf8');

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  filename: safeFilename,
                  filePath: `exports/${safeFilename}`,
                  savedAt: new Date().toISOString(),
                  fileSize: Buffer.byteLength(content)
                }));
              } catch (err: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        if (req.url === '/api/exports' && req.method === 'GET') {
          try {
            if (!fs.existsSync(exportsDir)) {
              fs.mkdirSync(exportsDir, { recursive: true });
            }
            const files = fs.readdirSync(exportsDir)
              .filter(f => f.endsWith('.json'))
              .map(f => {
                const stat = fs.statSync(path.join(exportsDir, f));
                return {
                  filename: f,
                  size: stat.size,
                  createdAt: stat.birthtime,
                  modifiedAt: stat.mtime
                };
              })
              .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, files }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

function devHtmlRewritePlugin() {
  return {
    name: 'dev-html-rewrite',
    configureServer(server: any) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (req.url === '/' || req.url === '/index.html') {
          if (fs.existsSync(path.resolve(process.cwd(), 'index.dev.html'))) {
            req.url = '/index.dev.html';
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devHtmlRewritePlugin(),
    localExportPlugin(),
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'index.dev.html'),
    },
  },
});
