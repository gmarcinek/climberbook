import type { Metadata } from "next";
import { PublicInfoPage } from "../public-info";
import styles from "../PublicInfo.module.css";

export const metadata: Metadata = {
  title: "Wsparcie | Climberbook",
  description: "Pomoc dotycząca aplikacji Climberbook.",
};

export default function SupportPage() {
  return (
    <PublicInfoPage title="Wsparcie Climberbook">
      <p>
        Climberbook to prywatny dziennik treningu wspinaczkowego. Pomaga
        rejestrować treningi, przejścia, pomiary i obserwować postępy.
      </p>
      <h2>Pomoc z kontem</h2>
      <p>
        Jeśli masz problem z logowaniem, sprawdź poprawność adresu e-mail i
        hasła, a następnie spróbuj ponownie. Do korzystania z danych przez
        integrację ChatGPT wymagane jest połączenie konta przez Entra External
        ID.
      </p>
      <h2>Pomoc z integracją ChatGPT</h2>
      <p>
        Integracja udostępnia wyłącznie dane należące do zalogowanego
        użytkownika. Jeżeli integracja nie może odczytać danych, sprawdź, czy
        konto Entra jest przypisane do właściwego konta Climberbook.
      </p>
      <p className={styles.notice}>
        W sprawach dotyczących działania usługi skontaktuj się z administratorem
        Climberbook przez kanał, w którym otrzymałeś dostęp do aplikacji.
      </p>
    </PublicInfoPage>
  );
}
