import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Climberbook",
  description: "Next.js starter with IndexedDB in the browser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}