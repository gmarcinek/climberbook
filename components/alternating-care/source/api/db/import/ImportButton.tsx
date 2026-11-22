import React, { useRef } from 'react';
import { useImportEvents } from './useImportEvents';

interface ImportButtonProps {
  className?: string;
  label?: string;
}

const ImportButton = ({
  className,
  label = 'Wybierz plik do importu',
}: ImportButtonProps) => {
  const { importEventsFromFile } = useImportEvents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importEventsFromFile(file); // Importujemy dane z wybranego pliku
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='.json'
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        type='button'
        className={className}
        onClick={() => fileInputRef.current?.click()}
      >
        {label}
      </button>
    </>
  );
};

export default ImportButton;
