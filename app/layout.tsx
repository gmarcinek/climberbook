import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./theme.scss";
import { ClimberbookProvider } from "@/components/climberbook/providers/ClimberbookProvider";
import { ThemeProvider } from "@/components/climberbook/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Climberbook",
  description: "Climberbook training journal",
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
          <ClimberbookProvider>{children}</ClimberbookProvider>
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
