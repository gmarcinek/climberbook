'use client';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { Button } from '@components/Button/Button';
import ColorPicker from '@components/ColorPicker/ColorPicker';
import EventListItem from '@components/EventList/components/EventListItem/EventListItem';
import { Stack } from '@components/Stack/Stack';
import AddIcon from '@mui/icons-material/Add';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { Divider, Input, Textarea } from '@nextui-org/react';
import { getTextColor } from '@utils/color';
import classNames from 'classnames';
import dayjs from 'dayjs';
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BsTags } from 'react-icons/bs';
import { MdOutlineVisibility } from 'react-icons/md';
import { dashboardEventFormI18n } from './dashboardEventForm.i18n'; // Import your i18n file
import styles from './dashboardEventForm.module.scss';
import { DashboardEventFormTypeSelectInput } from './DashboardEventFormTypeSelectInput';
import { useDashboardEventForm } from './useDashboardEventForm';
import { useDashboardEventFormAnimations } from './useDashboardEventFormAnimations';

interface DashboardEventFormProps {
  selection: string[];
  setSelection: Dispatch<SetStateAction<Set<string>>>;
  onSuccess: () => void;
  setIsMultiSelectionMode: (value: boolean) => void;
  initialEvent?: CalendarEvent;
  preserveGroupId?: boolean;
  submitLabel?: string;
  staticLayout?: boolean;
  onDraftChange?: (event: CalendarEvent) => void;
  initialDates?: string[];
  confirmBeforeSave?: boolean;
  redirectAfterSave?: string;
}

