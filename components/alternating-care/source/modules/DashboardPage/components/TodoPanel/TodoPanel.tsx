'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import {
  createCareEvents,
  deleteCareEvent,
  listCareEvents,
} from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import { useQuery } from '@tanstack/react-query';
import CalendarEventAvatar from '@components/Calendar/components/CalendarEventAvatar/CalendarEventAvatar';
import { CheckCircle2, CheckSquare2, Clock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import styles from './TodoPanel.module.scss';

interface TodoPanelProps {
  events: CalendarEvent[];
  onUpdated: () => void;
  onAdd: () => void;
  onEdit: (event: CalendarEvent) => void;
}

export function TodoPanel({ events, onUpdated, onAdd, onEdit }: TodoPanelProps) {
  const { language } = useAppContext();
  const [updatingId, setUpdatingId] = useState<string>();
  const [selectedTodo, setSelectedTodo] = useState<CalendarEvent>();
  const todosQuery = useQuery({
    queryKey: ['careTodos'],
    queryFn: () => listCareEvents({ type: CalendarEventType.Todo }),
  });
  const allTodos = todosQuery.data ??
    events.filter((event) => event.type === CalendarEventType.Todo);
  const todos = useMemo(
    () => {
      const byGroup = new Map<string, CalendarEvent>();
      [...allTodos]
        .sort((left, right) => right.creationTime - left.creationTime)
        .forEach((event) => {
          if (!byGroup.has(event.groupId)) byGroup.set(event.groupId, event);
        });
      const recentCompletedCutoff = Date.now() - 36 * 60 * 60 * 1000;
      return [...byGroup.values()].filter(
        (todo) =>
          !todo.completed ||
          (todo.lastEditTime ?? todo.creationTime) >= recentCompletedCutoff,
      );
    },
    [allTodos],
  );
  const updateTodoStatus = async (event: CalendarEvent, completed: boolean) => {
    setUpdatingId(event.id);
    try {
      const relatedEvents = allTodos
        .filter((item) => item.groupId === event.groupId)
        .map((item) => ({
          ...item,
          completed,
          style: {
            ...item.style,
            background: item.style?.background ?? '#2d8dbf',
            color: item.style?.color ?? '#fff',
            completed,
          },
        }));
      await createCareEvents(relatedEvents);
      onUpdated();
      await todosQuery.refetch();
      setSelectedTodo(undefined);
    } catch (cause) {
      toast(
        cause instanceof Error
          ? cause.message
          : language === 'pl'
            ? 'Nie udało się zmienić statusu notatki.'
            : 'The note status could not be updated.',
        { type: 'error' },
      );
    } finally {
      setUpdatingId(undefined);
    }
  };

  const deleteTodo = async (event: CalendarEvent) => {
    if (
      !window.confirm(
        language === 'pl' ? 'Usunąć tę notatkę?' : 'Delete this note?',
      )
    ) {
      return;
    }
    setUpdatingId(event.id);
    try {
      await Promise.all(
        allTodos
          .filter((item) => item.groupId === event.groupId)
          .map(deleteCareEvent),
      );
      setSelectedTodo(undefined);
      onUpdated();
      await todosQuery.refetch();
    } catch (cause) {
      toast(
        cause instanceof Error
          ? cause.message
          : language === 'pl'
            ? 'Nie udało się usunąć notatki.'
            : 'The note could not be deleted.',
        { type: 'error' },
      );
    } finally {
      setUpdatingId(undefined);
    }
  };

  const renderDescription = (description: string) =>
    description.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
      /^https?:\/\/[^\s]+$/.test(part) ? (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {part}
        </a>
      ) : (
        part
      ),
    );

  return (
    <section className={styles.panel} aria-labelledby="todo-panel-title">
      <header>
        <div>
          <CheckSquare2 size={18} aria-hidden />
          <h3 id="todo-panel-title">
            {language === 'pl' ? 'Zadania' : 'Tasks'}
          </h3>
        </div>
        <div className={styles.headerActions}>
          <span>{todos.length}</span>
          <button type="button" onClick={onAdd}>
            <Plus size={15} aria-hidden />
            {language === 'pl' ? 'Stwórz zadanie' : 'Create task'}
          </button>
        </div>
      </header>
      <ul>
        {todos.map((todo) => (
          <li
            key={todo.id}
            data-completed={Boolean(todo.completed)}
            style={
              {
                '--todo-color': todo.completed
                  ? (todo.style?.background ?? '#2d8dbf')
                  : '#8b949b',
              } as CSSProperties
            }
          >
            <button
              type="button"
              className={styles.todoTile}
              onClick={() => setSelectedTodo(todo)}
            >
              <span className={styles.icon}>
                {todo.completed ? (
                  <CalendarEventAvatar
                    event={todo}
                    size={64}
                    variant='square'
                  />
                ) : (
                  <Clock size={32} aria-hidden />
                )}
              </span>
              <span className={styles.todoCopy}>
                <span className={styles.titleLine}>
                  <strong>
                    {todo.name || (language === 'pl' ? 'Notatka' : 'Note')}
                  </strong>
                </span>
                {todo.description && <p>{renderDescription(todo.description)}</p>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selectedTodo && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setSelectedTodo(undefined)}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="todo-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>{language === 'pl' ? 'Notatka' : 'Note'}</small>
                <h3 id="todo-modal-title">
                  {selectedTodo.completed ? (
                    <CheckCircle2
                      size={20}
                      aria-label={language === 'pl' ? 'Wykonane' : 'Done'}
                    />
                  ) : (
                    <Clock
                      size={20}
                      aria-label={language === 'pl' ? 'Jeszcze nie' : 'Not yet'}
                    />
                  )}
                  {selectedTodo.name ||
                    (language === 'pl' ? 'Szczegóły notatki' : 'Note details')}
                </h3>
              </div>
              <div className={styles.modalHeaderActions}>
                <button
                  type="button"
                  onClick={() => {
                    onEdit(selectedTodo);
                    setSelectedTodo(undefined);
                  }}
                >
                  <Pencil size={15} aria-hidden />
                  {language === 'pl' ? 'Edycja' : 'Edit'}
                </button>
                <button
                  type="button"
                  className={styles.deleteAction}
                  disabled={updatingId === selectedTodo.id}
                  onClick={() => void deleteTodo(selectedTodo)}
                  aria-label={language === 'pl' ? 'Usuń notatkę' : 'Delete note'}
                  title={language === 'pl' ? 'Usuń notatkę' : 'Delete note'}
                >
                  <Trash2 size={17} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTodo(undefined)}
                  aria-label={language === 'pl' ? 'Zamknij' : 'Close'}
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </header>
            {selectedTodo.description && (
              <div className={styles.noteDescription}>
                <small>
                  {language === 'pl' ? 'Treść zadania' : 'Task content'}
                </small>
                <p>{renderDescription(selectedTodo.description)}</p>
              </div>
            )}
            <hr className={styles.modalDivider} />
            <div className={styles.statusActions}>
              <button
                type="button"
                data-active={Boolean(selectedTodo.completed)}
                disabled={updatingId === selectedTodo.id}
                onClick={() => void updateTodoStatus(selectedTodo, true)}
              >
                <CheckCircle2 size={17} aria-hidden />
                {language === 'pl' ? 'WYKONANE' : 'DONE'}
              </button>
              <button
                type="button"
                data-active={!selectedTodo.completed}
                disabled={updatingId === selectedTodo.id}
                onClick={() => void updateTodoStatus(selectedTodo, false)}
              >
                <Clock size={17} aria-hidden />
                {language === 'pl' ? 'JESZCZE NIE' : 'NOT YET'}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
