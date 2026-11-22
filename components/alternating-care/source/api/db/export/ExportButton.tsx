import { useExportEvents } from './useExportEvents';

interface ExportButtonProps {
  className?: string;
  label?: string;
}

const ExportButton = ({
  className,
  label = 'Eksportuj wydarzenia',
}: ExportButtonProps) => {
  const { exportEventsToFile } = useExportEvents();

  return (
    <button type='button' className={className} onClick={exportEventsToFile}>
      {label}
    </button>
  );
};

export default ExportButton;
