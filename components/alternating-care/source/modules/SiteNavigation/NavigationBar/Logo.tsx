import { useAppContext } from '@app/AppContext';
import { colorBlueGreen700, colorRed500 } from '@utils/color';
import { logoI18n } from './logo.i18n';

export function Logo() {
  const { language } = useAppContext();
  const [alternatinText, careText] = logoI18n[language].split(' ');
  return (
    <div>
      <span
        style={{
          color: colorRed500,
        }}
      >
        <strong>{alternatinText}</strong>{' '}
      </span>
      <span
        style={{
          color: colorBlueGreen700,
        }}
      >
        {careText}
      </span>
    </div>
  );
}
