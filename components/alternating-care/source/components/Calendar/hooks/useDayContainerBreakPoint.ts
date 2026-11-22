import { useMemo } from 'react';

export const useDayContainerBreakPointStyles = (
  rowSize: number,
  width: number
) => {
  const style = useMemo(() => {
    return {
      style: toFontSizeByContainerSize(rowSize, width),
    };
  }, [rowSize, width]);

  return {
    style,
  };
};

function toFontSizeByContainerSize(rowSize: number, width: number) {
  const size430 = 430;
  const size480 = 480;
  const size608 = 608;
  const size736 = 736;
  // const size992 = 992;
  // const size1504 = 1504;

  if (width <= size430) {
    switch (rowSize) {
      case 1:
        return {
          fontSize: '12px',
          lineHeight: '14px',
        };
      case 7:
        return {
          fontSize: '12px',
          lineHeight: '11px',
          padding: ' 5px 0 5px 8px',
        };
      case 14:
        return {
          fontSize: 'inherit',
          lineHeight: 'inherit',
        };
    }
  }

  if (width <= size480) {
    switch (rowSize) {
      case 1:
        return {
          fontSize: '12px',
          lineHeight: '14px',
        };
      case 7:
        return {
          fontSize: '13px',
          lineHeight: '13px',
          padding: '6px 0 6px 10px',
        };
      case 14:
        return {
          fontSize: 'inherit',
          lineHeight: 'inherit',
        };
    }
  }

  if (width <= size608) {
    switch (rowSize) {
      case 1:
        return {
          fontSize: '12px',
          lineHeight: '14px',
        };
      case 7:
        return {
          fontSize: '13px',
          lineHeight: '15px',
          padding: '6px 0 6px 10px',
        };
      case 14:
        return {
          fontSize: 'inherit',
          lineHeight: 'inherit',
        };
    }
  }

  if (width <= size736) {
    switch (rowSize) {
      case 1:
        return {
          fontSize: '16px',
          lineHeight: '20px',
        };
      case 7:
        return {
          fontSize: '16px',
          lineHeight: 'initial',
          padding: '8px 0 8px 12px',
        };
      case 14:
        return {
          fontSize: '12px',
          lineHeight: '12px',
          padding: '0.25rem',
        };
    }
  }

  switch (rowSize) {
    case 1:
      return {
        fontSize: '16px',
        lineHeight: '20px',
      };
    case 7:
      return {
        fontSize: '16px',
        lineHeight: '20px',
        padding: '8px 0 8px 12px',
      };
    case 14:
      return {
        fontSize: '12px',
        lineHeight: '12px',
        padding: '0.5rem',
      };
  }
}

interface ToGapSizeProps {
  rowSize: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBigDesktop: boolean;
}
