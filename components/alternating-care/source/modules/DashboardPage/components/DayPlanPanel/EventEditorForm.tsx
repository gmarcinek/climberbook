'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { Select } from '@/components/climberbook/common/FormControls';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { CalendarDays, Camera, Clock3, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PhotoUploadDialog } from '@components/CarePhotos/PhotoUploadDialog';
import { CARE_PHOTOS_QUERY_KEY, listCarePhotos } from '@utils/carePhotos';
import { toast } from 'react-toastify';
import { DashboardEventForm } from '../DashboardEventForm/DashboardEventForm';
import { isScatteredSelection } from '../DashboardEventForm/useDashboardEventForm';
import styles from './DayPlanPanel.module.scss';

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12);
  const minute = (index % 12) * 5;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function formatDateParts(date: string, language: 'pl' | 'en') {
  return new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(dayjs(date).toDate());
}

interface EventEditorFormProps {
  selectedDates: Set<string>;
  onDatesChange: (dates: string[]) => void;
  formStartDate: string;
  formEndDate: string;
  setFormRange: (start: string, end: string) => void;
  isEndDateChosen: boolean;
  setIsEndDateChosen: (value: boolean) => void;
  editingEvent?: CalendarEvent;
  newEventType?: CalendarEventType;
  draftStartTime?: number;
  draftEndTime?: number;
  redirectAfterSave?: string;
  /** Renders as a centered modal over a backdrop. */
  modal?: boolean;
  isDeleting?: boolean;
  onDelete: () => void;
  onClose: () => void;
  onSaved: () => void;
}

