'use client';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { Button } from '@components/Button/Button';
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
  ReactNode,
  SetStateAction,
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BsTags } from 'react-icons/bs';
import {
  MdOutlineNotes,
  MdPayments,
  MdOutlineSchedule,
  MdOutlineTitle,
  MdOutlineVisibility,
} from 'react-icons/md';
import CalendarEventAvatar from '@components/Calendar/components/CalendarEventAvatar/CalendarEventAvatar';
import CalendarDay from '@components/Calendar/components/CalendarDay/CalendarDay';
import {
  CalenderContext,
  CalenderContextData,
} from '@components/Calendar/Calendar.context';
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
  initialType?: CalendarEventType;
  initialStartTime?: number;
  initialEndTime?: number;
  preserveGroupId?: boolean;
  submitLabel?: string;
  staticLayout?: boolean;
  onDraftChange?: (event: CalendarEvent) => void;
  onCancel?: () => void;
  initialDates?: string[];
  confirmBeforeSave?: boolean;
  redirectAfterSave?: string;
  rangeStartDate?: string;
  rangeEndDate?: string;
  afterActions?: ReactNode;
  hideCancel?: boolean;
  footerActions?: ReactNode;
  hideSelectionSummary?: boolean;
  renderRangeFields?: (fields: {
    isAllDay: boolean;
    startTime: string;
    endTime: string;
    setStartTime: (value: string) => void;
    setEndTime: (value: string) => void;
  }) => ReactNode;
  twoColumn?: boolean;
}

