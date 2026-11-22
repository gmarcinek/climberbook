'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/cs';
import 'dayjs/locale/de';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/it';
import 'dayjs/locale/lt';
import 'dayjs/locale/lv';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/ru';
import 'dayjs/locale/sv';
import 'dayjs/locale/uk';
import 'dayjs/locale/zh';

import arraySupport from 'dayjs/plugin/arraySupport';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { useAppContext } from './AppContext';

export function AppConfigurationEffect() {
  const { language } = useAppContext();

  dayjs.extend(weekOfYear);
  dayjs.extend(weekday);
  dayjs.extend(arraySupport);
  dayjs.locale(language);

  return <></>;
}
