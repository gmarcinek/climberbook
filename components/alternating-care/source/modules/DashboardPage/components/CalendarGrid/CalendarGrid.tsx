'use client';

import { CalendarEvent } from '@api/db/types';
import { Calendar } from '@components/Calendar/Calendar';
import {
  dateFormat,
  normalizeCalendarRange,
} from '@components/Calendar/Calendar.helpers';
import { useVirtualizer } from '@tanstack/react-virtual';
import { generateAbsArray } from '@utils/array';
import { cssZoom } from '@utils/cssZoom';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { CalendarPointerHandlers } from '../Dashboard/useSelection';
import styles from './CalendarGrid.module.scss';

interface CalendarGridProps {
  data: CalendarEvent[];
  isAlternatingVisible: boolean;
  isOtherCareVisible: boolean;
  isEventsVisible: boolean;
  isMultiSelectionMode: boolean;
  handlers: CalendarPointerHandlers;
  selection: Set<string>;
  onMonthVisible: (
    date: string,
    ignoreBounds?: boolean
  ) => Promise<CalendarEvent[] | void>;
}

const MONTHS_BEFORE = 6;
// Start month, the visible months and 6 more below the viewport.
const INITIAL_MONTH_COUNT = MONTHS_BEFORE + 8;
const MONTHS_PER_LOAD = 6;
const EDGE_THRESHOLD = 1200;
const SCROLL_IDLE_DELAY = 200;
const DESKTOP_MONTH_MIN_WIDTH = 360;
const DESKTOP_MONTH_GAP = 24;
const DESKTOP_MONTH_MAX_COLUMNS = 5;

// Height of a month card: heading plus one row per calendar week (Monday-first).
const estimateMonthHeight = (month: string) => {
  const date = dayjs(month);
  const firstDayOffset = (date.startOf('month').day() + 6) % 7;
  const weeks = Math.ceil((firstDayOffset + date.daysInMonth()) / 7);
  return 54 + weeks * 52;
};

