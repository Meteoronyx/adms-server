import { useEffect, useState, useRef } from 'react';

export default function AnimatedNumber({ value, duration = 600 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);

  useEffect(() => {
    const numValue = typeof value === 'string' ? Number(value) : value;

    if (numValue === undefined || numValue === null || isNaN(numValue)) {
      setDisplayValue(value);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (
      prefersReducedMotion ||
      startValueRef.current === undefined ||
      startValueRef.current === null
    ) {
      setDisplayValue(numValue);
      startValueRef.current = numValue;
      return;
    }

    const start = startValueRef.current;
    const end = numValue;

    if (start === end) return;

    let startTimestamp = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(easeProgress * (end - start) + start);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
        startValueRef.current = end;
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  if (displayValue === undefined || displayValue === null || isNaN(displayValue)) {
    return <span className="num">{value ?? '—'}</span>;
  }

  return <span className="num">{Number(displayValue).toLocaleString('id-ID')}</span>;
}