/** Event add/edit form shared by the calendar day plan and the timeline. */
export function EventEditorForm({
  selectedDates,
  onDatesChange,
  formStartDate,
  formEndDate,
  setFormRange,
  isEndDateChosen,
  setIsEndDateChosen,
  editingEvent,
  newEventType,
  draftStartTime,
  draftEndTime,
  redirectAfterSave,
  modal = false,
  isDeleting = false,
  onDelete,
  onClose,
  onSaved,
}: EventEditorFormProps) {
  const { language } = useAppContext();
  const isPolish = language === 'pl';
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const photoGroupId =
    editingEvent && editingEvent.type !== CalendarEventType.Todo ? editingEvent.groupId : undefined;
  const photosQuery = useQuery({
    queryKey: [...CARE_PHOTOS_QUERY_KEY, 'group', photoGroupId],
    queryFn: () => listCarePhotos({ groupId: photoGroupId }),
    enabled: Boolean(photoGroupId),
  });
  const photoCount = photosQuery.data?.length ?? 0;
  const selectedDaysLabel = (count: number) =>
    isPolish
      ? `${count} ${count === 1 ? 'dzień' : 'dni'}`
      : `${count} ${count === 1 ? 'day' : 'days'}`;

  return (
    <>
      {modal && (
        <div
          className={styles.eventEditorBackdrop}
          role='presentation'
          onClick={onClose}
        />
      )}
      <div
        className={classNames(styles.eventEditor, {
          [styles.modalEventEditor]: modal,
        })}
      >
        <div className={styles.editorHeader}>
          <strong>
            {editingEvent
              ? isPolish
                ? 'Edytuj wydarzenie'
                : 'Edit event'
              : newEventType === CalendarEventType.Todo
                ? isPolish
                  ? 'Nowe zadanie'
                  : 'New task'
                : newEventType === CalendarEventType.Expense
                    ? isPolish
                      ? 'Nowy wydatek'
                      : 'New expense'
                    : isPolish
                      ? 'Nowe wydarzenie'
                      : 'New event'}
          </strong>
        </div>
        <DashboardEventForm
          selection={[...selectedDates]}
          setSelection={(next) => {
            const value =
              typeof next === 'function'
                ? next(new Set(selectedDates))
                : next;
            onDatesChange([...value]);
          }}
          setIsMultiSelectionMode={() => undefined}
          initialEvent={editingEvent}
          initialType={newEventType}
          initialStartTime={draftStartTime}
          initialEndTime={draftEndTime}
          redirectAfterSave={redirectAfterSave}
          rangeStartDate={formStartDate}
          rangeEndDate={formEndDate}
          preserveGroupId={Boolean(editingEvent)}
          submitLabel={
            editingEvent
              ? 'Zapisz wydarzenie'
              : newEventType === CalendarEventType.Todo
                ? 'Dodaj zadanie'
                : newEventType === CalendarEventType.Expense
                    ? 'Dodaj wydatek'
                    : 'Dodaj wydarzenie'
          }
          staticLayout
          twoColumn
          hideCancel
          hideSelectionSummary={modal}
          footerActions={
            <div className={styles.editorHeaderActions}>
              {editingEvent && editingEvent.type !== CalendarEventType.Todo && (
                <button
                  type="button"
                  className={styles.addPhotos}
                  onClick={() => setIsUploadOpen(true)}
                  title={isPolish ? 'Dodaj zdjęcia do wydarzenia' : 'Add photos to the event'}
                >
                  <Camera size={15} aria-hidden />
                  {isPolish ? 'Zdjęcia' : 'Photos'}
                  {photoCount > 0 && <small>{photoCount}</small>}
                </button>
              )}
              {editingEvent && (
                <button
                  type="button"
                  className={styles.deleteEvent}
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  <Trash2 size={15} aria-hidden />
                  {isDeleting
                    ? isPolish
                      ? 'Usuwanie…'
                      : 'Deleting…'
                    : isPolish
                      ? 'Usuń'
                      : 'Delete'}
                </button>
              )}
              <button type="button" onClick={onClose}>
                {isPolish ? 'Anuluj' : 'Cancel'}
              </button>
            </div>
          }
          renderRangeFields={({
            isAllDay,
            startTime,
            endTime,
            setStartTime,
            setEndTime,
          }) => {
            const hasEndDate =
              !isAllDay ||
              isEndDateChosen ||
              formEndDate !== formStartDate;
            const renderRangeCard = (variant: 'start' | 'end') => {
              const isStart = variant === 'start';
              const date = isStart ? formStartDate : formEndDate;
              const isEmpty = !isStart && !hasEndDate;
              const parts = formatDateParts(date, language);
              const part = (type: string) =>
                parts.find((item) => item.type === type)?.value ?? '';
              const timeValue = isStart ? startTime : endTime;
              const setTime = isStart ? setStartTime : setEndTime;
              const timeLabel = isStart
                ? isPolish
                  ? 'Godzina rozpoczęcia'
                  : 'Start time'
                : isPolish
                  ? 'Godzina zakończenia'
                  : 'End time';
              return (
                <div
                  className={classNames(styles.rangeCard, {
                    [styles.rangeCardStart]: isStart,
                    [styles.rangeCardEnd]: !isStart && !isEmpty,
                    [styles.rangeCardEmpty]: isEmpty,
                  })}
                >
                  <span className={styles.rangeCardLabel}>
                    {isStart
                      ? isPolish
                        ? 'Data startu'
                        : 'Start date'
                      : isPolish
                        ? 'Data zakończenia'
                        : 'End date'}
                  </span>
                  <div className={styles.rangeCardRow}>
                    <label className={styles.rangeCardDate}>
                      {isEmpty ? (
                        <>
                          <strong>—</strong>
                          <span>
                            {isPolish ? 'Wybierz datę' : 'Pick a date'}
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>{part('day')}</strong>
                          <span>
                            {part('month')} {part('year')}
                            <small>{part('weekday')}</small>
                          </span>
                        </>
                      )}
                      <input
                        type="date"
                        aria-label={
                          isStart
                            ? isPolish
                              ? 'Data startu'
                              : 'Start date'
                            : isPolish
                              ? 'Data zakończenia'
                              : 'End date'
                        }
                        min={isStart ? undefined : formStartDate}
                        value={date}
                        onClick={(event) =>
                          event.currentTarget.showPicker?.()
                        }
                        onChange={(event) => {
                          if (!event.target.value) return;
                          if (isStart) {
                            setFormRange(event.target.value, formEndDate);
                          } else {
                            setIsEndDateChosen(true);
                            setFormRange(formStartDate, event.target.value);
                          }
                        }}
                      />
                    </label>
                    {!isAllDay && (
                      <>
                        <span
                          className={styles.rangeCardDivider}
                          aria-hidden="true"
                        />
                        <div className={styles.rangeCardTime}>
                          <Clock3 aria-hidden="true" />
                          <input
                            className={styles.nativeTimeInput}
                            type="time"
                            aria-label={timeLabel}
                            value={timeValue}
                            step={300}
                            onChange={(event) => setTime(event.target.value)}
                          />
                          <Select
                            aria-label={timeLabel}
                            className={styles.timeSelect}
                            value={timeValue}
                            onChange={(event) => setTime(event.target.value)}
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className={styles.rangeCardPicker}
                      aria-label={
                        isPolish ? 'Otwórz kalendarz' : 'Open calendar'
                      }
                      onClick={(event) =>
                        event.currentTarget.parentElement
                          ?.querySelector<HTMLInputElement>(
                            'input[type="date"]',
                          )
                          ?.showPicker?.()
                      }
                    >
                      <CalendarDays aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            };
            const selectedDays = [...selectedDates].sort();
            if (isScatteredSelection(selectedDays)) {
              const renderTimeSelect = (variant: 'start' | 'end') => {
                const isStart = variant === 'start';
                const label = isStart
                  ? isPolish
                    ? 'Godzina rozpoczęcia'
                    : 'Start time'
                  : isPolish
                    ? 'Godzina zakończenia'
                    : 'End time';
                return (
                  <div className={styles.rangeCardTime}>
                    <Clock3 aria-hidden="true" />
                    <Select
                      aria-label={label}
                      className={styles.timeSelect}
                      value={isStart ? startTime : endTime}
                      onChange={(event) =>
                        (isStart ? setStartTime : setEndTime)(
                          event.target.value,
                        )
                      }
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              };
              return (
                <div
                  className={classNames(
                    styles.rangeCard,
                    styles.rangeCardStart,
                    styles.selectedDaysCard,
                  )}
                >
                  <span className={styles.rangeCardLabel}>
                    {isPolish ? 'Wybrane dni' : 'Selected days'} ·{' '}
                    {selectedDaysLabel(selectedDays.length)}
                  </span>
                  <div className={styles.selectedDayChips}>
                    {selectedDays.map((date) => (
                      <button
                        key={date}
                        type="button"
                        title={isPolish ? 'Usuń dzień' : 'Remove day'}
                        onClick={() =>
                          onDatesChange(
                            selectedDays.filter((item) => item !== date),
                          )
                        }
                      >
                        {new Intl.DateTimeFormat(
                          isPolish ? 'pl-PL' : 'en-GB',
                          { weekday: 'short', day: 'numeric', month: 'short' },
                        ).format(dayjs(date).toDate())}
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                  {!isAllDay && (
                    <div className={styles.selectedDaysTimes}>
                      {renderTimeSelect('start')}
                      <span aria-hidden="true">–</span>
                      {renderTimeSelect('end')}
                      <small>
                        {isPolish
                          ? 'te same godziny każdego dnia'
                          : 'same hours on each day'}
                      </small>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div className={styles.eventDateTimeRange}>
                {renderRangeCard('start')}
                {renderRangeCard('end')}
              </div>
            );
          }}
          onCancel={onClose}
          onSuccess={() => {
            onClose();
            onSaved();
          }}
        />
      </div>
      {isUploadOpen && photoGroupId && (
        <PhotoUploadDialog
          groupId={photoGroupId}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={(count) =>
            toast(
              isPolish
                ? `Dodano ${count} zdj. — opisz je i zatwierdź w poczekalni na osi czasu.`
                : `${count} photo(s) added — describe and confirm them in the timeline waiting room.`,
              { type: 'success' },
            )
          }
        />
      )}
    </>
  );
}
