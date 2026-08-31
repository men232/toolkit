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

    // `end` and `middle` are shorthands for `truncate-end` / `truncate-middle`
    // (reusing cli-truncate's own `position` vocabulary) — not ink's `hard`,
    // which has no counterpart in our enum. See `wrap-text.test.tsx`'s file
    // header for the full naming-divergence rationale.
    if (wrapType!.startsWith('truncate') || wrapType === 'end' || wrapType === 'middle') {
      let position: 'end' | 'middle' | 'start' = 'end';

      if (wrapType === 'truncate-middle' || wrapType === 'middle') {
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
