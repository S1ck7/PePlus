import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Smoothly moves a displayed number toward `target` (ease-out). Plain requestAnimationFrame,
 * so it behaves the same on Android, iOS and web. `from` sets the very first start value.
 */
export function useTween(target: number, durationMs = 550, from?: number): number {
  const [value, setValue] = useState(from ?? target);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const start = valueRef.current;
    if (start === target) return;
    let frame = 0;
    const startedAt = Date.now();
    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      setValue(start + (target - start) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
