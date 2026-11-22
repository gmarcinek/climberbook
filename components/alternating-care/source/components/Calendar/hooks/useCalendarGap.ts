import { useBreakpoints } from '@utils/useBreakpoints';
import { useMemo } from 'react';
import { StackGap } from '../../Stack/Stack';

export const useCalendarGap = (rowSize: number, width?: number) => {
  const { isDesktop, isMobile, isTablet, isBigDesktop } = useBreakpoints();

  const gap = useMemo(() => {
    if (width) {
      return toGapSizeByContainerSize(rowSize, width);
    }

    return toGapSizeByRowSize({
      isBigDesktop,
      isDesktop,
      isMobile,
      isTablet,
      rowSize,
    });
  }, [isBigDesktop, isDesktop, isMobile, isTablet, rowSize, width]);

  return gap;
};

function toGapSizeByContainerSize(rowSize: number, width: number) {
  const size608 = 608;
  const size736 = 736;
  const size992 = 992;
  const size1504 = 1504;

  if (width <= size608) {
    switch (rowSize) {
      case 1:
        return 4;
      case 7:
        return 4;
      case 14:
      case 21:
      case 28:
        return 1;
      case 30:
        return 0;
    }
  }

  if (width <= size736) {
    switch (rowSize) {
      case 1:
        return 4;
      case 7:
        return 4;
      case 14:
      case 21:
      case 28:
        return 1;
      case 30:
        return 1;
    }
  }

  if (width <= size992) {
    switch (rowSize) {
      case 1:
        return 4;
      case 7:
        return 4;
      case 14:
      case 21:
      case 28:
        return 1;
      case 30:
        return 1;
    }
  }

  if (width <= size1504) {
    switch (rowSize) {
      case 1:
        return 4;
      case 7:
        return 4;
      case 14:
      case 21:
      case 28:
        return 1;
      case 30:
        return 1;
    }
  }
  return 0;
}

interface ToGapSizeProps {
  rowSize: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBigDesktop: boolean;
}

function toGapSizeByRowSize(props: ToGapSizeProps): StackGap {
  const { isBigDesktop, isDesktop, isMobile, isTablet, rowSize } = props;

  if (isMobile) {
    switch (rowSize) {
      case 1:
        return 8;
      case 7:
        return 4;
      case 14:
      case 21:
      case 28:
        return 2;
    }
  }

  if (isTablet) {
    switch (rowSize) {
      case 1:
        return 8;
      case 7:
        return 8;
      case 14:
      case 21:
      case 28:
        return 4;
    }
  }

  if (isDesktop) {
    switch (rowSize) {
      case 1:
        return 8;
      case 7:
        return 8;
      case 14:
      case 21:
      case 28:
        return 8;
    }
  }

  if (isBigDesktop) {
    switch (rowSize) {
      case 1:
        return 8;
      case 7:
        return 8;
      case 14:
      case 21:
      case 28:
        return 8;
    }
  }

  return 8;
}
