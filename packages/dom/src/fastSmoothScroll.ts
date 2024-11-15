import { fastRaf } from '@andrew_l/toolkit';
import { animateSingle } from './animation';

export const FAST_SMOOTH_MAX_DISTANCE = 1500;
export const FAST_SMOOTH_MIN_DURATION = 250;
export const FAST_SMOOTH_MAX_DURATION = 600;
export const FAST_SMOOTH_SHORT_TRANSITION_MAX_DISTANCE = 500; // px

export type ScrollCompleteCallback = (target: HTMLElement) => void;

export enum FocusDirection {
  Up,
  Down,
  Static,
}

/**
 * Smoothly scrolls the specified container to bring the given element into view,
 * with optional customization for scroll behavior, direction, and duration.
 *
 * This function calculates the optimal scroll position based on the given parameters
 * and smoothly scrolls the container to that position. It can adjust the scroll
 * behavior for accessibility, animation duration, and other constraints.
 *
 * @param container The container element that will be scrolled.
 * @param element The element inside the container that needs to be brought into view.
 * @param position The scroll position logic (`'centerOrTop'`, `ScrollLogicalPosition`).
 * @param margin A margin in pixels to be applied around the element when scrolling into view (default is `0`).
 * @param maxDistance The maximum distance for smooth scrolling (default is `FAST_SMOOTH_MAX_DISTANCE`).
 * @param forceDirection Optional, the direction to force the scroll (`FocusDirection`). If not provided, the default scroll direction is calculated.
 * @param forceDuration Optional, a custom duration (in milliseconds) for the smooth scroll. If not provided, a default duration is used.
 * @param forceNormalContainerHeight Optional, a flag indicating whether to force the container height calculation for normal behavior.
 * @param onComplete Optional callback function that is triggered when the scroll operation completes.
 *
 * @example
 * fastSmoothScroll(container, element, 'centerOrTop', 10, 500, FocusDirection.Up, 300);
 *
 * @group Scrolling
 */
export function fastSmoothScroll(
  container: HTMLElement,
  element: HTMLElement,
  position: ScrollLogicalPosition | 'centerOrTop',
  margin = 0,
  maxDistance = FAST_SMOOTH_MAX_DISTANCE,
  forceDirection?: FocusDirection,
  forceDuration?: number,
  forceNormalContainerHeight?: boolean,
  onComplete?: ScrollCompleteCallback,
) {
  const scrollFrom = calculateScrollFrom(
    container,
    element,
    maxDistance,
    forceDirection,
  );

  if (forceDirection === FocusDirection.Static) {
    scrollWithJs(container, element, scrollFrom, position, margin, 0);
    return;
  }

  scrollWithJs(
    container,
    element,
    scrollFrom,
    position,
    margin,
    forceDuration,
    forceNormalContainerHeight,
    onComplete,
  );
}

function calculateScrollFrom(
  container: HTMLElement,
  element: HTMLElement,
  maxDistance = FAST_SMOOTH_MAX_DISTANCE,
  forceDirection?: FocusDirection,
) {
  const { offsetTop: elementTop } = element;
  const { scrollTop } = container;

  if (forceDirection === undefined) {
    const offset = elementTop - container.scrollTop;

    if (offset < -maxDistance) {
      return scrollTop + (offset + maxDistance);
    } else if (offset > maxDistance) {
      return scrollTop + (offset - maxDistance);
    }
  } else if (forceDirection === FocusDirection.Up) {
    return elementTop + maxDistance;
  } else if (forceDirection === FocusDirection.Down) {
    return Math.max(0, elementTop - maxDistance);
  }

  return scrollTop;
}

function scrollWithJs(
  container: HTMLElement,
  element: HTMLElement,
  scrollFrom: number,
  position: ScrollLogicalPosition | 'centerOrTop',
  margin = 0,
  forceDuration?: number,
  forceNormalContainerHeight?: boolean,
  onComplete?: ScrollCompleteCallback,
) {
  const { offsetTop: elementTop, offsetHeight: elementHeight } = element;
  const {
    scrollTop: currentScrollTop,
    offsetHeight: containerHeight,
    scrollHeight,
  } = container;
  const targetContainerHeight =
    forceNormalContainerHeight && container.dataset.normalHeight
      ? Number(container.dataset.normalHeight)
      : containerHeight;

  if (currentScrollTop !== scrollFrom) {
    container.scrollTop = scrollFrom;
  }

  let path!: number;

  switch (position) {
    case 'start':
      path = elementTop - margin - scrollFrom;
      break;
    case 'end':
      path =
        elementTop +
        elementHeight +
        margin -
        (scrollFrom + targetContainerHeight);
      break;
    // 'nearest' is not supported yet
    case 'nearest':
    case 'center':
    case 'centerOrTop':
      path =
        elementHeight < targetContainerHeight
          ? elementTop +
            elementHeight / 2 -
            (scrollFrom + targetContainerHeight / 2)
          : elementTop - margin - scrollFrom;
      break;
  }

  if (path < 0) {
    const remainingPath = -scrollFrom;
    path = Math.max(path, remainingPath);
  } else if (path > 0) {
    const remainingPath = scrollHeight - (scrollFrom + targetContainerHeight);
    path = Math.min(path, remainingPath);
  }

  if (path === 0) {
    onComplete?.(container);
    return;
  }

  const target = scrollFrom + path;

  if (forceDuration === 0) {
    container.scrollTop = target;
    onComplete?.(container);
    return;
  }

  const absPath = Math.abs(path);
  const transition =
    absPath < FAST_SMOOTH_SHORT_TRANSITION_MAX_DISTANCE
      ? shortTransition
      : longTransition;
  const duration =
    forceDuration ||
    FAST_SMOOTH_MIN_DURATION +
      (absPath / FAST_SMOOTH_MAX_DISTANCE) *
        (FAST_SMOOTH_MAX_DURATION - FAST_SMOOTH_MIN_DURATION);
  const startAt = Date.now();

  fastRaf(() => {
    animateSingle(() => {
      const t = Math.min((Date.now() - startAt) / duration, 1);
      const currentPath = path * (1 - transition(t));

      container.scrollTop = Math.round(target - currentPath);

      if (t > 0) {
        return true;
      }

      onComplete?.(container);
      return false;
    });
  });
}

function longTransition(t: number) {
  return 1 - (1 - t) ** 5;
}

function shortTransition(t: number) {
  return 1 - (1 - t) ** 3.5;
}
