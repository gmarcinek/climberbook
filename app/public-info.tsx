import Link from "next/link";
import styles from "./PublicInfo.module.css";

type PublicInfoPageProps = {
  title: string;
  children: React.ReactNode;
};

export function PublicInfoPage({ title, children }: PublicInfoPageProps) {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <p className={styles.brand}>CLIMBERBOOK</p>
        <h1 className={styles.title}>{title}</h1>
        {children}
        <nav className={styles.nav} aria-label="Dokumenty publiczne">
          <Link href="/">Strona główna</Link>
          <Link href="/support">Wsparcie</Link>
          <Link href="/privacy">Prywatność</Link>
          <Link href="/terms">Warunki korzystania</Link>
        </nav>
      </article>
    </main>
  );
}
