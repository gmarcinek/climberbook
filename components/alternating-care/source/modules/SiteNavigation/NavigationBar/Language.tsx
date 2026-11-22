'use client';

import { useAppContext } from '@app/AppContext';
import { SupportedLanguages } from '@utils/lang';

export function Language() {
  const { setLanguage, language } = useAppContext();

  return (
    <select
      aria-label='Język'
      title='Język'
      value={language}
      onChange={(event) =>
        setLanguage(event.target.value as SupportedLanguages)
      }
      style={{
        height: 32,
        minWidth: 58,
        padding: '0 8px',
        border: '1px solid #d9dee5',
        borderRadius: 8,
        background: '#fff',
        color: '#333',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      {Object.values(SupportedLanguages).map((key) => (
        <option key={key} value={key}>
          {key.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
