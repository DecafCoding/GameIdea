/**
 * Copy: puts the hook sentence on the clipboard as plain text (clipboard in
 * docs/architecture.html). The only Clipboard API call in the app. writeText rejects
 * outside a secure context or without a user gesture; a missing API or a rejection is
 * 'blocked', and the caller opens the fallback dialog.
 */

/** The part of the Clipboard API Copy needs. */
export interface ClipboardLike {
  writeText: (text: string) => Promise<void>;
}

export async function copyHook(
  text: string,
  clipboard: ClipboardLike | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard,
): Promise<'copied' | 'blocked'> {
  if (!clipboard || typeof clipboard.writeText !== 'function') return 'blocked';
  try {
    await clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'blocked';
  }
}
