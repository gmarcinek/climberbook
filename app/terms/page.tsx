import type { Metadata } from "next";
import { PublicInfoPage } from "../public-info";

export const metadata: Metadata = {
  title: "Warunki korzystania | Climberbook",
  description: "Warunki korzystania z aplikacji Climberbook.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage title="Warunki korzystania">
      <p>
        Climberbook jest narzędziem do prywatnego zapisywania i przeglądania
        danych treningu wspinaczkowego.
      </p>
      <h2>Konto i bezpieczeństwo</h2>
      <p>
        Użytkownik odpowiada za ochronę danych dostępu do swojego konta oraz za
        poprawność wprowadzanych danych. Nie należy udostępniać konta innym
        osobom.
      </p>
      <h2>Dane treningowe</h2>
      <p>
        Dane i podsumowania w aplikacji mają charakter informacyjny. Nie
        zastępują porady medycznej, trenerskiej ani oceny bezpieczeństwa podczas
        wspinania.
      </p>
      <h2>Integracje zewnętrzne</h2>
      <p>
        Po autoryzacji użytkownik może korzystać z integracji ChatGPT do
        przeglądania danych swojego konta. Użytkownik decyduje, kiedy wywołuje
        integrację i jakie pytanie zadaje.
      </p>
      <h2>Zmiany w usłudze</h2>
      <p>
        Funkcje aplikacji i te warunki mogą być aktualizowane wraz z rozwojem
        usługi. Aktualna wersja dokumentu jest dostępna pod tym adresem.
      </p>
    </PublicInfoPage>
  );
}
