import type { Metadata } from "next";
import { PublicInfoPage } from "../public-info";

export const metadata: Metadata = {
  title: "Prywatność | Climberbook",
  description: "Informacje o prywatności w aplikacji Climberbook.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage title="Prywatność">
      <p>
        Climberbook przetwarza dane potrzebne do prowadzenia dziennika treningu
        wspinaczkowego i obsługi konta użytkownika.
      </p>
      <h2>Jakie dane są używane</h2>
      <ul>
        <li>dane konta i dane identyfikacyjne użyte podczas logowania,</li>
        <li>treningi, przejścia, pomiary i informacje o postępach,</li>
        <li>dane techniczne niezbędne do bezpiecznego działania usługi.</li>
      </ul>
      <h2>Integracja z ChatGPT</h2>
      <p>
        Po wyraźnym połączeniu konta integracja może przekazać do ChatGPT dane
        treningowe wymagane do obsługi zadanego pytania. Dostęp jest ograniczony
        do danych użytkownika powiązanych z jego tożsamością Entra External ID.
      </p>
      <h2>Kontrola nad danymi</h2>
      <p>
        Użytkownik może zarządzać swoim kontem i danymi w aplikacji. Aby uzyskać
        pomoc dotyczącą danych lub dostępu do konta, skorzystaj ze strony
        wsparcia.
      </p>
    </PublicInfoPage>
  );
}
