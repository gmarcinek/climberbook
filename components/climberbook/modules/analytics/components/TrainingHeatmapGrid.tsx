"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function TrainingHeatmapGrid({
  children,
  weeksCount,
}: {
  children: ReactNode;
  weeksCount: number;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState(1);

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const updateTileSize = () => {
      const availableWidth = grid.clientWidth;
      const gapsWidth = weeksCount - 1;

      setTileSize(
        Math.min(22, Math.max(1, Math.floor((availableWidth - gapsWidth) / weeksCount))),
      );
    };
    const resizeObserver = new ResizeObserver(updateTileSize);

    updateTileSize();
    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, [weeksCount]);

  return (
    <div ref={gridRef} style={{ width: "100%" }}>
      <div
        style={{
          columnGap: 1,
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateColumns: `repeat(${weeksCount}, ${tileSize}px)`,
          gridTemplateRows: `repeat(7, ${tileSize}px)`,
          justifyContent: "center",
          rowGap: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}