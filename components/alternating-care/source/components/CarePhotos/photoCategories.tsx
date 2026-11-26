'use client';

import { CalendarEventType } from '@api/db/types';
import { dashboardEventFormI18n } from '@modules/DashboardPage/components/DashboardEventForm/dashboardEventForm.i18n';
import { getEventTypeColor } from '@modules/DashboardPage/components/DashboardEventForm/eventTypeColors';
import { getEventTypeIcon } from '@utils/eventTypeIcons';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { IconType } from 'react-icons';
import {
  MdChildCare,
  MdDescription,
  MdFamilyRestroom,
  MdReceipt,
  MdReceiptLong,
  MdTaskAlt,
  MdVolunteerActivism,
} from 'react-icons/md';
import styles from './carePhotos.module.scss';

type PhotoCategory = {
  id: string;
  label: { pl: string; en: string };
  icon: IconType;
  color: string;
};

// Shown first: what the photo is about, then documents.
const PRIMARY_CATEGORIES: PhotoCategory[] = [
  { id: 'WITH_WARD', label: { pl: 'Z podopiecznym', en: 'With ward' }, icon: MdFamilyRestroom, color: '#8E24AA' },
  { id: 'WARD', label: { pl: 'Podopieczny', en: 'Ward' }, icon: MdChildCare, color: '#EC407A' },
  { id: 'CARE', label: { pl: 'Opieka', en: 'Care' }, icon: MdVolunteerActivism, color: '#2d6f8d' },
  { id: 'RECEIPT', label: { pl: 'Paragon', en: 'Receipt' }, icon: MdReceipt, color: '#2E7D32' },
  { id: 'INVOICE', label: { pl: 'Faktura', en: 'Invoice' }, icon: MdDescription, color: '#1565C0' },
  { id: 'BILL', label: { pl: 'Rachunek', en: 'Bill' }, icon: MdReceiptLong, color: '#6D4C41' },
  { id: 'PAYMENT_PROOF', label: { pl: 'Dowód zapłaty', en: 'Proof of payment' }, icon: MdTaskAlt, color: '#00897B' },
];

const EVENT_CATEGORIES: PhotoCategory[] = Object.values(CalendarEventType)
  .filter(
    (type) =>
      type !== CalendarEventType.Offset &&
      type !== CalendarEventType.Alternating &&
      type !== CalendarEventType.Todo,
  )
  .map((type) => ({
    id: type,
    label: {
      pl: dashboardEventFormI18n.pl[type as keyof typeof dashboardEventFormI18n.pl] ?? type,
      en: dashboardEventFormI18n.en[type as keyof typeof dashboardEventFormI18n.en] ?? type,
    },
    icon: getEventTypeIcon(type),
    color: getEventTypeColor(type),
  }));

const ALL_CATEGORIES = [...PRIMARY_CATEGORIES, ...EVENT_CATEGORIES];

export const getPhotoCategory = (id: string) =>
  ALL_CATEGORIES.find((category) => category.id === id);

// A photo can have several types, stored as "WITH_WARD,RECEIPT".
export const parsePhotoCategories = (value: string | null | undefined) =>
  (value ?? '').split(',').filter(Boolean);

export const photoCategoryLabel = (value: string, language: string) =>
  parsePhotoCategories(value)
    .map((id) => getPhotoCategory(id)?.label[language === 'en' ? 'en' : 'pl'])
    .filter(Boolean)
    .join(', ');

const CategoryTile = ({
  category,
  isSelected,
  language,
  onClick,
}: {
  category: PhotoCategory;
  isSelected: boolean;
  language: string;
  onClick: () => void;
}) => {
  const Icon = category.icon;
  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={isSelected}
      className={styles.categoryTile}
      style={{ '--category-color': category.color } as CSSProperties}
      onClick={onClick}
    >
      <Icon size={15} aria-hidden />
      {category.label[language === 'en' ? 'en' : 'pl']}
    </button>
  );
};

export const PhotoCategoryPicker = ({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
}) => {
  const selected = parsePhotoCategories(value);
  const isEnglish = language === 'en';
  // Collapsed on phones (CSS); desktop always shows all tiles.
  const [isOpen, setIsOpen] = useState(false);
  const toggle = (id: string) =>
    onChange(
      (selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id]
      ).join(','),
    );

  return (
    <div className={`${styles.field} ${styles.categoryField}`} data-open={isOpen}>
      <span className={styles.categoryLabel}>
        {isEnglish ? 'Types (several allowed)' : 'Typy (można kilka)'}
      </span>
      <button
        type='button'
        className={styles.categoryToggle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          {isEnglish ? 'Types' : 'Typy'}
          {selected.length > 0 && (
            <small>
              {selected.map((id) => photoCategoryLabel(id, language)).join(', ')}
            </small>
          )}
        </span>
        <ChevronDown size={15} aria-hidden />
      </button>
      <div className={styles.categoryGrid} role='group' aria-label={isEnglish ? 'Photo types' : 'Typy zdjęcia'}>
        {PRIMARY_CATEGORIES.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            isSelected={selected.includes(category.id)}
            language={language}
            onClick={() => toggle(category.id)}
          />
        ))}
        {EVENT_CATEGORIES.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            isSelected={selected.includes(category.id)}
            language={language}
            onClick={() => toggle(category.id)}
          />
        ))}
      </div>
    </div>
  );
};
