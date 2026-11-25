'use client';

import { useGetAllEventsQuery } from '@api/db/events/useGetAllEventsQuery';
import { useAppContext } from '@app/AppContext';
import { ErrorMessage } from '@components/ErrorMessage/ErrorMessage';
import {
  formatAge,
  wardAge,
  wardAvatarSubject,
} from '@utils/careWards';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import { useCareAvatars } from '@utils/useCareAvatars';
import { useCareWards } from '@utils/useCareWards';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  GraduationCap,
  Pencil,
} from 'lucide-react';
import {
  DayPlanPanel,
  monthsInRange,
} from './components/DayPlanPanel/DayPlanPanel';
import { LessonPlans } from './components/LessonPlans/LessonPlans';
import { DashboardPageContext } from './DashboardPage.context';
import styles from './FullScreenDayPlanPage.module.scss';

type PlanningTab = 'plan' | 'lessons';

export function FullScreenDayPlanPage() {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const { query, refetch, loadMonth } = useGetAllEventsQuery({ lazy: true });
  const { wards, isLoading: isLoadingWards, error: wardsError, saveWard } =
    useCareWards();
  const { getAvatar } = useCareAvatars();
  const loadVisibleRange = useCallback(
    (start: string, end: string) => {
      monthsInRange(start, end).forEach((month) => {
        void loadMonth(month, true);
      });
    },
    [loadMonth],
  );
  const { searchParams } = useAppSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: PlanningTab =
    searchParams.get('tab') === 'lessons' ? 'lessons' : 'plan';
  const selectedWardId = searchParams.get('ward') ?? undefined;
  const [lessonMode, setLessonMode] = useState<'preview' | 'edit'>('preview');
  const children = useMemo(
    () => wards.filter((ward) => ward.kind === 'child' && ward.id),
    [wards],
  );
  const selectedWard =
    children.find((ward) => ward.id === selectedWardId) ?? children[0];
  const navigate = useCallback(
    (nextTab: PlanningTab, wardId?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === 'lessons') params.set('tab', 'lessons');
      else params.delete('tab');
      if (nextTab === 'lessons' && wardId) params.set('ward', wardId);
      else if (nextTab === 'plan') params.delete('ward');
      const queryString = params.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('groupId');
    const queryString = params.toString();
    return `/alternating-care/day-plan${queryString ? `?${queryString}` : ''}`;
  }, [searchParams]);
  const context = useMemo(() => ({ updateAllEvents: refetch }), [refetch]);

  if (query.isError && !query.data?.length) {
    return <ErrorMessage message="Unexpected error occurred" />;
  }

  return (
    <DashboardPageContext.Provider value={context}>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/alternating-care" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden />
            {isEnglish ? 'Back to calendar' : 'Powrót do kalendarza'}
          </Link>
          <nav
            className={styles.tabs}
            role="tablist"
            aria-label={isEnglish ? 'Planning' : 'Planowanie'}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'plan'}
              className={styles.tab}
              onClick={() => navigate('plan')}
            >
              <CalendarDays size={16} aria-hidden />
              {isEnglish ? 'Plan' : 'Plan'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lessons'}
              className={styles.tab}
              onClick={() => navigate('lessons', selectedWardId)}
            >
              <GraduationCap size={16} aria-hidden />
              {isEnglish ? 'Lesson plans' : 'Plany lekcji'}
            </button>
          </nav>
          {tab === 'lessons' && selectedWard && (
            <div className={styles.lessonControls}>
              <div
                className={styles.childTabs}
                role="tablist"
                aria-label={isEnglish ? 'Children' : 'Dzieci'}
              >
                {children.map((child) => {
                  const childAge = wardAge(child.birthDate);
                  const childAvatar = child.id
                    ? getAvatar('other', wardAvatarSubject(child.id))
                    : null;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      role="tab"
                      aria-selected={child.id === selectedWard.id}
                      className={styles.childTab}
                      onClick={() => navigate('lessons', child.id)}
                    >
                      <span className={styles.childInitial}>
                        {childAvatar ? (
                          <img src={childAvatar} alt="" />
                        ) : (
                          child.name.trim().charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className={styles.childIdentity}>
                        <strong>{child.name}</strong>
                        {childAge !== null && (
                          <small>{formatAge(childAge, isEnglish)}</small>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                className={styles.modeSwitch}
                role="radiogroup"
                aria-label={isEnglish ? 'Mode' : 'Tryb'}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={lessonMode === 'preview'}
                  onClick={() => setLessonMode('preview')}
                >
                  <Eye size={15} aria-hidden />
                  {isEnglish ? 'Preview' : 'Podgląd'}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={lessonMode === 'edit'}
                  onClick={() => setLessonMode('edit')}
                >
                  <Pencil size={15} aria-hidden />
                  {isEnglish ? 'Edit' : 'Edycja'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className={styles.plan}>
          {tab === 'lessons' ? (
            <LessonPlans
              wards={wards}
              isLoading={isLoadingWards}
              loadError={wardsError}
              isEnglish={isEnglish}
              selectedWardId={selectedWardId}
              selectedWardAvatar={
                selectedWard?.id
                  ? getAvatar('other', wardAvatarSubject(selectedWard.id))
                  : null
              }
              mode={lessonMode}
              onModeChange={setLessonMode}
              onSave={saveWard}
            />
          ) : (
            <DayPlanPanel
              events={query.data ?? []}
              selectedDates={selectedDates}
              planWidth={1200}
              onDatesChange={(dates) => setSelectedDates(new Set(dates))}
              onEventsUpdated={() => void refetch()}
              onChangeWidth={() => undefined}
              saveRedirectPath={redirectPath}
              showWidthControls={false}
              modalEventEditor
              initialRange="week"
              monthWeekColumns
              allowPastNavigation
              onVisibleRangeChange={loadVisibleRange}
            />
          )}
        </div>
      </main>
    </DashboardPageContext.Provider>
  );
}
