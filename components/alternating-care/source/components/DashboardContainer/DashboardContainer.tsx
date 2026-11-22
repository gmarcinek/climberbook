import { Stack } from '@components/Stack/Stack';
import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import styles from './DashboardContainer.module.scss';

interface DashboardContainerProps extends PropsWithChildren {
  thin?: boolean;
}

export default function DashboardContainer(props: DashboardContainerProps) {
  const { children, thin } = props;

  return (
    <Stack
      className={classNames(styles.dashboardContainer, {
        [styles.thin]: thin,
      })}
    >
      {children}
    </Stack>
  );
}
