import type { CSSProperties, PropsWithChildren } from 'react';
import { forwardRef } from 'react';

type StackAlignment = 'start' | 'end' | 'between' | 'center' | 'baseline';
type StackDirection = 'horizontal' | 'vertical';
export type StackGap =
  | 0
  | 1
  | 2
  | 4
  | 8
  | 10
  | 12
  | 16
  | 20
  | 24
  | 32
  | 48
  | 64;

interface StackProps extends PropsWithChildren {
  direction?: StackDirection;
  gap?: StackGap;
  contentAlignment?: StackAlignment; // justify-content
  itemsAlignment?: StackAlignment; // align-items
  style?: CSSProperties;
  className?: string;
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (props: StackProps, ref) => {
    const {
      direction = 'vertical',
      gap = 16,
      contentAlignment,
      itemsAlignment, // New prop for align-items
      style,
      className,
      children,
    } = props;

    const flexDirection = direction === 'horizontal' ? 'row' : 'column';

    const justifyContent = contentAlignment
      ? {
          start: 'flex-start',
          end: 'flex-end',
          between: 'space-between',
          center: 'center',
          baseline: 'baseline',
        }[contentAlignment]
      : undefined;

    const alignItems = itemsAlignment
      ? {
          start: 'flex-start',
          end: 'flex-end',
          between: 'space-between',
          center: 'center',
          baseline: 'baseline',
        }[itemsAlignment]
      : undefined;

    const computedStyle: CSSProperties = {
      display: 'flex',
      flex: '1',
      flexDirection,
      justifyContent,
      alignItems, // Apply align-items
      gap: `${gap}px`,
      ...style,
    };

    return (
      <div style={computedStyle} className={className} ref={ref}>
        {children}
      </div>
    );
  }
);
