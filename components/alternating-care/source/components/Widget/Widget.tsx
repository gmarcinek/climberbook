'use client';

import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import styles from './Widget.module.scss';

type WidgetSize = 1 | 2 | 3 | 4 | 5 | 6;
interface WidgetProps extends PropsWithChildren {
  className?: string;
  size?: WidgetSize;
  bgImg?: string;
}

export const Widget = (props: WidgetProps) => {
  const { children, className, size, bgImg } = props;

  return (
    <div
      className={classNames(
        {
          [styles.chartItem1]: size === 1,
          [styles.chartItem2]: size === 2,
          [styles.chartItem3]: size === 3,
          [styles.chartItem4]: size === 4,
          [styles.chartItem5]: size === 5,
          [styles.chartItem6]: size === 6,
        },
        className
      )}
    >
      {children}
    </div>
  );
};
