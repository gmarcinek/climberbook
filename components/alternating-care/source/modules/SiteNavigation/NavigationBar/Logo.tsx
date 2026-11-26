import { useAppContext } from '@app/AppContext';
import { useAppTheme } from '@app/ThemeRoot';
import { colorBlueGreen700, colorRed500 } from '@utils/color';
import { logoI18n } from './logo.i18n';

export function Logo() {
  const { language } = useAppContext();
  const { theme } = useAppTheme();
  const isTimepage = theme === 'timepage';
  const [alternatinText, careText] = logoI18n[language].split(' ');
  return (
    <div>
      <span
        style={{
          color: isTimepage ? '#e4024b' : colorRed500,
        }}
      >
        <strong>{alternatinText}</strong>{' '}
      </span>
      <span
        style={{
          color: isTimepage ? '#f5f5f5' : colorBlueGreen700,
        }}
      >
        {careText}
      </span>
    </div>
  );
}
