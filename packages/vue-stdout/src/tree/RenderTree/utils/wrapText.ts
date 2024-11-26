import { withCache } from '@andrew_l/toolkit';
import cliTruncate from 'cli-truncate';
import wrapAnsi from 'wrap-ansi';
import type { Styles } from './applyStyles';

export const wrapText = withCache(
  (text: string, maxWidth: number, wrapType: Styles['textWrap']): string => {
    let wrappedText = text;

    if (wrapType === 'wrap') {
      wrappedText = wrapAnsi(text, maxWidth, {
        trim: false,
        hard: true,
      });
    }

    if (wrapType!.startsWith('truncate')) {
      let position: 'end' | 'middle' | 'start' = 'end';

      if (wrapType === 'truncate-middle') {
        position = 'middle';
      }

      if (wrapType === 'truncate-start') {
        position = 'start';
      }

      wrappedText = cliTruncate(text, maxWidth, { position });
    }

    return wrappedText;
  },
);
