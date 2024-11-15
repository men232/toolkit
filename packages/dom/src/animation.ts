import { fastRaf } from '@andrew_l/toolkit';

interface AnimationInstance {
  isCancelled: boolean;
}

let currentInstance: AnimationInstance | undefined;

/**
 * Animates a single tick of an animation, running repeatedly until cancelled or the tick function returns `false`.
 *
 * If an `instance` is provided, it will control the cancellation state of the animation. Otherwise, a new animation
 * instance is created and assigned as the current instance. This function uses `fastRaf` to run the animation in the
 * next available frame.
 *
 * @param tick A function to be called on each frame, returning `true` to continue animating or `false` to stop.
 * @param instance An optional animation instance to control cancellation state.
 *
 * @example
 * animateSingle(() => {
 *   // Your tick logic here (e.g., move an element)
 *   return true; // Return `true` to keep animating, `false` to stop.
 * });
 *
 * @group Animation
 */
export function animateSingle(tick: Function, instance?: AnimationInstance) {
  if (!instance) {
    if (currentInstance && !currentInstance.isCancelled) {
      currentInstance.isCancelled = true;
    }

    instance = { isCancelled: false };
    currentInstance = instance;
  }

  if (!instance!.isCancelled && tick()) {
    fastRaf(() => {
      animateSingle(tick, instance);
    });
  }
}

/**
 * Continuously animates by repeatedly calling the `tick` function until it returns `false`.
 *
 * The function uses `fastRaf` to run the animation and continues until the `tick` function no longer returns `true`.
 *
 * @param tick The tick function to be executed on each frame. If it returns `false`, the animation stops.
 *
 * @example
 * animate(() => {
 *   // Your animation logic here
 *   return true; // Return `true` to continue animating, `false` to stop.
 * });
 *
 * @group Animation
 */
export function animate(tick: Function) {
  fastRaf(() => {
    if (tick()) {
      animate(tick);
    }
  });
}

/**
 * Instantly animates by calling the `tick` function in rapid succession until it returns `false`.
 *
 * This is intended for scenarios where the animation should run as quickly as possible, without any delay.
 *
 * @param tick The tick function to be executed on each frame. If it returns `false`, the animation stops.
 *
 * @example
 * animateInstantly(() => {
 *   // Your instant animation logic here
 *   return true; // Return `true` to continue animating, `false` to stop.
 * });
 *
 * @group Animation
 */
export function animateInstantly(tick: Function) {
  if (tick()) {
    fastRaf(() => {
      animateInstantly(tick);
    });
  }
}

export type TimingFn = (t: number) => number;

export type AnimateNumberProps = {
  to: number | number[];
  from: number | number[];
  duration: number;
  onUpdate: (value: any) => void;
  timing?: TimingFn;
  onEnd?: () => void;
};

export const timingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t ** 1.675,
  easeOut: (t: number) => -1 * t ** 1.675,
  easeInOut: (t: number) => 0.5 * (Math.sin((t - 0.5) * Math.PI) + 1),
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t ** 3,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t ** 3 : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t ** 4,
  easeOutQuart: (t: number) => 1 - --t * t ** 3,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * --t * t ** 3),
  easeInQuint: (t: number) => t ** 5,
  easeOutQuint: (t: number) => 1 + --t * t ** 4,
  easeInOutQuint: (t: number) =>
    t < 0.5 ? 16 * t ** 5 : 1 + 16 * --t * t ** 4,
};

/**
 * Animates a numeric value from `from` to `to` over a specified duration, applying an optional timing function.
 *
 * The animation will continuously update the value using the `onUpdate` callback until the animation is complete.
 * Once the animation ends, the `onEnd` callback will be called, if provided.
 *
 * @param timing The timing function that controls the progression of the animation. Defaults to `linear`.
 * @param onUpdate A callback that receives the updated value (or values) on each animation frame.
 * @param duration The duration of the animation in milliseconds.
 * @param onEnd An optional callback to be called when the animation completes.
 * @param from The starting value(s) of the animation.
 * @param to The target value(s) of the animation.
 *
 * @returns A function that can be called to cancel the animation.
 *
 * @example
 * animateNumber({
 *   from: 0,
 *   to: 100,
 *   duration: 1000,
 *   onUpdate: (value) => {
 *     console.log(value); // Updated value on each frame
 *   },
 *   onEnd: () => {
 *     console.log('Animation complete!');
 *   },
 * });
 *
 * @group Animation
 */
export function animateNumber({
  timing = timingFunctions.linear,
  onUpdate,
  duration,
  onEnd,
  from,
  to,
}: AnimateNumberProps) {
  const t0 = Date.now();
  let canceled = false;

  animateInstantly(() => {
    if (canceled) return false;
    const t1 = Date.now();
    let t = (t1 - t0) / duration;
    if (t > 1) t = 1;
    const progress = timing(t);
    if (typeof from === 'number' && typeof to === 'number') {
      onUpdate(from + (to - from) * progress);
    } else if (Array.isArray(from) && Array.isArray(to)) {
      const result = from.map((f, i) => f + (to[i] - f) * progress);
      onUpdate(result);
    }
    if (t === 1 && onEnd) onEnd();
    return t < 1;
  });

  return () => {
    canceled = true;
    if (onEnd) onEnd();
  };
}
