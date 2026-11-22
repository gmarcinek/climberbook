import { ConditionsStudy } from "./ConditionsStudy";
import { PlatformAppShell } from "@/components/platform/PlatformAppShell";

export const metadata = {
  title: "Ocena warunków wspinaczkowych | Climberbook",
  description: "Anonimowe badanie warunków do wspinania.",
};

export default function ConditionsStudyPage() {
  return (
    <PlatformAppShell app="climberbook" title="Warunki wspin">
      <ConditionsStudy />
    </PlatformAppShell>
  );
}
