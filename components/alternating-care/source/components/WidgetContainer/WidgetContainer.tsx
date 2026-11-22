'use client';

import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import styles from './WidgetContainer.module.scss';

interface WidgetContainerProps extends PropsWithChildren {
  className?: string;
}

export const WidgetContainer = (props: WidgetContainerProps) => {
  const { children, className } = props;

  return (
    <div className={classNames(styles.widgetGrid, className)}>{children}</div>
  );
};
