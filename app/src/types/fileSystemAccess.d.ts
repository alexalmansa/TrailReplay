// TypeScript's bundled lib.dom.d.ts does not yet include the parts of the File
// System Access API used for interactive save-with-overwrite (showSaveFilePicker,
// and the permission query/request methods on FileSystemFileHandle). Only
// Chromium-based browsers implement this API; callers must feature-detect.

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface SaveFilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: SaveFilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
}

interface Window {
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
