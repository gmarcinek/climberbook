'use client';

import { AppUser } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import Link from 'next/link';
import { PlatformAccountMenu } from '@/components/platform/PlatformAccountMenu';
import { siteNavigationI18n } from '../siteNavigation.i18n';
import { Logo } from './Logo';

interface NavbarProps {
  toggle: () => void;
  user: AppUser;
}

export const NavigationBar = (props: NavbarProps) => {
  void props;
  const { language } = useAppContext();
  const i18n = siteNavigationI18n[language];

  return (
    <div
      className='x-0 sticky top-0 z-50 h-12 w-full bg-white shadow-lg shadow-slate-200/50'
      id='main-navbar'
    >
      <div className='container-fluid h-full px-4'>
        <div className='flex h-full items-center justify-between'>
          <div className='flex h-full items-center justify-between gap-x-8 divide-x divide-slate-300'>
            <Logo />
            <ul className='hidden gap-x-6 pl-8 md:flex'>
              <Link href='/alternating-care'>
                <span>{i18n.home}</span>
              </Link>

              <Link href='/alternating-care/settings'>
                <span>{i18n.settings}</span>
              </Link>
            </ul>
          </div>
          <div>
            <PlatformAccountMenu currentApp='alternating-care' />
          </div>
        </div>
      </div>
    </div>
  );
};
