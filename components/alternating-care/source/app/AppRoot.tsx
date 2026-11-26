'use client';

import { SiteNavigation } from '@modules/SiteNavigation/SiteNavigation';
import { SupportedLanguages } from '@utils/lang';
import { CareLegacyMigration } from '@api/db/events/CareLegacyMigration';
import type { AppUser } from '@api/db/types';
import { PropsWithChildren, useCallback, useMemo } from 'react';
import { AppConfigurationEffect } from './AppConfigurationEffect';
import { AppContext, AppContextData, defaultUser } from './AppContext';
import { usePlatformLanguage } from '@/components/platform/PlatformLanguageProvider';

export default function AppRoot({
  children,
  initialUser,
}: PropsWithChildren<{ initialUser?: AppUser }>) {
  const platformLanguage = usePlatformLanguage();
  const language = platformLanguage.language as SupportedLanguages;
  const setLanguage = useCallback(
    (nextLanguage: SupportedLanguages) => {
      platformLanguage.setLanguage(nextLanguage);
    },
    [platformLanguage]
  );

  const contextData: AppContextData = useMemo(
    () => ({
      user: initialUser ?? defaultUser,
      language,
      setLanguage,
    }),
    [initialUser, language, setLanguage]
  );

  return (
    <AppContext.Provider value={contextData}>
      <AppConfigurationEffect />
      <CareLegacyMigration />
      <SiteNavigation />
      {children}
    </AppContext.Provider>
  );
}
