"use client";

import { useEffect, useState } from "react";

export function useViewport() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      setWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  return {
    width,
    isMobileChartLayout: width > 0 && width < 600,
    isMobileHeader: width > 0 && width < 600,
    isMobileTrainingLayout: width > 0 && width < 931,
    showTrainingSidebarColumn: width >= 1640,
  };
}
