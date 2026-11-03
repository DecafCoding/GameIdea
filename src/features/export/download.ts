/**
 * The shared file download for both exports: a safe file base name from the board name,
 * and an immediate download with no dialog (a Blob, an object URL and a temporary link).
 */

const FALLBACK_NAME = 'Untitled Board';

/** The board name with characters Windows does not allow in a file name replaced. */
export function safeFileBase(name: string): string {
  // eslint-disable-next-line no-control-regex -- control characters are not allowed in file names.
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-').trim();
  return safe === '' ? FALLBACK_NAME : safe;
}

/** Downloads the contents as a file at once, with no dialog. */
export function downloadFile(fileName: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
