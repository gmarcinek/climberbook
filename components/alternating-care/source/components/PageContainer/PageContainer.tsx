import { Stack } from '@components/Stack/Stack';
import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import styles from './PageContainer.module.scss';

interface PageContainerProps extends PropsWithChildren {
  isFullWidth?: boolean;
}

export default function PageContainer(props: PageContainerProps) {
  const { isFullWidth, children } = props;
  const pageContainerClasses = classNames(
    styles.pageContainer,
    'container mx-auto mb-10 flex flex-col px-4',
    {
      [styles.isFullWidth]: isFullWidth,
    }
  );

  return (
    <div className={pageContainerClasses}>
      <Stack>{children}</Stack>
    </div>
  );
}
