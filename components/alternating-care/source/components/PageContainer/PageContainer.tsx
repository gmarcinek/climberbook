import { Stack } from '@components/Stack/Stack';
import classNames from 'classnames';
import { PropsWithChildren } from 'react';
import styles from './PageContainer.module.scss';

interface PageContainerProps extends PropsWithChildren {
  isFullWidth?: boolean;
  scrollable?: boolean;
}

export default function PageContainer(props: PageContainerProps) {
  const { isFullWidth, scrollable, children } = props;
  const pageContainerClasses = classNames(
    styles.pageContainer,
    'container mx-auto mb-10 flex flex-col px-4',
    {
      [styles.isFullWidth]: isFullWidth,
    }
  );

  const content = (
    <div className={pageContainerClasses}>
      <Stack>{children}</Stack>
    </div>
  );

  if (!scrollable) return content;

  return <div className={styles.scrollable}>{content}</div>;
}
