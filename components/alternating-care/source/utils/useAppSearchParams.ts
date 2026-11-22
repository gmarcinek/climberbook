import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { SupportedLanguages } from './lang';
import { useUpdateQueryParam } from './useUpdateQueryParam';

export const useAppSearchParams = () => {
  const searchParams = useSearchParams();
  const updateQueryParam = useUpdateQueryParam();

  const api = useMemo(() => {
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const groupId = searchParams.get('groupId') ?? '';
    const lng = searchParams.get('lang') as SupportedLanguages;
    const lang = [...Object.keys(SupportedLanguages)].includes(lng)
      ? lng
      : SupportedLanguages.Pl;

    return {
      startDate,
      endDate,
      groupId,
      searchParams,
      lang,
      updateQueryParam,
    };
  }, [searchParams, updateQueryParam]);

  return {
    ...api,
  };
};
