import { createContext, useContext } from 'react';

export enum DashboardModeType {
  Plan = 'PLAN',
  Calendar = 'PLAN',
}
export enum DashboardRangeType {
  Day = 'DAY',
  Week = 'WEEK',
  TwoWeeks = 'TWO_WEEKS',
  ThreeWeeks = 'THREE_WEEKS',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Year = 'YEAR',
}

export interface DashboardPageContextData {
  updateAllEvents?: () => Promise<unknown>;
}

export const DashboardPageContext = createContext<DashboardPageContextData>({});

export const useDashboardPageContext = () => {
  const cashboardContextData = useContext(DashboardPageContext);
  return cashboardContextData;
};
