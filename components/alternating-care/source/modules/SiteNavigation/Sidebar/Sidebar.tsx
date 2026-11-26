import { useAppContext } from '@app/AppContext';
import { Stack } from '@components/Stack/Stack';
import Link from 'next/link';
import { siteNavigationI18n } from '../siteNavigation.i18n';
import { ThemeMenu } from '../NavigationBar/ThemeMenu';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

export const Sidebar = (props: SidebarProps) => {
  const { isOpen, toggle } = props;
  const { language } = useAppContext();
  const i18n = siteNavigationI18n[language];
  return (
    <>
      <div
        className='sidebar-container fixed left-0 z-50 grid h-full w-full justify-center overflow-hidden bg-white pt-[120px]'
        style={{
          opacity: `${isOpen ? '1' : '0'}`,
          top: ` ${isOpen ? '0' : '-100%'}`,
          zIndex: 100,
        }}
      >
        <button className='absolute right-0 p-5' onClick={toggle}>
          {/* Close icon */}
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='48'
            height='48'
            viewBox='0 0 24 24'
          >
            <path
              fill='currentColor'
              d='M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z'
            />
          </svg>
        </button>

        <ul className='sidebar-nav text-center text-xl leading-relaxed'>
          <Stack>
            <li>
              <Link href='/alternating-care' onClick={toggle}>
                <h2>{i18n.home}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/plan' onClick={toggle}>
                <h2>{i18n.care}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/day-plan' onClick={toggle}>
                <h2>{i18n.dayPlan}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/tasks' onClick={toggle}>
                <h2>{i18n.tasks}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/timeline' onClick={toggle}>
                <h2>{i18n.timeline}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/people' onClick={toggle}>
                <h2>{i18n.people}</h2>
              </Link>
            </li>

            <li>
              <Link href='/alternating-care/settings' onClick={toggle}>
                <h2>{i18n.settings}</h2>
              </Link>
            </li>
            <li className='flex justify-center pt-4'>
              <ThemeMenu />
            </li>
          </Stack>
        </ul>
      </div>
    </>
  );
};
