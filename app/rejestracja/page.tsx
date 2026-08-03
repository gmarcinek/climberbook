"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import authStyles from "../AuthPage.module.css";
import styles from "./Registration.module.css";

export default function RegistrationPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const repeatedPassword = String(formData.get("repeatedPassword") ?? "");
    if (password !== repeatedPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password,
        }),
      });
      const responseText = await response.text();
      let result: { error?: string } = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText) as { error?: string };
        } catch {
          result = {};
        }
      }
      if (!response.ok) {
        setError(result.error ?? "Nie udało się utworzyć konta.");
        return;
      }

      const loginResult = await signIn("credentials", {
        email: formData.get("email"),
        password,
        callbackUrl: "/trening",
        redirect: false,
      });
      if (loginResult?.error) {
        setError(
          "Konto utworzone, ale nie udało się zalogować. Zaloguj się ponownie.",
        );
        return;
      }
      window.location.assign(loginResult?.url ?? "/trening");
    } catch {
      setError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className={authStyles.authPage} style={pageStyle}>
      <section style={panelStyle} aria-busy={isSubmitting}>
        <p style={{ margin: 0, color: "#6b665e", fontSize: "0.8rem" }}>
          CLIMBERBOOK
        </p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "1.8rem" }}>
          Utwórz konto
        </h1>
        <p style={{ margin: "0 0 24px", color: "#4e5954", lineHeight: 1.5 }}>
          Zacznij prowadzić swój dziennik treningowy.
        </p>
        <form onSubmit={submitRegistration}>
          <fieldset disabled={isSubmitting} style={formFieldsetStyle}>
            <input
              name="displayName"
              autoComplete="name"
              placeholder="Nazwa wyświetlana"
              required
              style={inputStyle}
            />
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="E-mail"
              required
              style={inputStyle}
            />
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              placeholder="Hasło (minimum 12 znaków)"
              required
              style={inputStyle}
            />
            <input
              name="repeatedPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              placeholder="Powtórz hasło"
              required
              style={inputStyle}
            />
            <button type="submit" style={buttonStyle}>
              Utwórz konto
            </button>
          </fieldset>
        </form>
        {error ? (
          <p style={{ margin: "12px 0 0", color: "#8b2e28", lineHeight: 1.5 }}>
            {error}
          </p>
        ) : null}
        <p
          style={{ margin: "18px 0 0", color: "#4e5954", textAlign: "center" }}
        >
          Masz już konto?{" "}
          <Link href="/login" style={{ color: "#19362d", fontWeight: 700 }}>
            Zaloguj się
          </Link>
        </p>
      </section>
      {isSubmitting ? (
        <div
          className={styles.loadingOverlay}
          role="status"
          aria-live="assertive"
        >
          <div className={styles.loadingPanel}>
            <div className={styles.spinner} aria-hidden="true" />
            <strong>Tworzymy Twoje konto</strong>
            <span>To może potrwać chwilę.</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "linear-gradient(145deg, #f5eee6 0%, #e7f0ec 48%, #e9edf8 100%)",
};

const panelStyle = {
  width: "min(100%, 380px)",
  padding: "32px",
  border: "1px solid rgba(37, 52, 49, 0.18)",
  borderRadius: "8px",
  background: "rgba(255, 255, 255, 0.9)",
  boxShadow: "0 18px 44px rgba(41, 57, 51, 0.16)",
};

const inputStyle = {
  minHeight: "44px",
  boxSizing: "border-box" as const,
  width: "100%",
  padding: "0 12px",
  border: "1px solid #aab6ae",
  borderRadius: "6px",
  fontSize: "0.98rem",
};

const buttonStyle = {
  minHeight: "44px",
  border: 0,
  borderRadius: "6px",
  background: "#19362d",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "0.98rem",
  fontWeight: 700,
};

const formFieldsetStyle = {
  display: "grid",
  gap: "10px",
  margin: 0,
  padding: 0,
  border: 0,
};
