import { noop } from '@/is';

const defaultWindow = (globalThis as any)?.window;

/**
 * Create a getter of css variable for container
 * @group Colors
 */
export function cssVariable(container: HTMLElement): (name: string) => string {
  if (!defaultWindow) return noop as any;

  const computedStyles = defaultWindow.getComputedStyle(container);

  return (name: string) => {
    const patterns = name.split('/', 2);

    if (patterns[0]?.startsWith('--')) {
      let value = computedStyles.getPropertyValue(patterns[0])?.trim();

      if (patterns[0].startsWith('--v')) {
        value = `rgb(${value})`;
      }

      patterns[0] = value;
    }

    return patterns.join('/');
  };
}
