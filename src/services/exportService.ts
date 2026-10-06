import { db } from '../db';
import { ExpenseDataState } from '../types/expense';

const BACKUP_DIR_SETTING_KEY = 'backup_directory_handle';

export interface ExportResult {
  success: boolean;
  method: 'linked_folder' | 'local_server' | 'browser_download' | 'file_picker';
  filename: string;
  folderName?: string;
  filePath?: string;
  fileSize?: number;
  savedAt?: string;
  error?: string;
}

export interface ExportFileInfo {
  filename: string;
  size: number;
  modifiedAt: string;
  source: 'linked_folder' | 'local_server';
}

/**
 * Check if the browser supports the File System Access API.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Prompt user once to select a backup directory (e.g. project's exports/ folder)
 * and persist the handle in IndexedDB (Dexie).
 */
export async function linkBackupDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    throw new Error('Your browser does not support the File System Access API. Please use Chrome, Edge, or Brave.');
  }

  const dirHandle = await window.showDirectoryPicker({
    id: 'expense_tracker_exports_dir',
    mode: 'readwrite',
    startIn: 'documents'
  });

  // Verify permission
  const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    throw new Error('Permission to write to the selected folder was denied.');
  }

  // Store in Dexie settings
  await db.settings.put({ key: BACKUP_DIR_SETTING_KEY, value: dirHandle });
  return dirHandle;
}

/**
 * Retrieve saved directory handle and verify permission.
 */
export async function getLinkedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const setting = await db.settings.get(BACKUP_DIR_SETTING_KEY);
    const dirHandle = setting?.value as FileSystemDirectoryHandle | undefined;
    if (!dirHandle) return null;

    // Check if permission is still valid
    const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      return dirHandle;
    }

    // Attempt to request permission if promptable
    if (permission === 'prompt') {
      const requested = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (requested === 'granted') return dirHandle;
    }

    return dirHandle;
  } catch (err) {
    console.warn('Could not retrieve linked directory handle:', err);
    return null;
  }
}

/**
 * Unlink the saved backup folder.
 */
export async function unlinkBackupDirectory(): Promise<void> {
  await db.settings.delete(BACKUP_DIR_SETTING_KEY);
}

/**
 * Generate timestamped backup filename.
 */
export function generateBackupFilename(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `expenses-backup-${timestamp}.json`;
}

/**
 * Save export:
 * 1. If directory handle is linked, writes directly via File System Access API (no backend server needed).
 * 2. If running Vite local server, posts to /api/export endpoint.
 * 3. Falls back to window.showSaveFilePicker or standard browser download.
 */
export async function saveExportToLocal(
  state: ExpenseDataState,
  customFilename?: string | null
): Promise<ExportResult> {
  const filename = customFilename || generateBackupFilename();
  const content = JSON.stringify(state, null, 2);

  // 1. Try Linked Directory Handle (Serverless direct folder writing)
  try {
    const dirHandle = await getLinkedDirectoryHandle();
    if (dirHandle) {
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        return {
          success: true,
          method: 'linked_folder',
          filename,
          folderName: dirHandle.name,
          filePath: `${dirHandle.name}/${filename}`,
          fileSize: content.length,
          savedAt: new Date().toISOString()
        };
      }
    }
  } catch (dirErr) {
    console.warn('Direct directory save failed, attempting fallback:', dirErr);
  }

  // 2. Try Local Vite Server endpoint (if running npm run dev)
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, payload: state })
    });

    if (res.ok) {
      const serverResult = await res.json();
      return {
        success: true,
        filename,
        ...serverResult,
        method: 'local_server'
      };
    }
  } catch {
    // Server not running (offline/standalone file:// mode)
  }

  // 3. Fallback: Native Save File Picker
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Backup File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        method: 'file_picker',
        filename: fileHandle.name,
        filePath: fileHandle.name,
        fileSize: content.length,
        savedAt: new Date().toISOString()
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        throw new Error('Export cancelled by user.');
      }
    }
  }

  // 4. Final Fallback: Standard browser download
  return downloadExportToBrowser(state, filename);
}

/**
 * Direct browser download
 */
export function downloadExportToBrowser(
  state: ExpenseDataState,
  filename?: string
): ExportResult {
  const safeFilename = filename || generateBackupFilename();
  const content = JSON.stringify(state, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, method: 'browser_download', filename: safeFilename, fileSize: content.length };
}

/**
 * List files from linked folder or local server.
 */
export async function getLocalExportsList(): Promise<ExportFileInfo[]> {
  const files: ExportFileInfo[] = [];

  // 1. Check Linked Directory handle
  try {
    const dirHandle = await getLinkedDirectoryHandle();
    if (dirHandle) {
      const perm = await dirHandle.queryPermission({ mode: 'read' });
      if (perm === 'granted') {
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.json')) {
            const fileHandle = entry as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            files.push({
              filename: entry.name,
              size: file.size,
              modifiedAt: new Date(file.lastModified).toISOString(),
              source: 'linked_folder'
            });
          }
        }
        return files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      }
    }
  } catch (err) {
    console.warn('Could not read from linked folder:', err);
  }

  // 2. Fallback to local server endpoint
  try {
    const res = await fetch('/api/exports');
    if (res.ok) {
      const data = await res.json();
      return (data.files || []).map((f: any) => ({ ...f, source: 'local_server' as const }));
    }
  } catch {
    // server not running
  }

  return files;
}

/**
 * Read and parse a file from the linked directory handle.
 */
export async function readLinkedExportFile(filename: string): Promise<ExpenseDataState> {
  const dirHandle = await getLinkedDirectoryHandle();
  if (!dirHandle) throw new Error('No linked directory handle.');

  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text);
}
