'use client';

import { SupportedLanguages } from '@utils/lang';
import { createContext, useContext } from 'react';
import { AppUser } from '../api/db/types';

export interface AppContextData {
  user: AppUser;
  language: SupportedLanguages;
  setLanguage: (value: SupportedLanguages) => void;
}

export const defaultUser = {
  id: '',
  name: '',
  startDate: '',
  countingRange: '',
};

export const AppContext = createContext<AppContextData>({
  user: { ...defaultUser },
  language: SupportedLanguages.Pl,
  setLanguage() {},
});

export const useAppContext = () => {
  const appContextData = useContext(AppContext);
  return appContextData;
};