export const DashboardEventForm = (props: DashboardEventFormProps) => {
  const {
    selection,
    onSuccess,
    setSelection,
    setIsMultiSelectionMode,
    initialEvent,
    preserveGroupId,
    submitLabel,
    staticLayout = false,
    onDraftChange,
    initialDates = [],
    confirmBeforeSave = false,
    redirectAfterSave,
  } = props;
  const { language } = useAppContext();
  const i18n = dashboardEventFormI18n[language];
  const [isConfirming, setIsConfirming] = useState(false);

  // Animation state
  const {
    handleAnimationColapseEnd,
    handleAnimationOpenStart,
    isRadioGroupVisible,
    setIsRadioGroupVisible,
  } = useDashboardEventFormAnimations();

  // Form
  const {
    description,
    name,
    formPutEventMutation,
    type,
    newEvent,
    handleReset,
    handleCancel,
    handleSubmit,
    setBackgroundColor,
    setDescription,
    setName,
    setTextColor,
    setType,
  } = useDashboardEventForm({
    onSuccess,
    selection,
    setIsMultiSelectionMode,
    setIsRadioGroupVisible,
    setSelection,
    initialEvent,
    preserveGroupId,
    redirectAfterSave,
  });

  useEffect(() => {
    onDraftChange?.(newEvent);
  }, [newEvent, onDraftChange]);

  const changes = useMemo(() => {
    const nextDates = new Set(selection);
    const previousDates = new Set(initialDates);
    return {
      added: [...nextDates].filter((date) => !previousDates.has(date)).sort(),
      removed: [...previousDates].filter((date) => !nextDates.has(date)).sort(),
      name: initialEvent?.name !== name,
      description: initialEvent?.description !== description,
      type: initialEvent?.type !== type,
      color:
        initialEvent?.style?.background !== newEvent.style.background ||
        initialEvent?.style?.color !== newEvent.style.color,
    };
  }, [initialDates, initialEvent, name, description, newEvent, selection, type]);

  const formClasses = classNames(styles.dashboardEventForm, {
    [styles.isSelectionNotEmpty]: selection.length !== 0,
    [styles.isColorPickerVisible]: selection.length !== 0 && type !== undefined,
    [styles.staticLayout]: staticLayout,
  });

  useEffect(() => {
    if (selection.length === 0 && !initialEvent) {
      handleReset();
    }
  }, [selection.length, handleReset, initialEvent]);

  const selectedDaysHelper = useMemo(() => {
    const sordedSelection = selection.sort();
    const first = dayjs(sordedSelection.at(0)).format('MM.DD');
    const last = dayjs(sordedSelection.at(sordedSelection.length - 1)).format(
      'MM.DD'
    );

    return {
      sordedSelection,
      first,
      last,
    };
  }, [selection]);

  return (
    <>
      <form
        onSubmit={(event) => {
          if (!confirmBeforeSave) {
            void handleSubmit(event);
            return;
          }
          event.preventDefault();
          setIsConfirming(true);
        }}
        className={formClasses}
        onAnimationStart={handleAnimationOpenStart}
        onAnimationEnd={handleAnimationColapseEnd}
      >
        <Stack direction='horizontal' gap={8}>
          <AddIcon />
          {selection.length !== 0 && (
            <h3>
              Wybrano{' '}
              <strong>
                {`${selection.length} ${selection.length === 1 ? 'dzień' : 'dni'}`}
              </strong>
              {' - '}
              {selection.length === 1 ? (
                <small>{selectedDaysHelper.first}</small>
              ) : (
                <small>
                  {selectedDaysHelper.first}
                  {' / '}
                  {selectedDaysHelper.last}
                </small>
              )}
            </h3>
          )}
        </Stack>

        <Stack direction='horizontal'>
          <Button
            onClick={handleCancel}
            isDisabled={selection.length === 0}
            className='mt-2'
            radius='sm'
            variant='flat'
            color='default'
          >
            <EventBusyIcon />
            {i18n.cancel}
          </Button>

          <Button
            type='submit'
            isDisabled={
              selection.length === 0 || formPutEventMutation.isPending
            }
            className='mt-2'
            radius='sm'
            variant='solid'
            color='danger'
          >
            <EventAvailableIcon />
            {formPutEventMutation.isPending
              ? i18n.saving
              : submitLabel ?? i18n.addEvent}
          </Button>
        </Stack>

        <Divider className='my-4' />

        <Stack>
          <Stack>
            {isRadioGroupVisible && (
              <>
                <Stack direction='horizontal'>
                  <BsTags size={24} />
                  <h3>{i18n.eventType}</h3>
                </Stack>
                <DashboardEventFormTypeSelectInput
                  value={type}
                  onValueChange={(value) => {
                    setType(value as CalendarEventType);
                  }}
                />
              </>
            )}

            <Input
              type='text'
              label={i18n.eventName}
              value={name}
              labelPlacement='outside'
              radius='sm'
              variant='bordered'
              size='lg'
              onValueChange={setName}
            />

            <Textarea
              label={i18n.eventDescription}
              value={description}
              labelPlacement='outside'
              radius='sm'
              variant='bordered'
              size='md'
              onValueChange={setDescription}
            />

            <Divider className='my-2' />

            <Stack direction='horizontal'>
              <MdOutlineVisibility size={24} />
              <h3>{i18n.visibility}</h3>
            </Stack>

            <Stack>
              <EventListItem
                event={newEvent}
                paragraphClassName={styles.exampleItemParagraph}
                titleClassName={styles.exampleItemTitle}
              />

              <ColorPicker
                onColorChange={(color) => {
                  setBackgroundColor(color);
                  setTextColor(getTextColor(color));
                }}
              />
            </Stack>
            <Divider className='my-4' />
          </Stack>
        </Stack>
        {confirmBeforeSave && isConfirming && (
          <div className={styles.confirmationPanel} role='dialog' aria-modal='true'>
            <strong>Podsumowanie zmian</strong>
            <ul>
              <li>Dodane dni: {changes.added.length}</li>
              <li>Usunięte dni: {changes.removed.length}</li>
              {changes.name && <li>Zmieniona nazwa</li>}
              {changes.description && <li>Zmieniony opis</li>}
              {changes.type && <li>Zmieniony typ</li>}
              {changes.color && <li>Zmieniony kolor</li>}
            </ul>
            <div className={styles.confirmationActions}>
              <Button type='button' onClick={() => setIsConfirming(false)}>
                Wróć
              </Button>
              <Button
                type='button'
                color='danger'
                isDisabled={formPutEventMutation.isPending}
                onClick={() => {
                  handleSubmit({
                    preventDefault: () => undefined,
                  } as React.FormEvent);
                }}
              >
                Zapisz zmiany
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
  );
};
