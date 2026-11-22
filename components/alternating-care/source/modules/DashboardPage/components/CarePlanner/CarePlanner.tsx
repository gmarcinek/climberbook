'use client';

import { useAppContext } from '@app/AppContext';
import { useOtherParent } from '@utils/useOtherParent';
import dayjs from 'dayjs';
import { CalendarRange, GripVertical, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CarePlanner.module.scss';

type Caregiver = {
  id?: string;
  subjectId: string;
  name: string;
  role: string;
};

type Phase = {
  caregiverId: string;
  days: number;
};

interface CarePlannerProps {
  onClose: () => void;
  onSaved: () => Promise<unknown> | void;
}

export function CarePlanner({
  onClose,
  onSaved,
}: CarePlannerProps) {
  const { user, language } = useAppContext();
  const { profile: otherParent } = useOtherParent();
  const isEnglish = language === 'en';
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(
    dayjs().add(12, 'month').format('YYYY-MM-DD')
  );
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch('/api/alternating-care/caregivers').then(async (response) => {
        const text = await response.text();
        if (!response.ok) throw new Error('Nie udało się pobrać opiekunów.');
        try {
          return JSON.parse(text) as { caregivers?: Caregiver[] };
        } catch {
          throw new Error(`Błąd opiekunów (${response.status}).`);
        }
      }),
      fetch('/api/alternating-care/plan').then(async (response) => {
        const text = await response.text();
        if (!response.ok) throw new Error('Nie udało się pobrać planu.');
        try {
          return JSON.parse(text) as {
            plan?: { startDate: string; endDate: string; phases: Phase[] } | null;
          };
        } catch {
          throw new Error(`Błąd planu (${response.status}).`);
        }
      }),
    ])
      .then(([caregiverData, planData]) => {
        const saved = caregiverData.caregivers ?? [];
        const available: Caregiver[] = [
          {
            subjectId: `self:${user.id}`,
            name: user.name,
            role:
              saved.find((item) => item.subjectId === `self:${user.id}`)?.role ||
              'tata',
          },
          {
            subjectId: `other:${otherParent.userId || 'manual'}`,
            name: otherParent.name || (isEnglish ? 'Other parent' : 'Drugi rodzic'),
            role:
              saved.find(
                (item) =>
                  item.subjectId === `other:${otherParent.userId || 'manual'}`
              )?.role || 'mama',
          },
          ...saved.filter(
            (item) =>
              item.subjectId !== `self:${user.id}` &&
              item.subjectId !== `other:${otherParent.userId || 'manual'}`
          ),
        ];
        setCaregivers(available);
        if (planData.plan) {
          setStartDate(planData.plan.startDate);
          setEndDate(planData.plan.endDate);
          setPhases(planData.plan.phases);
        } else {
          setPhases(
            available.slice(0, 2).map((caregiver) => ({
              caregiverId: caregiver.subjectId,
              days: 14,
            }))
          );
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Błąd ładowania planu.')
      );
  }, [isEnglish, otherParent.name, otherParent.userId, user.id, user.name]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isSaving, onClose]);

  const cycleDays = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.days, 0),
    [phases]
  );
  const projectedCycles = useMemo(() => {
    if (!phases.length || cycleDays <= 0) return [];
    return Array.from({ length: 3 }, (_, cycleIndex) => {
      let cursor = dayjs(startDate).add(cycleIndex * cycleDays, 'day');
      return phases.map((phase) => {
        const caregiver = caregivers.find(
          (item) => item.subjectId === phase.caregiverId
        );
        const item = {
          ...phase,
          caregiver,
          start: cursor,
          end: cursor.add(phase.days - 1, 'day'),
        };
        cursor = cursor.add(phase.days, 'day');
        return item;
      });
    });
  }, [caregivers, cycleDays, phases, startDate]);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/alternating-care/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, phases }),
      });
      if (!response.ok) {
        const text = await response.text();
        let data: { error?: string } | null = null;
        try {
          data = text ? (JSON.parse(text) as { error?: string }) : null;
        } catch {
          throw new Error(
            `Błąd zapisu planu (${response.status}): ${text.slice(0, 160)}`
          );
        }
        throw new Error(data?.error || `Błąd zapisu planu (${response.status}).`);
      }
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Błąd zapisu planu.');
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} role='presentation' onMouseDown={onClose}>
      <section
        className={styles.modal}
        role='dialog'
        aria-modal='true'
        aria-labelledby='care-planner-title'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerIcon}><CalendarRange size={23} /></div>
          <div>
            <span>{isEnglish ? 'Care operations' : 'Planowanie opieki'}</span>
            <h2 id='care-planner-title'>
              {isEnglish ? 'Care plan' : 'Plan opieki'}
            </h2>
            <p>
              {isEnglish
                ? 'Define the recurring order and duration of care periods.'
                : 'Ustal kolejność opiekunów i długość kolejnych okresów opieki.'}
            </p>
          </div>
          <button type='button' className={styles.close} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.summaryPanel}>
            <div className={styles.summaryHeading}>
              <Users size={18} />
              <strong>{isEnglish ? 'Plan overview' : 'Podsumowanie planu'}</strong>
            </div>
            <div className={styles.metricGrid}>
              <div><span>{isEnglish ? 'Caregivers' : 'Opiekunowie'}</span><strong>{new Set(phases.map((p) => p.caregiverId)).size}</strong></div>
              <div><span>{isEnglish ? 'Cycle' : 'Cykl'}</span><strong>{cycleDays} dni</strong></div>
              <div><span>{isEnglish ? 'Range' : 'Zakres'}</span><strong>{Math.max(0, dayjs(endDate).diff(dayjs(startDate), 'day') + 1)} dni</strong></div>
            </div>
            <div className={styles.rangeFields}>
              <label>
                <span>{isEnglish ? 'Starts' : 'Początek'}</span>
                <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                <span>{isEnglish ? 'Ends' : 'Koniec'}</span>
                <input type='date' min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
          </aside>

          <main className={styles.phasesPanel}>
            <div className={styles.sectionHeading}>
              <div><span>{isEnglish ? 'Recurring cycle' : 'Cykl powtarzalny'}</span><h3>{isEnglish ? 'Who cares after whom?' : 'Kto po kim sprawuje opiekę?'}</h3></div>
              <button type='button' onClick={() => setPhases((current) => [...current, { caregiverId: caregivers[0]?.subjectId ?? '', days: 7 }])}>
                <Plus size={16} /> {isEnglish ? 'Add stage' : 'Dodaj etap'}
              </button>
            </div>
            <div className={styles.phaseList}>
              {phases.map((phase, index) => (
                <div className={styles.phase} key={`${index}-${phase.caregiverId}`}>
                  <GripVertical size={18} className={styles.dragHandle} />
                  <span className={styles.phaseNumber}>{index + 1}</span>
                  <label className={styles.phaseCaregiver}>
                    <span>{isEnglish ? 'Caregiver' : 'Opiekun'}</span>
                    <select value={phase.caregiverId} onChange={(e) => setPhases((current) => current.map((item, i) => i === index ? { ...item, caregiverId: e.target.value } : item))}>
                      {caregivers.map((caregiver) => (
                        <option key={caregiver.subjectId} value={caregiver.subjectId}>{caregiver.name} · {caregiver.role}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.phaseDays}>
                    <span>{isEnglish ? 'Days' : 'Dni'}</span>
                    <input type='number' min={1} max={31} value={phase.days} onChange={(e) => setPhases((current) => current.map((item, i) => i === index ? { ...item, days: Math.max(1, Number(e.target.value) || 1) } : item))} />
                  </label>
                  <button type='button' className={styles.removePhase} disabled={phases.length === 1} onClick={() => setPhases((current) => current.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className={styles.previewSection}>
              <span>{isEnglish ? 'Projected cycles' : 'Projekcja kolejnych cykli'}</span>
              {projectedCycles.map((cycle, cycleIndex) => (
                <div className={styles.cyclePreview} key={cycleIndex}>
                  <small>{isEnglish ? 'Cycle' : 'Cykl'} {cycleIndex + 1}</small>
                  <div className={styles.timeline}>
                    {cycle.map((item, index) => (
                      <div className={styles.timelineItem} key={`${item.caregiverId}-${index}`} style={{ flex: item.days }}>
                        <strong>{item.caregiver?.name ?? '—'}</strong>
                        <span>{item.start.format('DD MMM')}–{item.end.format('DD MMM')}</span>
                        <small>{item.days} dni</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </main>
        </div>

        <footer className={styles.footer}>
          <span>
            {isEnglish
              ? 'The plan is applied only to the selected date range.'
              : 'Plan zostanie zastosowany tylko w wybranym zakresie dat.'}
          </span>
          <div>
            <button type='button' className={styles.cancel} onClick={onClose} disabled={isSaving}>{isEnglish ? 'Cancel' : 'Anuluj'}</button>
            <button type='button' className={styles.save} onClick={() => void save()} disabled={isSaving || !phases.length}>
              {isSaving ? 'Zapisywanie…' : isEnglish ? 'Save and apply plan' : 'Zapisz i zastosuj plan'}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}
