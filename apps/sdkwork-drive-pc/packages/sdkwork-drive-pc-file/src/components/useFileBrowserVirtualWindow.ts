import { useEffect, useMemo, useRef, useState } from 'react';

interface VirtualWindowOptions {
  itemCount: number;
  itemHeight: number;
  /** Grid column count; defaults to 1 (list rows). */
  columns?: number;
  overscan?: number;
}

export function useFileBrowserVirtualWindow({
  itemCount,
  itemHeight,
  columns = 1,
  overscan = 8,
}: VirtualWindowOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(container.clientHeight);
      setScrollTop(container.scrollTop);
    };

    updateViewport();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateViewport)
        : undefined;
    resizeObserver?.observe(container);
    container.addEventListener('scroll', updateViewport, { passive: true });
    window.addEventListener('resize', updateViewport);

    return () => {
      resizeObserver?.disconnect();
      container.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [itemCount, itemHeight]);

  const columnCount = Math.max(1, columns);
  const rowCount = itemCount === 0 ? 0 : Math.ceil(itemCount / columnCount);

  const range = useMemo(() => {
    if (rowCount === 0 || viewportHeight <= 0) {
      return { rowStart: 0, rowEnd: 0 };
    }

    const rowStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleRows = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    const rowEnd = Math.min(rowCount, rowStart + visibleRows);
    return { rowStart, rowEnd };
  }, [rowCount, itemHeight, overscan, scrollTop, viewportHeight]);

  const startIndex = range.rowStart * columnCount;
  const endIndex = Math.min(itemCount, range.rowEnd * columnCount);

  return {
    containerRef,
    startIndex,
    endIndex,
    totalHeight: rowCount * itemHeight,
    offsetTop: range.rowStart * itemHeight,
    columnCount,
    visibleRowCount: range.rowEnd - range.rowStart,
  };
}
