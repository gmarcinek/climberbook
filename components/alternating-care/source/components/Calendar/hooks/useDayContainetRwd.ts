import { useMemo } from 'react';

export const useDayContainetRwd = (width: number) => {
  const api = useMemo(() => {
    const size320 = 320;
    const size380 = 380;
    const size430 = 430;
    const size608 = 608;
    const size736 = 736;
    const size992 = 992;
    const size1024 = 1024;
    const size1280 = 1280;
    const size1371 = 1371;
    const size1504 = 1504;

    const is320 = width <= size320;
    const is380 = width <= size380;
    const is430 = width <= size430;
    const is608 = width <= size608;
    const is736 = width <= size736;
    const is992 = width <= size992;
    const is1024 = width <= size1024;
    const is1280 = width <= size1280;
    const is1371 = width <= size1371;
    const is1504 = width <= size1504;

    return {
      is320,
      is380,
      is430,
      is608,
      is736,
      is992,
      is1024,
      is1280,
      is1371,
      is1504,
    };
  }, [width]);

  return {
    ...api,
  };
};
