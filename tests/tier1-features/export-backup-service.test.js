import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getExportServiceModule, 
  getDbModule, 
  resetDatabase, 
  mockFetch, 
  restoreFetch 
} from '../helpers/setup.js';
import { mockValidBackupPayload } from '../helpers/fixtures.js';

describe('Tier 1: Export & Backup Service', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(() => {
    restoreFetch();
  });

  it('should generate a properly formatted timestamped backup filename', async () => {
    const { generateBackupFilename } = await getExportServiceModule();
    const filename = generateBackupFilename();
    assert.ok(filename.startsWith('expenses-backup-'));
    assert.ok(filename.endsWith('.json'));
    // Pattern: expenses-backup-YYYY-MM-DD_HH-mm-ss.json
    assert.match(filename, /^expenses-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('should download export via browser download fallback', async () => {
    const { downloadExportToBrowser } = await getExportServiceModule();
    const result = downloadExportToBrowser(mockValidBackupPayload, 'test-download.json');

    assert.ok(result);
    assert.equal(result.success, true);
    assert.equal(result.method, 'browser_download');
    assert.equal(result.filename, 'test-download.json');
    assert.ok(result.fileSize > 0);
  });

  it('should save export to local server endpoint when /api/export is available', async () => {
    const { saveExportToLocal } = await getExportServiceModule();

    mockFetch(async (url, init) => {
      if (url === '/api/export' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            filePath: `exports/${body.filename}`,
            fileSize: JSON.stringify(body.payload).length
          })
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await saveExportToLocal(mockValidBackupPayload, 'server-backup.json');
    assert.ok(result);
    assert.equal(result.success, true);
    assert.equal(result.method, 'local_server');
    assert.equal(result.filename, 'server-backup.json');
    assert.ok(result.filePath.includes('server-backup.json'));
  });

  it('should retrieve list of exports from local server endpoint', async () => {
    const { getLocalExportsList } = await getExportServiceModule();

    mockFetch(async (url) => {
      if (url === '/api/exports') {
        return {
          ok: true,
          json: async () => ({
            files: [
              { filename: 'expenses-backup-2026-10-15_12-00-00.json', size: 12040, modifiedAt: '2026-10-15T12:00:00Z' }
            ]
          })
        };
      }
      return { ok: false, status: 404 };
    });

    const files = await getLocalExportsList();
    assert.equal(files.length, 1);
    assert.equal(files[0].filename, 'expenses-backup-2026-10-15_12-00-00.json');
    assert.equal(files[0].source, 'local_server');
  });

  it('should link and unlink backup directory handle in Dexie settings', async () => {
    const { unlinkBackupDirectory } = await getExportServiceModule();
    const { db } = await getDbModule();

    // Mock setting an existing directory handle
    await db.settings.put({ key: 'backup_directory_handle', value: { name: 'mock_exports_folder' } });
    const settingBefore = await db.settings.get('backup_directory_handle');
    assert.ok(settingBefore);
    assert.equal(settingBefore.value.name, 'mock_exports_folder');

    // Unlink directory
    await unlinkBackupDirectory();
    const settingAfter = await db.settings.get('backup_directory_handle');
    assert.equal(settingAfter, undefined);
  });
});