export const DashboardEventForm = (props: DashboardEventFormProps) => {
  const {
    selection,
    onSuccess,
    setSelection,
    setIsMultiSelectionMode,
    initialEvent,
    initialType,
    initialStartTime,
    initialEndTime,
    preserveGroupId,
    submitLabel,
    staticLayout = false,
    onDraftChange,
    onCancel,
    initialDates = [],
    confirmBeforeSave = false,
    redirectAfterSave,
    rangeStartDate,
    rangeEndDate,
    afterActions,
    renderRangeFields,
    hideCancel = false,
    footerActions,
    hideSelectionSummary = false,
    twoColumn = false,
  } = props;
  const { language } = useAppContext();
  const i18n = dashboardEventFormI18n[language];
  const isNote =
    initialEvent?.type === CalendarEventType.Todo ||
    initialType === CalendarEventType.Todo;
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
    backgroundColor,
    setBackgroundColor,
    setDescription,
    setName,
    amount,
    setAmount,
    setTextColor,
    setType,
    isAllDay,
    setIsAllDay,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
  } = useDashboardEventForm({
    onSuccess,
    selection,
    setIsMultiSelectionMode,
    setIsRadioGroupVisible,
    setSelection,
    initialEvent,
    initialType,
    initialStartTime,
    initialEndTime,
    preserveGroupId,
    redirectAfterSave,
    rangeStartDate,
    rangeEndDate,
  });

  useEffect(() => {
    onDraftChange?.(newEvent);
  }, [newEvent, onDraftChange]);

  const previewDate = selection[0] ?? dayjs().format('YYYY-MM-DD');
  const dayPreviewContext = useMemo<CalenderContextData>(
    () => ({
      containerWidth: 400,
      rowSize: 7,
      isTodayVisible: false,
      isPlanVisible: false,
      isAlternatingVisible: false,
      isOtherCareVisible: false,
      isWeekendsVisible: true,
      isEventsVisible: true,
      events: [
        {
          ...newEvent,
          date: previewDate,
          style: { ...newEvent.style, background: backgroundColor },
        },
      ],
      displayStrategy: 'continous',
      hideSelectionCheckbox: true,
    }),
    [newEvent, previewDate, backgroundColor],
  );

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
    [styles.twoColumn]: twoColumn,
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
        {!isNote && !hideSelectionSummary && (
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
        )}

        <Stack direction='horizontal' className={styles.formActions}>
          {footerActions}
          {!hideCancel && (
            <Button
              onClick={() => {
                handleCancel();
                onCancel?.();
              }}
              isDisabled={selection.length === 0}
              className={styles.actionButton}
              radius='sm'
              variant='flat'
              color='default'
            >
              <EventBusyIcon />
              {i18n.cancel}
            </Button>
          )}

          <Button
            type='submit'
            isDisabled={
              selection.length === 0 || formPutEventMutation.isPending
            }
            className={styles.actionButton}
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

        {afterActions}

        <Stack>
          <Stack className={styles.formFields}>
            {!isNote && (
              <div className={styles.formColumns}>
                <div className={classNames(styles.formColumn, styles.formColumnMain)}>
                <div className={classNames(styles.formGroup, styles.groupTitle)}>
                <Stack direction='horizontal'>
                  <MdOutlineTitle size={24} />
                  <h3>{i18n.eventName}</h3>
                </Stack>
                <Input
                  type='text'
                  aria-label={i18n.eventName}
                  value={name}
                  radius='sm'
                  variant='bordered'
                  size='lg'
                  onValueChange={setName}
                />
                {type === CalendarEventType.Expense && (
                  <>
                    <Stack direction='horizontal'>
                      <MdPayments size={24} />
                      <h3>{language === 'pl' ? 'Kwota (zł)' : 'Amount (PLN)'}</h3>
                    </Stack>
                    <Input
                      type='text'
                      inputMode='decimal'
                      aria-label={language === 'pl' ? 'Kwota' : 'Amount'}
                      placeholder='0,00'
                      value={amount}
                      radius='sm'
                      variant='bordered'
                      size='lg'
                      endContent={<span className='text-small'>zł</span>}
                      onValueChange={setAmount}
                    />
                  </>
                )}
                <Stack direction='horizontal'>
                  <MdOutlineNotes size={24} />
                  <h3>{i18n.eventDescription}</h3>
                </Stack>
                <Textarea
                  aria-label={i18n.eventDescription}
                  value={description}
                  radius='sm'
                  variant='bordered'
                  size='md'
                  minRows={4}
                  onValueChange={setDescription}
                />
                </div>
                <div className={classNames(styles.formGroup, styles.groupVisibility)}>
                <Divider className='my-2' />
                <Stack direction='horizontal'>
                  <MdOutlineVisibility size={24} />
                  <h3>{i18n.visibility}</h3>
                </Stack>
                <section className={styles.visibilitySection}>
              <div className={styles.colorControl}>
                <span>Kolor kafelka</span>
                <input
                  type='color'
                  aria-label='Kolor kafelka'
                  value={backgroundColor}
                  onChange={(event) => {
                    setBackgroundColor(event.target.value);
                    setTextColor(getTextColor(event.target.value));
                  }}
                />
                <code>{backgroundColor.toUpperCase()}</code>
              </div>
              <div className={styles.visibilityPreview}>
                <span>Podgląd kafelka</span>
                <div className={styles.visibilityPreviewRow}>
                <article
                  className={styles.visibilityTile}
                  style={
                    { '--event-color': backgroundColor } as CSSProperties
                  }
                >
                  <span className={styles.visibilityIcon}>
                    <CalendarEventAvatar event={newEvent} size={64} variant='square' />
                  </span>
                  <div className={styles.visibilityTileContent}>
                    <small>
                      <strong className={styles.visibilityMetaTime}>
                        {isAllDay
                          ? language === 'pl'
                            ? 'Cały dzień'
                            : 'All day'
                          : `${startTime} – ${endTime}`}
                      </strong>
                      {' · '}
                      <span>
                        {selection[0]
                          ? new Intl.DateTimeFormat(
                              language === 'pl' ? 'pl-PL' : 'en-GB',
                              {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              },
                            ).format(dayjs(selection[0]).toDate())
                          : dayjs().locale(language).format('DD MMMM YYYY')}
                      </span>
                    </small>
                    <h4 className={name ? undefined : styles.previewPlaceholder}>
                      {name || (language === 'pl' ? 'Nazwa wydarzenia' : 'Event name')}
                    </h4>
                    <p className={description ? undefined : styles.previewPlaceholder}>
                      {description ||
                        (language === 'pl' ? 'Opis wydarzenia' : 'Event description')}
                    </p>
                  </div>
                <CalenderContext.Provider value={dayPreviewContext}>
                  <div className={styles.dayPreviewCell}>
                    <CalendarDay
                      day={{ date: previewDate }}
                      dayEvents={dayPreviewContext.events}
                    />
                  </div>
                </CalenderContext.Provider>
                </article>
                </div>
              </div>
                </section>
                </div>
                </div>
                <div className={classNames(styles.formColumn, styles.formColumnRange)}>
                  <div className={classNames(styles.formGroup, styles.groupRange)}>
                  <Stack direction='horizontal'>
                    <MdOutlineSchedule size={24} />
                    <h3>{language === 'pl' ? 'Zakres wydarzenia' : 'Event range'}</h3>
                  </Stack>
                  <section className={styles.timeSection}>
                    <div className={styles.timeMode}>
                    <label>
                      <input
                        type='radio'
                        name='event-time-mode'
                        checked={isAllDay}
                        onChange={() => setIsAllDay(true)}
                      />
                      Całodniowe
                    </label>
                    <label>
                      <input
                        type='radio'
                        name='event-time-mode'
                        checked={!isAllDay}
                        onChange={() => setIsAllDay(false)}
                      />
                      Godzinowe
                    </label>
                  </div>
                    {renderRangeFields ? (
                    renderRangeFields({
                      isAllDay,
                      startTime,
                      endTime,
                      setStartTime,
                      setEndTime,
                    })
                  ) : !isAllDay ? (
                    <div className={styles.timeRange}>
                      <label>
                        Od
                        <input
                          type='time'
                          value={startTime}
                          onChange={(event) => setStartTime(event.target.value)}
                        />
                      </label>
                      <label>
                        Do
                        <input
                          type='time'
                          min={startTime}
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                        />
                      </label>
                    </div>
                    ) : null}
                  </section>
                  </div>
                {(isRadioGroupVisible || staticLayout) && (
                  <div className={classNames(styles.formGroup, styles.groupType)}>
                    <Divider className='my-2' />
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
                  </div>
                )}
                </div>
              </div>
            )}
            {isNote && (
              <>
                <Input
                  type='text'
                  label="Opis zadania"
                  value={name}
                  labelPlacement='outside'
                  radius='sm'
                  variant='bordered'
                  size='lg'
                  onValueChange={setName}
                />
                <Textarea
                  label="Treść zadania"
                  value={description}
                  labelPlacement='outside'
                  radius='sm'
                  variant='bordered'
                  size='md'
                  onValueChange={setDescription}
                />
              </>
            )}
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
