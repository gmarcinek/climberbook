import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./theme.scss";
import { ClimberbookRouteProvider } from "@/components/climberbook/providers/ClimberbookRouteProvider";
import { ThemeProvider } from "@/components/climberbook/providers/ThemeProvider";
import { PlatformLanguageProvider } from "@/components/platform/PlatformLanguageProvider";

export const metadata: Metadata = {
  title: "Personal Platform",
  description: "Climberbook i opieka naprzemienna w jednym koncie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="theme-default">
        <ThemeProvider>
          <PlatformLanguageProvider>
            <ClimberbookRouteProvider>{children}</ClimberbookRouteProvider>
          </PlatformLanguageProvider>
        </ThemeProvider>
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
