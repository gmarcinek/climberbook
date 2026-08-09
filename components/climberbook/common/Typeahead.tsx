"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { formControlClassNames } from "./FormControls";
import styles from "./Typeahead.module.css";

type TypeaheadOption = {
  value: string;
  label?: string;
};

type TypeaheadProps = {
  ariaLabel: string;
  value: string;
  options: TypeaheadOption[];
  placeholder?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pl");
}

export function Typeahead({
  ariaLabel,
  value,
  options,
  placeholder,
  inputClassName,
  onChange,
}: TypeaheadProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = normalize(query);
  const matches = options.filter((option) =>
    normalize(option.label ?? option.value).includes(normalizedQuery),
  );

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectOption(option: TypeaheadOption) {
    onChange(option.value);
    setQuery(option.label ?? option.value);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    onChange("");
    setQuery("");
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        matches.length === 0 ? -1 : Math.min(current + 1, matches.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectOption(matches[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      setQuery(value);
    }
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <input
        type="search"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          setActiveIndex(-1);

          if (!nextQuery) {
            onChange("");
          }
        }}
        onKeyDown={handleKeyDown}
        className={[formControlClassNames.control, styles.input, inputClassName]
          .filter(Boolean)
          .join(" ")}
      />
      {query && (
        <button
          type="button"
          className={styles.clearButton}
          aria-label="Wyczyść wybór obiektu"
          title="Wyczyść wybór"
          onClick={clear}
        >
          ×
        </button>
      )}
      {isOpen && (
        <div id={listboxId} role="listbox" className={styles.listbox}>
          {matches.length > 0 ? (
            matches.map((option, index) => (
              <button
                key={option.value}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={[
                  styles.option,
                  index === activeIndex ? styles["option--active"] : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {option.label ?? option.value}
              </button>
            ))
          ) : (
            <p className={styles.empty}>Brak pasujących obiektów</p>
          )}
        </div>
      )}
    </div>
  );
}
