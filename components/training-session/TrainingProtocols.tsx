import {
  NumericStepperControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import { formLayoutClassNames } from "@/components/climberbook/common/FormLayout";
import styles from "@/components/training-calendar/TrainingSidebar.module.css";
import type { TrainingDraftValues } from "./types";
import { adjustEdgeDepthValue, adjustLoadDeloadValue, adjustSeriesValue } from "./training-session.utils";

type Props = { draft: TrainingDraftValues; onDraftChange: (draft: TrainingDraftValues) => void };

type NumericProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  ariaLabel: string;
  min: string;
  suffix?: string;
  className?: string;
};

function NumericField({ label, value, onChange, onDecrement, onIncrement, ariaLabel, min, suffix, className }: NumericProps) {
  return (
    <label className={[styles.trainingSidebar__field, className].filter(Boolean).join(" ")}>
      {label}
      <NumericStepperControl
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
        decrementAriaLabel={`Odejmij ${ariaLabel}`}
        incrementAriaLabel={`Dodaj ${ariaLabel}`}
        inputProps={{ type: "number", min, max: min === "-200" ? "200" : undefined, step: "1" }}
        inputSuffix={suffix}
        className={styles.trainingSidebar__controlGroup}
      />
    </label>
  );
}

export function TrainingProtocols({ draft, onDraftChange }: Props) {
  const update = (protocol: TrainingDraftValues["protocol"]) => onDraftChange({ ...draft, protocol });
  const protocolHeadingClassName = [styles.trainingSidebar__protocolHeading, formLayoutClassNames.fullSpan].join(" ");
  const updatePullUp = (index: number, changes: Partial<TrainingDraftValues["protocol"]["pullUp"][number]>) =>
    update({ ...draft.protocol, pullUp: draft.protocol.pullUp.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) });
  const updateHangboard = (index: number, changes: Partial<TrainingDraftValues["protocol"]["hangboard"][number]>) =>
    update({ ...draft.protocol, hangboard: draft.protocol.hangboard.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) });

  if (!draft.surfaces.some((surface) => ["drazek", "chwytotablica", "spraywall"].includes(surface))) return null;

  return (
    <div className={styles.trainingSidebar__protocolStacks}>
      {draft.surfaces.includes("drazek") && (
        <div className={styles.trainingSidebar__protocolStack}>
          <strong className={protocolHeadingClassName}>Protokół - Drążek</strong>
          {draft.protocol.pullUp.map((set, index) => {
            const series = String.fromCharCode(65 + index);
            return <div key={`pull-up-${index}`} className={styles.trainingSidebar__protocolSeries}>
              <strong className={protocolHeadingClassName}>Seria {series}</strong>
              <NumericField label="Ilość takich serii" value={set.sets} onChange={(value) => updatePullUp(index, { sets: value })} onDecrement={() => updatePullUp(index, { sets: adjustSeriesValue(set.sets, -1) })} onIncrement={() => updatePullUp(index, { sets: adjustSeriesValue(set.sets, 1) })} ariaLabel={`serię ${series}`} min="1" className={styles.trainingSidebar__pullUpSets} />
              <NumericField label="Powtórzenia w serii" value={set.repetitions} onChange={(value) => updatePullUp(index, { repetitions: value })} onDecrement={() => updatePullUp(index, { repetitions: adjustSeriesValue(set.repetitions, -1) })} onIncrement={() => updatePullUp(index, { repetitions: adjustSeriesValue(set.repetitions, 1) })} ariaLabel={`powtórzenie w serii ${series} drążka`} min="1" className={styles.trainingSidebar__pullUpRepetitions} />
              <label className={`${styles.trainingSidebar__field} ${styles.trainingSidebar__pullUpOneRepMax}`}>Maks. 1 powtórzenie<Select value={set.isOneRepMax} onChange={(event) => updatePullUp(index, { isOneRepMax: event.target.value as "tak" | "nie" })} className={styles.trainingSidebar__input}><option value="nie">Nie</option><option value="tak">Tak</option></Select></label>
              <NumericField label="Load / deload (kg)" value={set.loadDeloadKg} onChange={(value) => updatePullUp(index, { loadDeloadKg: value })} onDecrement={() => updatePullUp(index, { loadDeloadKg: adjustLoadDeloadValue(set.loadDeloadKg, -1) })} onIncrement={() => updatePullUp(index, { loadDeloadKg: adjustLoadDeloadValue(set.loadDeloadKg, 1) })} ariaLabel={`1 kg w serii ${series} drążka`} min="-200" suffix="kg" className={styles.trainingSidebar__pullUpLoad} />
              {draft.protocol.pullUp.length > 1 && <button type="button" aria-label={`Usuń serię ${series} drążka`} onClick={() => update({ ...draft.protocol, pullUp: draft.protocol.pullUp.filter((_item, itemIndex) => itemIndex !== index) })} className={styles.trainingSidebar__protocolRemoveButton}>Usuń serię</button>}
            </div>;
          })}
          <button type="button" aria-label="Dodaj serię drążka" title="Dodaj serię" onClick={() => update({ ...draft.protocol, pullUp: [...draft.protocol.pullUp, { sets: "1", repetitions: "1", isOneRepMax: "nie", loadDeloadKg: "0" }] })} className={styles.trainingSidebar__protocolAddButton}>+ Seria</button>
        </div>
      )}
      {draft.surfaces.includes("chwytotablica") && (
        <div className={styles.trainingSidebar__protocolStack}>
          <strong className={protocolHeadingClassName}>Protokół - Chwytotablica</strong>
          {draft.protocol.hangboard.map((set, index) => {
            const series = String.fromCharCode(65 + index);
            return <div key={`hangboard-${index}`} className={styles.trainingSidebar__protocolSeries}>
              <strong className={protocolHeadingClassName}>Seria {series}</strong>
              <div className={styles.trainingSidebar__hangboardModeTabs} role="tablist" aria-label={`Tryb serii ${series} chwytotablicy`}>
                {([["hangs", "Zwisy"], ["intervals", "Interwały"]] as const).map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={set.mode === mode} className={`${styles.trainingSidebar__hangboardModeTab} ${set.mode === mode ? styles["trainingSidebar__hangboardModeTab--active"] : ""}`} onClick={() => updateHangboard(index, { mode })}>{label}</button>)}
              </div>
              <NumericField label="Ilość serii" value={set.sets} onChange={(value) => updateHangboard(index, { sets: value })} onDecrement={() => updateHangboard(index, { sets: adjustSeriesValue(set.sets, -1) })} onIncrement={() => updateHangboard(index, { sets: adjustSeriesValue(set.sets, 1) })} ariaLabel={`serię ${series}`} min="1" />
              {set.mode === "hangs" && <label className={styles.trainingSidebar__field}>Maks. 1 powtórzenie<Select value={set.usesRpm} onChange={(event) => updateHangboard(index, { usesRpm: event.target.value as "tak" | "nie" })} className={styles.trainingSidebar__input}><option value="nie">Nie</option><option value="tak">Tak</option></Select></label>}
              {set.mode === "intervals" && <>
                <NumericField label="Czas zwisu (s)" value={set.hangSeconds} onChange={(value) => updateHangboard(index, { hangSeconds: value })} onDecrement={() => updateHangboard(index, { hangSeconds: adjustSeriesValue(set.hangSeconds, -1) })} onIncrement={() => updateHangboard(index, { hangSeconds: adjustSeriesValue(set.hangSeconds, 1) })} ariaLabel={`sekundę zwisu w serii ${series}`} min="1" suffix="s" className={styles.trainingSidebar__intervalHangTime} />
                <NumericField label="Czas odpoczynku (s)" value={set.restSeconds} onChange={(value) => updateHangboard(index, { restSeconds: value })} onDecrement={() => updateHangboard(index, { restSeconds: String(Math.max(0, Number(set.restSeconds) - 1)) })} onIncrement={() => updateHangboard(index, { restSeconds: String((Number(set.restSeconds) || 0) + 1) })} ariaLabel={`sekundę odpoczynku w serii ${series}`} min="0" suffix="s" className={styles.trainingSidebar__intervalRestTime} />
                <NumericField label="Powtórzenia w serii" value={set.repetitions} onChange={(value) => updateHangboard(index, { repetitions: value })} onDecrement={() => updateHangboard(index, { repetitions: adjustSeriesValue(set.repetitions, -1) })} onIncrement={() => updateHangboard(index, { repetitions: adjustSeriesValue(set.repetitions, 1) })} ariaLabel={`powtórzenie w serii ${series} chwytotablicy`} min="1" />
              </>}
              <NumericField label="Load / deload (kg)" value={set.loadDeloadKg} onChange={(value) => updateHangboard(index, { loadDeloadKg: value })} onDecrement={() => updateHangboard(index, { loadDeloadKg: adjustLoadDeloadValue(set.loadDeloadKg, -1) })} onIncrement={() => updateHangboard(index, { loadDeloadKg: adjustLoadDeloadValue(set.loadDeloadKg, 1) })} ariaLabel={`1 kg w serii ${series} chwytotablicy`} min="-200" suffix="kg" />
              <NumericField label="Głębokość krawądki (mm)" value={set.edgeDepthMm} onChange={(value) => updateHangboard(index, { edgeDepthMm: value })} onDecrement={() => updateHangboard(index, { edgeDepthMm: adjustEdgeDepthValue(set.edgeDepthMm, -1) })} onIncrement={() => updateHangboard(index, { edgeDepthMm: adjustEdgeDepthValue(set.edgeDepthMm, 1) })} ariaLabel={`1 mm w serii ${series} chwytotablicy`} min="1" suffix="mm" />
              {draft.protocol.hangboard.length > 1 && <button type="button" aria-label={`Usuń serię ${series} chwytotablicy`} onClick={() => update({ ...draft.protocol, hangboard: draft.protocol.hangboard.filter((_item, itemIndex) => itemIndex !== index) })} className={styles.trainingSidebar__protocolRemoveButton}>Usuń serię</button>}
            </div>;
          })}
          <button type="button" aria-label="Dodaj serię chwytotablicy" title="Dodaj serię" onClick={() => update({ ...draft.protocol, hangboard: [...draft.protocol.hangboard, { sets: "1", mode: "hangs", usesRpm: "nie", hangSeconds: "7", restSeconds: "3", repetitions: "6", loadDeloadKg: "0", edgeDepthMm: "20" }] })} className={styles.trainingSidebar__protocolAddButton}>+ Seria</button>
        </div>
      )}
      {draft.surfaces.includes("spraywall") && <SpraywallProtocol draft={draft} onDraftChange={onDraftChange} protocolHeadingClassName={protocolHeadingClassName} />}
    </div>
  );
}

function SpraywallProtocol({ draft, onDraftChange, protocolHeadingClassName }: Props & { protocolHeadingClassName: string }) {
  const options = [
    { value: "soft" as const, name: "Soft", grades: "V1-V3", description: "Regeneracja i spokojna technika." },
    { value: "medium" as const, name: "Medium", grades: "V3-V6", description: "Wytrzymałość i ciągła praca." },
    { value: "hard" as const, name: "Hard", grades: "V4-V7", description: "Siła i wymagające ruchy." },
  ];
  return <div className={styles.trainingSidebar__protocolStack}><span className={protocolHeadingClassName}>Protokół - Spraywall</span><div className={styles.trainingSidebar__spraywallOptions} role="radiogroup" aria-label="Intensywność Spraywall">{options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={draft.protocol.spraywallIntensity === option.value} className={`${styles.trainingSidebar__spraywallOption} ${draft.protocol.spraywallIntensity === option.value ? styles["trainingSidebar__spraywallOption--active"] : ""}`} onClick={() => onDraftChange({ ...draft, protocol: { ...draft.protocol, spraywallIntensity: option.value } })}><span>{option.name} · {option.grades}</span><small>{option.description}</small></button>)}</div></div>;
}