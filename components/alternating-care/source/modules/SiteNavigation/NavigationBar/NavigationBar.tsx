'use client';

import { AppUser } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import Link from 'next/link';
import { PlatformAccountMenu } from '@/components/platform/PlatformAccountMenu';
import { siteNavigationI18n } from '../siteNavigation.i18n';
import { Logo } from './Logo';
import { ThemeMenu } from './ThemeMenu';
import { Menu } from 'lucide-react';

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
          <div className='flex h-full items-center justify-between gap-x-8'>
            <button
              type='button'
              className='flex h-9 w-9 items-center justify-center rounded-full text-slate-600 lg:hidden'
              onClick={props.toggle}
              aria-label={i18n.menu}
              title={i18n.menu}
            >
              <Menu size={22} aria-hidden />
            </button>
            <Logo />
            <ul className='hidden gap-x-6 border-l border-slate-300 pl-8 lg:flex'>
              <Link href='/alternating-care'>
                <span>{i18n.home}</span>
              </Link>

              <Link href='/alternating-care/plan'>
                <span>{i18n.care}</span>
              </Link>

              <Link href='/alternating-care/day-plan'>
                <span>{i18n.planning}</span>
              </Link>

              <Link href='/alternating-care/tasks'>
                <span>{i18n.tasks}</span>
              </Link>

              <Link href='/alternating-care/people'>
                <span>{i18n.people}</span>
              </Link>

              <Link href='/alternating-care/settings'>
                <span>{i18n.settings}</span>
              </Link>
            </ul>
          </div>
          <div className='flex items-center gap-2'>
            <div className='hidden lg:block'>
              <ThemeMenu />
            </div>
            <PlatformAccountMenu currentApp='alternating-care' />
          </div>
        </div>
      </div>
    </div>
  );
};