export const CalendarGrid = (props: CalendarGridProps) => {
  const {
    data,
    isAlternatingVisible,
    isOtherCareVisible,
    isMultiSelectionMode,
    selection,
    handlers,
    onMonthVisible,
    isEventsVisible,
  } = props;

  const { startDate, endDate } = useAppSearchParams();
  const startingDate = dayjs(startDate).format(dateFormat);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const gridLength = normalizeCalendarRange(startDate, endDate).monthCount;
  const [mobileMonthStart, setMobileMonthStart] = useState(-MONTHS_BEFORE);
  const [mobileMonthCount, setMobileMonthCount] = useState(INITIAL_MONTH_COUNT);
  const [mobileMonthsAnchor, setMobileMonthsAnchor] = useState(startingDate);
  const pendingLoad = useRef(false);
  const prependAnchor = useRef<{ month: string; top: number } | null>(null);
  const positionedFor = useRef<string | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState<number | null>(null);
  // Height of the sticky tab bar covering the top of the scroll container.
  const [stickyOffset, setStickyOffset] = useState(0);
  const [desktopColumnCount, setDesktopColumnCount] = useState(1);
  const autoExtendedRange = useRef(false);
  const router = useRouter();

  const months = useMemo(
    () =>
      generateAbsArray(gridLength).map((_, index) =>
        dayjs(startingDate)
          .add(index, 'month')
          .startOf('month')
          .format(dateFormat)
      ),
    [gridLength, startingDate]
  );
  const mobileMonths = useMemo(
    () =>
      generateAbsArray(mobileMonthCount).map((_, index) =>
        dayjs(startingDate)
          .add(mobileMonthStart + index, 'month')
          .startOf('month')
          .format(dateFormat)
      ),
    [mobileMonthCount, mobileMonthStart, startingDate]
  );
  const visibleMonths = isMobileViewport ? mobileMonths : months;

  const rowVirtualizer = useVirtualizer({
    enabled: isMobileViewport && scrollElement !== null,
    count: mobileMonths.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => estimateMonthHeight(mobileMonths[index]),
    overscan: 2,
    scrollMargin: scrollMargin ?? 0,
    scrollPaddingStart: stickyOffset,
    getItemKey: (index) => mobileMonths[index],
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  if (mobileMonthsAnchor !== startingDate) {
    setMobileMonthsAnchor(startingDate);
    setMobileMonthStart(-MONTHS_BEFORE);
    setMobileMonthCount(INITIAL_MONTH_COUNT);
  }

  useEffect(() => {
    setScrollElement(
      calendarGridRef.current?.closest<HTMLElement>('[data-scroll-viewport]') ??
        null
    );
  }, []);

  useLayoutEffect(() => {
    if (isMobileViewport) return;
    const grid = calendarGridRef.current;
    const container = grid?.parentElement;
    if (!container) return;

    const updateColumns = () => {
      const availableWidth =
        container.getBoundingClientRect().width / cssZoom(container);
      const columns = Math.max(
        1,
        Math.min(
          DESKTOP_MONTH_MAX_COLUMNS,
          Math.floor(
            (availableWidth + DESKTOP_MONTH_GAP) /
              (DESKTOP_MONTH_MIN_WIDTH + DESKTOP_MONTH_GAP)
          )
        )
      );
      setDesktopColumnCount((current) =>
        current === columns ? current : columns
      );
    };

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport || !startDate || !endDate) return;
    const monthCount = normalizeCalendarRange(startDate, endDate).monthCount;
    const shouldExtend = desktopColumnCount === DESKTOP_MONTH_MAX_COLUMNS;
    if (shouldExtend && monthCount === 12) {
      autoExtendedRange.current = true;
      const params = new URLSearchParams(window.location.search);
      params.set(
        'endDate',
        dayjs(startDate)
          .add(14, 'month')
          .endOf('month')
          .format(dateFormat)
      );
      router.replace(`${window.location.pathname}?${params.toString()}`);
    } else if (!shouldExtend && autoExtendedRange.current && monthCount === 15) {
      autoExtendedRange.current = false;
      const params = new URLSearchParams(window.location.search);
      params.set(
        'endDate',
        dayjs(startDate)
          .add(11, 'month')
          .endOf('month')
          .format(dateFormat)
      );
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [
    desktopColumnCount,
    endDate,
    isMobileViewport,
    router,
    startDate,
  ]);

  // Offset of the grid inside the scroll container (content rendered above it).
  useLayoutEffect(() => {
    const grid = calendarGridRef.current;
    if (!grid || !scrollElement || !isMobileViewport) return;
    const updateMargin = () => {
      const margin =
        grid.getBoundingClientRect().top -
        scrollElement.getBoundingClientRect().top +
        scrollElement.scrollTop;
      setScrollMargin((current) =>
        current !== null && Math.abs(current - margin) < 1 ? current : margin
      );
      const stickyHeader = Array.from(
        scrollElement.querySelectorAll<HTMLElement>('nav')
      ).find((node) => getComputedStyle(node).position === 'sticky');
      setStickyOffset(stickyHeader?.offsetHeight ?? 0);
    };
    updateMargin();
    const observer = new ResizeObserver(updateMargin);
    if (scrollElement.firstElementChild) {
      observer.observe(scrollElement.firstElementChild);
    }
    return () => observer.disconnect();
  }, [isMobileViewport, scrollElement]);

  // Loads months intersecting the scroll viewport plus one buffer month on each side.
  const loadViewportMonths = useCallback(() => {
    const grid = calendarGridRef.current;
    if (!grid || !scrollElement) return;
    const viewport = scrollElement.getBoundingClientRect();
    const visible = Array.from(
      grid.querySelectorAll<HTMLElement>('[data-care-month]')
    )
      .filter((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.bottom > viewport.top && bounds.top < viewport.bottom;
      })
      .map((node) => node.dataset.careMonth ?? '')
      .filter(Boolean)
      .sort();
    if (visible.length === 0) return;

    const last = dayjs(visible[visible.length - 1]).add(1, 'month');
    for (
      let month = dayjs(visible[0]).subtract(1, 'month');
      !month.isAfter(last);
      month = month.add(1, 'month')
    ) {
      onMonthVisible(month.format(dateFormat), true)?.catch(() => undefined);
    }
  }, [onMonthVisible, scrollElement]);

  useEffect(() => {
    if (!isMobileViewport || !scrollElement) return;
    const timer = window.setTimeout(loadViewportMonths, 150);
    return () => window.clearTimeout(timer);
  }, [
    isMobileViewport,
    loadViewportMonths,
    mobileMonthCount,
    mobileMonthStart,
    scrollElement,
  ]);

  // Initial position: the current month (or the URL start month when the
  // current month is outside the list) starts right below the sticky tabs.
  useLayoutEffect(() => {
    if (!isMobileViewport || !scrollElement || scrollMargin === null) return;
    if (positionedFor.current === startingDate) return;
    positionedFor.current = startingDate;
    prependAnchor.current = null;
    const currentMonthIndex = mobileMonths.indexOf(
      dayjs().startOf('month').format(dateFormat)
    );
    const targetIndex =
      currentMonthIndex >= 0 ? currentMonthIndex : -mobileMonthStart;
    scrollElement.scrollTop =
      scrollMargin -
      stickyOffset +
      mobileMonths
        .slice(0, targetIndex)
        .reduce((sum, month) => sum + estimateMonthHeight(month), 0);
    rowVirtualizer.scrollToIndex(targetIndex, { align: 'start' });
  }, [
    isMobileViewport,
    mobileMonthStart,
    mobileMonths,
    rowVirtualizer,
    scrollElement,
    scrollMargin,
    startingDate,
    stickyOffset,
  ]);

  useEffect(() => {
    if (!isMobileViewport || !scrollElement) return;

    let loadTimer = 0;
    let extendTimer = 0;
    const scheduleLoad = () => {
      window.clearTimeout(loadTimer);
      loadTimer = window.setTimeout(loadViewportMonths, 120);
    };

    // Months are added only once scrolling has stopped near an edge, so the
    // list never changes under an active (momentum) scroll.
    const extendMonths = () => {
      if (pendingLoad.current) return;
      const distanceFromBottom =
        scrollElement.scrollHeight -
        scrollElement.clientHeight -
        scrollElement.scrollTop;

      if (scrollElement.scrollTop < EDGE_THRESHOLD) {
        const viewportTop = scrollElement.getBoundingClientRect().top;
        const anchor = Array.from(
          scrollElement.querySelectorAll<HTMLElement>('[data-care-month]')
        )
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top
          )
          .find((node) => node.getBoundingClientRect().bottom > viewportTop);
        if (!anchor?.dataset.careMonth) return;
        pendingLoad.current = true;
        prependAnchor.current = {
          month: anchor.dataset.careMonth,
          top: anchor.getBoundingClientRect().top - viewportTop,
        };
        setMobileMonthStart((start) => start - MONTHS_PER_LOAD);
        setMobileMonthCount((count) => count + MONTHS_PER_LOAD);
        return;
      }

      if (distanceFromBottom < EDGE_THRESHOLD) {
        pendingLoad.current = true;
        setMobileMonthCount((count) => count + MONTHS_PER_LOAD);
      }
    };

    const handleScroll = () => {
      scheduleLoad();
      window.clearTimeout(extendTimer);
      extendTimer = window.setTimeout(extendMonths, SCROLL_IDLE_DELAY);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    scheduleLoad();
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(extendTimer);
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [isMobileViewport, loadViewportMonths, scrollElement, startingDate]);

  // Keep the first visible month exactly where it was after months are
  // prepended above it (first from virtualizer offsets, then from the DOM once
  // the new rows are measured).
  useLayoutEffect(() => {
    const anchor = prependAnchor.current;
    if (scrollElement && anchor) {
      prependAnchor.current = null;
      const index = mobileMonths.indexOf(anchor.month);
      const item = rowVirtualizer.measurementsCache[index];
      if (item) scrollElement.scrollTop = item.start - anchor.top;

      const alignToAnchor = () => {
        const node = scrollElement.querySelector<HTMLElement>(
          `[data-care-month="${anchor.month}"]`
        );
        if (!node) return;
        const top =
          node.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top;
        if (Math.abs(top - anchor.top) >= 1) {
          scrollElement.scrollTop += top - anchor.top;
        }
      };
      let frame = requestAnimationFrame(() => {
        alignToAnchor();
        frame = requestAnimationFrame(() => {
          alignToAnchor();
          pendingLoad.current = false;
        });
      });
      return () => {
        cancelAnimationFrame(frame);
        pendingLoad.current = false;
      };
    }
    pendingLoad.current = false;
  }, [mobileMonthCount, mobileMonthStart, scrollElement]);

  useEffect(() => {
    const grid = calendarGridRef.current;
    if (!grid || isMobileViewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const date = (entry.target as HTMLElement).dataset.careMonth;
          if (date) void onMonthVisible(date);
        });
      },
      { rootMargin: '0px' }
    );

    grid.querySelectorAll('[data-care-month]').forEach((node) => {
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [isMobileViewport, visibleMonths, onMonthVisible]);

  const renderCalendar = (month: string, index: number) => (
    <div
      className={styles.calendarSlot}
      key={`month-plan-view-${index}-${month}`}
      data-care-month={month}
    >
      <Calendar
        className={styles.calendar}
        startDate={month}
        endDate={dayjs(month).endOf('month').add(1, 'day').format(dateFormat)}
        rowSize={7}
        isTodayVisible
        isWeekendsVisible
        isPlanVisible={false}
        isAlternatingVisible={isAlternatingVisible}
        isOtherCareVisible={isOtherCareVisible}
        isEventsVisible={isEventsVisible}
        displayStrategy='separateMonths'
        events={data}
        {...handlers}
        selection={Array.from(selection)}
        isMultiSelectionMode={isMultiSelectionMode}
      />
    </div>
  );

  if (!isMobileViewport) {
    return (
      <div
        className={styles.calendarGrid}
        ref={calendarGridRef}
        style={
          {
            '--desktop-calendar-columns': desktopColumnCount,
          } as CSSProperties
        }
      >
        {months.map(renderCalendar)}
      </div>
    );
  }

  return (
    <div
      className={styles.virtualCalendarGrid}
      ref={calendarGridRef}
      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
    >
      {virtualItems.map((item) => (
        <div
          key={item.key}
          ref={rowVirtualizer.measureElement}
          data-index={item.index}
          className={styles.virtualCalendarRow}
          style={{
            transform: `translateY(${item.start - (scrollMargin ?? 0)}px)`,
          }}
        >
          {renderCalendar(mobileMonths[item.index], item.index)}
        </div>
      ))}
    </div>
  );
};
