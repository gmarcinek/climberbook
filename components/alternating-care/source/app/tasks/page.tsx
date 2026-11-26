'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import {
  createCareEvents,
  listCareEvents,
} from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import PageContainer from '@components/PageContainer/PageContainer';
import { DashboardEventForm } from '@modules/DashboardPage/components/DashboardEventForm/DashboardEventForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Check,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './tasks.module.scss';

export default function TasksPage() {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const queryClient = useQueryClient();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskDates, setNewTaskDates] = useState(
    () => new Set([dayjs().format('YYYY-MM-DD')]),
  );
  const [updatingGroup, setUpdatingGroup] = useState<string | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const todosQuery = useQuery({
    queryKey: ['careTodos'],
    queryFn: () => listCareEvents({ type: CalendarEventType.Todo }),
  });

  const events = todosQuery.data ?? [];
  const todos = useMemo(() => {
    const byGroup = new Map<string, CalendarEvent>();
    [...events]
      .sort((left, right) => right.creationTime - left.creationTime)
      .forEach((event) => {
        if (!byGroup.has(event.groupId)) byGroup.set(event.groupId, event);
      });
    return [...byGroup.values()];
  }, [events]);
  const pending = todos.filter((todo) => !todo.completed);
  const recentCompletedCutoff = Date.now() - 36 * 60 * 60 * 1000;
  const recentlyCompleted = todos.filter(
    (todo) =>
      todo.completed &&
      (todo.lastEditTime ?? todo.creationTime) >= recentCompletedCutoff,
  );
  const completed = todos.filter(
    (todo) =>
      todo.completed &&
      (todo.lastEditTime ?? todo.creationTime) < recentCompletedCutoff,
  );

  const updateStatus = async (todo: CalendarEvent, isCompleted: boolean) => {
    setUpdatingGroup(todo.groupId);
    try {
      const related = events
        .filter((event) => event.groupId === todo.groupId)
        .map((event) => ({
          ...event,
          completed: isCompleted,
          style: {
            ...event.style,
            background: event.style?.background ?? '#2d8dbf',
            color: event.style?.color ?? '#fff',
            completed: isCompleted,
          },
        }));
      await createCareEvents(related);
      await queryClient.invalidateQueries({ queryKey: ['careTodos'] });
    } catch (cause) {
      toast(
        cause instanceof Error
          ? cause.message
          : isEnglish
            ? 'Could not update the task.'
            : 'Nie udało się zmienić statusu zadania.',
        { type: 'error' },
      );
    } finally {
      setUpdatingGroup(null);
    }
  };

  const renderDescription = (description: string) =>
    description.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
      /^https?:\/\/[^\s]+$/.test(part) ? (
        <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      ) : (
        part
      ),
    );

  const renderTask = (todo: CalendarEvent) => {
    const isCompleted = Boolean(todo.completed);
    const color = todo.style?.background ?? '#2d8dbf';
    return (
      <li
        key={todo.groupId}
        className={styles.task}
        data-completed={isCompleted}
        style={{ '--todo-color': color } as React.CSSProperties}
        draggable={updatingGroup !== todo.groupId}
        onDragStart={(event) => {
          setDraggedGroup(todo.groupId);
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', todo.groupId);
        }}
        onDragEnd={() => setDraggedGroup(null)}
      >
        <span className={styles.taskIcon} aria-hidden>
          {isCompleted ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
        </span>
        <div className={styles.taskCopy}>
          <strong>
            {todo.name || (isEnglish ? 'Task' : 'Zadanie')}
          </strong>
          {todo.description && <p>{renderDescription(todo.description)}</p>}
        </div>
        <button
          type="button"
          disabled={updatingGroup === todo.groupId}
          onClick={() => void updateStatus(todo, !isCompleted)}
          aria-label={
            isCompleted
              ? isEnglish
                ? 'Move to pending'
                : 'Przenieś do niewykonanych'
              : isEnglish
                ? 'Mark as completed'
                : 'Oznacz jako wykonane'
          }
          title={
            isCompleted
              ? isEnglish
                ? 'Move to pending'
                : 'Przenieś do niewykonanych'
              : isEnglish
                ? 'Mark as completed'
                : 'Oznacz jako wykonane'
          }
        >
          {isCompleted ? <RotateCcw size={17} /> : <Check size={17} />}
        </button>
      </li>
    );
  };

  const allowTaskDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const dropTask = (event: React.DragEvent<HTMLElement>, completed: boolean) => {
    event.preventDefault();
    const groupId =
      event.dataTransfer.getData('text/plain') || draggedGroup;
    const todo = todos.find((item) => item.groupId === groupId);
    setDraggedGroup(null);
    if (todo && Boolean(todo.completed) !== completed) {
      void updateStatus(todo, completed);
    }
  };

  const openTaskForm = () => {
    setNewTaskDates(new Set([dayjs().format('YYYY-MM-DD')]));
    setIsAddingTask((current) => !current);
  };

  const closeTaskForm = () => {
    setIsAddingTask(false);
    setNewTaskDates(new Set([dayjs().format('YYYY-MM-DD')]));
  };

  return (
    <PageContainer scrollable isFullWidth>
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.headerIcon}>
            <CheckSquare2 size={24} aria-hidden />
          </span>
          <div>
            <h1>{isEnglish ? 'Tasks' : 'Zadania'}</h1>
            <p>
              {isEnglish
                ? 'Pending and completed notes from the calendar.'
                : 'Niewykonane i wykonane notatki z kalendarza.'}
            </p>
          </div>
          <span className={styles.total}>{todos.length}</span>
        </header>

        {todosQuery.isLoading ? (
          <div className={styles.state}>
            {isEnglish ? 'Loading tasks…' : 'Wczytywanie zadań…'}
          </div>
        ) : todosQuery.isError ? (
          <div className={styles.state} role="alert">
            {isEnglish
              ? 'Tasks could not be loaded.'
              : 'Nie udało się wczytać zadań.'}
          </div>
        ) : (
          <div className={styles.columns}>
            <section
              onDragOver={allowTaskDrop}
              onDrop={(event) => dropTask(event, false)}
              data-drag-active={Boolean(draggedGroup)}
            >
              <header>
                <span>
                  <Clock3 size={18} aria-hidden />
                  {isEnglish ? 'Pending' : 'Do zrobienia'}
                </span>
                <div className={styles.sectionActions}>
                  <strong>{pending.length}</strong>
                  <button
                    type="button"
                    className={styles.addTask}
                    aria-expanded={isAddingTask}
                    onClick={openTaskForm}
                  >
                    <Plus size={15} aria-hidden />
                    {isEnglish ? 'Add task' : 'Dodaj zadanie'}
                  </button>
                </div>
              </header>
              {isAddingTask && (
                <div className={styles.addTaskForm}>
                  <div className={styles.addTaskFormHeader}>
                    <span>
                      <Plus size={18} aria-hidden />
                    </span>
                    <div>
                      <strong>{isEnglish ? 'New task' : 'Nowe zadanie'}</strong>
                      <small>
                        {isEnglish
                          ? 'Add a short title and optional details.'
                          : 'Dodaj krótki tytuł i opcjonalne szczegóły.'}
                      </small>
                    </div>
                  </div>
                  <DashboardEventForm
                    selection={[...newTaskDates]}
                    setSelection={setNewTaskDates}
                    setIsMultiSelectionMode={() => undefined}
                    initialType={CalendarEventType.Todo}
                    submitLabel={isEnglish ? 'Add task' : 'Dodaj zadanie'}
                    staticLayout
                    redirectAfterSave="/alternating-care/tasks"
                    onCancel={closeTaskForm}
                    onSuccess={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ['careTodos'],
                      });
                      closeTaskForm();
                    }}
                  />
                </div>
              )}
              <ul>
                {pending.length > 0 ? (
                  pending.map(renderTask)
                ) : (
                  <li className={styles.empty}>
                    {isEnglish ? 'No pending tasks' : 'Brak otwartych zadań'}
                  </li>
                )}
              </ul>
            </section>

            <section
              onDragOver={allowTaskDrop}
              onDrop={(event) => dropTask(event, true)}
              data-drag-active={Boolean(draggedGroup)}
            >
              <header>
                <span>
                  <CheckCircle2 size={18} aria-hidden />
                  {isEnglish
                    ? 'Recently completed · 36h'
                    : 'Niedawno zamknięte · 36 h'}
                </span>
                <strong>{recentlyCompleted.length}</strong>
              </header>
              <ul>
                {recentlyCompleted.length > 0 ? (
                  recentlyCompleted.map(renderTask)
                ) : (
                  <li className={styles.empty}>
                    {isEnglish
                      ? 'No recently completed tasks'
                      : 'Brak niedawno zamkniętych zadań'}
                  </li>
                )}
              </ul>
            </section>

            <section
              onDragOver={allowTaskDrop}
              onDrop={(event) => dropTask(event, true)}
              data-drag-active={Boolean(draggedGroup)}
            >
              <header>
                <span>
                  <CheckCircle2 size={18} aria-hidden />
                  {isEnglish ? 'Completed' : 'Zamknięte'}
                </span>
                <strong>{completed.length}</strong>
              </header>
              <ul>
                {completed.length > 0 ? (
                  completed.map(renderTask)
                ) : (
                  <li className={styles.empty}>
                    {isEnglish
                      ? 'No completed tasks'
                      : 'Brak zamkniętych zadań'}
                  </li>
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </PageContainer>
  );
}
