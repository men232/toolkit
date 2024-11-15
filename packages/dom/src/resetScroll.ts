/**
 * Resets the scroll position of the specified container element.
 *
 * If a `scrollTop` value is provided, the container's scroll position is set
 * to that value. Otherwise, the function will leave the scroll position unchanged.
 * This function is useful for resetting the scroll state in a container, such as
 * when the content changes or after an animation.
 *
 * @param container The container element whose scroll position needs to be reset.
 * @param scrollTop Optional value to set the container's `scrollTop`. If not provided, the scroll position remains unchanged.
 *
 * @example
 * resetScroll(container, 0); // Resets scroll to top of the container.
 * resetScroll(container); // Resets scroll position without changing it.
 *
 * @group Scrolling
 */
export function resetScroll(container: HTMLDivElement, scrollTop?: number) {
  // if (IS_IOS) {
  // 	container.style.overflow = 'hidden';
  // }

  if (scrollTop !== undefined) {
    container.scrollTop = scrollTop;
  }

  // if (IS_IOS) {
  // 	container.style.overflow = '';
  // }
}
