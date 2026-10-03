export const MAX_IMPORT_FILES = 200;
export const MAX_IMPORT_FILE_BYTES = 256 * 1024;
export const MAX_IMPORT_TOTAL_BYTES = 1024 * 1024;
export const MAX_ZIP_ARCHIVE_BYTES = 25 * 1024 * 1024;
export const MAX_REMOTE_BYTES = 1024 * 1024;

export function formatLimit(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${bytes / 1024 / 1024} MB`
    : `${bytes / 1024} KB`;
}
