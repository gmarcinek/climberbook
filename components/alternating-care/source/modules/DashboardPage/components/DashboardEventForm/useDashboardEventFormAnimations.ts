import { AnimationEventHandler, useCallback, useState } from 'react';
import styles from './dashboardEventForm.module.scss';

const open200AnimationName = styles.expandTo200;
const open700AnimationName = styles.expandTo700;
const colapseAnimationName = styles.collapseTo0;

export const useDashboardEventFormAnimations = () => {
  const [isRadioGroupVisible, setIsRadioGroupVisible] = useState(false);
  const [isBottomFormVisible, setIsBottomFormVisible] = useState(false);

  const handleAnimationOpenStart = useCallback<
    AnimationEventHandler<HTMLFormElement>
  >((event) => {
    event.preventDefault();

    if (
      event.animationName === open200AnimationName ||
      event.animationName === open700AnimationName
    ) {
      setIsRadioGroupVisible(true);
    }

    if (event.animationName === open700AnimationName) {
      setIsRadioGroupVisible(true);
    }
  }, []);

  const handleAnimationColapseEnd = useCallback<
    AnimationEventHandler<HTMLFormElement>
  >((event) => {
    event.preventDefault();

    if (event.animationName === colapseAnimationName) {
      setIsRadioGroupVisible(false);
    }
  }, []);

  return {
    isRadioGroupVisible,
    setIsRadioGroupVisible,
    handleAnimationOpenStart,
    handleAnimationColapseEnd,
  };
};
