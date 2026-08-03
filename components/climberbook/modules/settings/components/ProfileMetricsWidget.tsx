import { MetricCard } from "@/components/climberbook/common/charts";
import { statsGridStyle } from "@/components/climberbook/common/styles";
import {
  formatWeightInput,
  getLatestWeightEntry,
} from "@/components/climberbook/common/training";
import type { ProfileMetricsWidgetProps } from "./SettingsWidgetTypes";
export function ProfileMetricsWidget({
  profileDraft,
  weightEntries,
}: ProfileMetricsWidgetProps) {
  const latestWeightEntry = getLatestWeightEntry(weightEntries);

  return (
    <div style={statsGridStyle}>
      <MetricCard
        label="Data urodzenia"
        value={profileDraft.birthDate || "-"}
        detail="Wiek liczony automatycznie"
      />
      <MetricCard
        label="Płeć"
        value={profileDraft.sex || "-"}
        detail="Pole bazowe profilu"
      />
      <MetricCard
        label="Wzrost"
        value={profileDraft.heightCm ? `${profileDraft.heightCm} cm` : "-"}
        detail="Ustawienie bazowe"
      />
      <MetricCard
        label="Aktualna waga"
        value={latestWeightEntry ? `${formatWeightInput(latestWeightEntry.weightKg)} kg` : profileDraft.weightKg ? `${profileDraft.weightKg} kg` : "-"}
        detail={latestWeightEntry ? `Pomiar z ${latestWeightEntry.date}` : "Ustawienie bazowe"}
      />
      <MetricCard
        label="Zmiany wagi"
        value={String(weightEntries.length)}
        detail="Oddzielne encje: data i waga"
      />
    </div>
  );
}
