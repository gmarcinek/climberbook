import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { Button, ButtonProps } from '@nextui-org/button';
import '@styles/globals.css';
import { useScrollToId } from '@utils/useScrollTo';
import classNames from 'classnames';
import dayjs from 'dayjs';
import styles from './TodayButton.module.scss';

export interface TodayButtonProps extends ButtonProps {
  position?: 'tl' | 'tr' | 'bl' | 'br';
  isMobileHidden?: boolean;
}

export const TodayButton = (props: TodayButtonProps) => {
  const {
    children,
    className,
    position = 'bl',
    isMobileHidden = false,
    ...restProps
  } = props;
  const { scrollToElement } = useScrollToId();
  const todayDate = dayjs().format(dateFormat);

  const classes = classNames(
    styles.todayButton,
    'bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg',
    {
      [styles.isTl]: position === 'tl',
      [styles.isTr]: position === 'tr',
      [styles.isBl]: position === 'bl',
      [styles.isBr]: position === 'br',
      [styles.mobileHidden]: isMobileHidden,
    },
    className
  );

  return (
    <Button
      isIconOnly
      variant='flat'
      aria-label='Today'
      className={classes}
      onClick={() => scrollToElement(`day-${todayDate}`, 100, true)}
      {...restProps}
    >
      {/* <TodaySharpIcon /> */}
      <h3 style={{ color: 'white', margin: 0 }}>
        <strong>{dayjs().format('DD')}</strong>
      </h3>
    </Button>
  );
};
