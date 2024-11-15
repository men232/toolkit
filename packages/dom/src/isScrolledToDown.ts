import { defaultDocument, defaultWindow } from './environment';

/**
 * Determines if the specified element or the document/window is scrolled near the bottom.
 *
 * This function checks if the scroll position has reached the bottom of the target element or window
 * within a specified threshold. It is commonly used for implementing "infinite scroll" or detecting
 * when a user has scrolled to the bottom of a page or container.
 *
 * @param target The target element, document, or window to check the scroll position.
 *               Can be an `HTMLElement`, `Document`, or `Window`.
 * @param threshold The threshold (in pixels) below which the target is considered "scrolled to the bottom."
 *                  Default is `10`, meaning the target is considered scrolled to the bottom if it is within 10px of the bottom.
 *
 * @returns `true` if the target is scrolled near the bottom within the given threshold, otherwise `false`.
 *
 * @example
 * // Check if the window is scrolled near the bottom
 * isScrolledToDown(window, 20); // Returns true if within 20px of the bottom of the window.
 *
 * @example
 * // Check if a specific container is scrolled near the bottom
 * const container = document.getElementById('myContainer');
 * isScrolledToDown(container, 50); // Returns true if within 50px of the bottom of the container.
 *
 * @group Scrolling
 */
export function isScrolledToDown(
  target: HTMLElement | Document | Window,
  threshold: number = 10,
) {
  let scrollBottom: number;

  if (target === defaultDocument) {
    scrollBottom =
      (defaultDocument?.body?.offsetHeight || 0) -
      ((defaultWindow?.innerHeight || 0) + (defaultWindow?.scrollY || 0));
  } else {
    const el = target as HTMLElement;
    scrollBottom = el.scrollHeight - (el.offsetHeight + el.scrollTop);
  }

  return scrollBottom <= threshold;
}
