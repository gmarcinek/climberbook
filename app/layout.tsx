import type { Metadata } from "next";
import "./globals.css";
import { ClimberbookProvider } from "@/components/climberbook/providers/ClimberbookProvider";

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
      <body>
        <ClimberbookProvider>{children}</ClimberbookProvider>
      </body>
    </html>
  );
}
