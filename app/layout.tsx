import type { Metadata } from "next";
import Script from "next/script";
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
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-F348SCSM9Y"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-F348SCSM9Y');`}
      </Script>
    </html>
  );
}
