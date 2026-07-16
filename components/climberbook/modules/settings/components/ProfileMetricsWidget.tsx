import { MetricCard } from "@/components/climberbook/common/charts";
import { statsGridStyle } from "@/components/climberbook/common/styles";
import type { ProfileMetricsWidgetProps } from "./SettingsWidgetTypes";
export function ProfileMetricsWidget({
  profileDraft,
  weightEntries,
}: ProfileMetricsWidgetProps) {
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
        value={profileDraft.weightKg ? `${profileDraft.weightKg} kg` : "-"}
        detail="Ustawienie bazowe"
      />
      <MetricCard
        label="Zmiany wagi"
        value={String(weightEntries.length)}
        detail="Oddzielne encje: data i waga"
      />
    </div>
  );
}
