'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoEventOption } from './eventOptions';
import { formatEventOption } from './eventOptions';
import styles from './carePhotos.module.scss';

const MAX_RESULTS = 40;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');

interface EventPickerProps {
  /** Already sorted by relevance (closest in time first). */
  options: PhotoEventOption[];
  value: string | null;
  onChange: (groupId: string | null) => void;
  language: string;
}

/** Event select with a type-ahead search, closest events first. */
export const EventPicker = ({ options, value, onChange, language }: EventPickerProps) => {
  const isEnglish = language === 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.groupId === value);

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen]);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return options
      .filter((option) => !needle || normalize(formatEventOption(option)).includes(needle))
      .slice(0, MAX_RESULTS);
  }, [options, query]);

  const choose = (groupId: string | null) => {
    onChange(groupId);
    setIsOpen(false);
    setQuery('');
  };

  const renderOption = (option: PhotoEventOption) => (
    <li key={option.groupId}>
      <button
        type='button'
        role='option'
        aria-selected={option.groupId === value}
        onClick={() => choose(option.groupId)}
      >
        <strong>{option.label}</strong>
        <small>
          {option.end && option.end !== option.date
            ? `${option.date} – ${option.end}`
            : option.date}
        </small>
      </button>
    </li>
  );

  return (
    <div className={styles.eventPicker} ref={rootRef}>
      <button
        type='button'
        className={styles.eventPickerTrigger}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          {selected
            ? formatEventOption(selected)
            : value
              ? isEnglish
                ? 'Linked event'
                : 'Powiązane wydarzenie'
              : isEnglish
                ? 'No event'
                : 'Bez wydarzenia'}
        </span>
        <ChevronDown size={15} aria-hidden />
      </button>
      {isOpen && (
        <div className={styles.eventPickerPanel} ref={panelRef}>
          <ul role='listbox'>
            <li>
              <button
                type='button'
                role='option'
                aria-selected={!value}
                className={styles.eventPickerNone}
                onClick={() => choose(null)}
              >
                <X size={14} aria-hidden />
                {isEnglish ? 'No event' : 'Bez wydarzenia'}
              </button>
            </li>
          </ul>
          <label className={styles.eventPickerSearch}>
            <Search size={14} aria-hidden />
            <input
              ref={searchRef}
              type='text'
              value={query}
              placeholder={isEnglish ? 'Search events…' : 'Szukaj wydarzenia…'}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (results[0]) choose(results[0].groupId);
                }
              }}
            />
          </label>
          <ul role='listbox' className={styles.eventPickerResults}>
            {results.map(renderOption)}
            {results.length === 0 && (
              <li className={styles.eventPickerEmpty}>
                {isEnglish ? 'No matching events.' : 'Brak pasujących wydarzeń.'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
