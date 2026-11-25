'use client';

import { FullScreenDayPlanPage } from '@modules/DashboardPage/FullScreenDayPlanPage';
import { Suspense } from 'react';

export default function AlternatingCareDayPlanRoute() {
  return (
    <Suspense fallback={null}>
      <FullScreenDayPlanPage />
    </Suspense>
  );
}
