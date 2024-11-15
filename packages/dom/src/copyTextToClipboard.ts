import {
  defaultDocument,
  defaultNavigator,
  defaultWindow,
} from './environment';

/**
 * Copies the provided text to the system clipboard.
 *
 * The function attempts to use the `navigator.clipboard` API if available. If not,
 * it falls back to using a fake element approach to copy the text.
 *
 * @param text The text to be copied to the clipboard.
 * @returns A promise that resolves to `true` if the text was successfully copied,
 *          or `false` if the operation failed.
 *
 * @example
 * copyTextToClipboard('Hello, World!')
 *   .then(success => {
 *     if (success) {
 *       console.log('Text copied to clipboard!');
 *     } else {
 *       console.log('Failed to copy text.');
 *     }
 *   });
 *
 * @group Clipboard
 */
export function copyTextToClipboard(text: string): Promise<boolean> {
  if (defaultNavigator?.clipboard) {
    return copyWithNavigator(text);
  } else {
    return copyWithFakeElement(text);
  }
}

function copyWithNavigator(text: string): Promise<boolean> {
  if (!defaultNavigator) return Promise.resolve(false);

  return navigator.clipboard.writeText(text).then(() => true);
}

function copyWithFakeElement(text: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!defaultDocument) return resolve(false);
    if (!defaultWindow) return resolve(false);

    const textareaEl = defaultDocument.createElement('textarea');
    const range = defaultDocument.createRange();

    textareaEl.value = text;
    textareaEl.style.position = 'fixed'; // Avoid scrolling to bottom
    textareaEl.contentEditable = 'true';

    defaultDocument.body.appendChild(textareaEl);

    textareaEl.focus();
    textareaEl.select();

    range.selectNodeContents(textareaEl);

    const selection = defaultWindow.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    textareaEl.setSelectionRange(0, 999999);

    try {
      const successful = defaultDocument.execCommand('copy');
      if (successful) {
        resolve(true);
      } else {
        reject(new Error('copy failed'));
      }
    } catch (error) {
      reject(error);
    }

    if (selection) {
      selection.removeAllRanges();
    }

    defaultDocument.body.removeChild(textareaEl);
  });
}
