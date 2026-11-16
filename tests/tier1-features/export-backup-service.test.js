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

  it('should tag automated backup filenames with -auto and detect them accurately', async () => {
    const { generateBackupFilename, isAutoBackupFilename } = await getExportServiceModule();
    const manualName = generateBackupFilename(false);
    const autoName = generateBackupFilename(true);

    assert.equal(isAutoBackupFilename(manualName), false);
    assert.equal(isAutoBackupFilename(autoName), true);
    assert.match(autoName, /^expenses-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-auto\.json$/);
  });

  it('should prune only oldest -auto backups beyond retention limit without touching manual backups', async () => {
    const { cleanupOldAutoBackups } = await getExportServiceModule();
    const deleted = [];

    mockFetch(async (url, init) => {
      if (url === '/api/exports') {
        return {
          ok: true,
          json: async () => ({
            files: [
              { filename: 'expenses-backup-2026-11-15_12-00-00-auto.json', size: 100, modifiedAt: '2026-11-15T12:00:00Z' },
              { filename: 'expenses-backup-2026-11-14_12-00-00.json', size: 100, modifiedAt: '2026-11-14T12:00:00Z' }, // manual!
              { filename: 'expenses-backup-2026-11-13_12-00-00-auto.json', size: 100, modifiedAt: '2026-11-13T12:00:00Z' },
              { filename: 'expenses-backup-2026-11-12_12-00-00-auto.json', size: 100, modifiedAt: '2026-11-12T12:00:00Z' },
              { filename: 'expenses-backup-2026-11-11_12-00-00-auto.json', size: 100, modifiedAt: '2026-11-11T12:00:00Z' }
            ]
          })
        };
      }
      if (url === '/api/exports/delete' && init.method === 'POST') {
        const body = JSON.parse(init.body);
        deleted.push(body.filename);
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false, status: 404 };
    });

    const result = await cleanupOldAutoBackups(2);
    assert.deepEqual(result, [
      'expenses-backup-2026-11-12_12-00-00-auto.json',
      'expenses-backup-2026-11-11_12-00-00-auto.json'
    ]);
    assert.deepEqual(deleted, result);
    // Manual backup must never be in deleted list
    assert.equal(deleted.includes('expenses-backup-2026-11-14_12-00-00.json'), false);
  });

  it('should evaluate daily, weekly, and custom scheduled backups accurately', async () => {
    const { DEFAULT_AUTO_BACKUP_SETTINGS, isScheduledBackupDue } = await import('../../src/services/autoBackupService.ts');

    // Daily at 21:00
    const nowAfterSlot = new Date(2026, 10, 15, 21, 30, 0); // Nov 15, 2026 21:30
    const sameDayBeforeSlot = new Date(2026, 10, 15, 20, 45, 0).toISOString();
    const sameDayAfterSlot = new Date(2026, 10, 15, 21, 5, 0).toISOString();

    assert.equal(
      isScheduledBackupDue({ ...DEFAULT_AUTO_BACKUP_SETTINGS, scheduledEnabled: true, scheduleFrequency: 'daily', scheduleTime: '21:00', lastBackupAt: sameDayBeforeSlot }, nowAfterSlot),
      true
    );
    assert.equal(
      isScheduledBackupDue({ ...DEFAULT_AUTO_BACKUP_SETTINGS, scheduledEnabled: true, scheduleFrequency: 'daily', scheduleTime: '21:00', lastBackupAt: sameDayAfterSlot }, nowAfterSlot),
      false
    );

    // Custom interval: every 6 hours
    const sixHoursAgo = new Date(nowAfterSlot.getTime() - 6 * 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(nowAfterSlot.getTime() - 2 * 60 * 60 * 1000).toISOString();
    assert.equal(
      isScheduledBackupDue({ ...DEFAULT_AUTO_BACKUP_SETTINGS, scheduledEnabled: true, scheduleFrequency: 'custom', customIntervalValue: 6, customIntervalUnit: 'hours', lastBackupAt: sixHoursAgo }, nowAfterSlot),
      true
    );
    assert.equal(
      isScheduledBackupDue({ ...DEFAULT_AUTO_BACKUP_SETTINGS, scheduledEnabled: true, scheduleFrequency: 'custom', customIntervalValue: 6, customIntervalUnit: 'hours', lastBackupAt: twoHoursAgo }, nowAfterSlot),
      false
    );
  });

  it('should track transaction count and reset counter when any backup succeeds', async () => {
    const {
      DEFAULT_AUTO_BACKUP_SETTINGS,
      incrementTransactionCounter,
      isCountBackupDue,
      recordBackupSuccess
    } = await import('../../src/services/autoBackupService.ts');

    let settings = { ...DEFAULT_AUTO_BACKUP_SETTINGS, countEnabled: true, countThreshold: 2 };
    assert.equal(isCountBackupDue(settings), false);

    settings = await incrementTransactionCounter(settings, 1);
    assert.equal(settings.transactionsSinceLastBackup, 1);
    assert.equal(isCountBackupDue(settings), false);

    settings = await incrementTransactionCounter(settings, 1);
    assert.equal(settings.transactionsSinceLastBackup, 2);
    assert.equal(isCountBackupDue(settings), true);

    settings = await recordBackupSuccess(settings, new Date('2026-11-15T21:20:00Z'));
    assert.equal(settings.transactionsSinceLastBackup, 0);
    assert.equal(settings.lastBackupAt, '2026-11-15T21:20:00.000Z');
    assert.equal(isCountBackupDue(settings), false);
  });
});
