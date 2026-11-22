"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LazyClimberbookProvider = dynamic(
  () =>
    import("@/components/climberbook/providers/ClimberbookProvider").then(
      (module) => module.ClimberbookProvider,
    ),
  { loading: () => null },
);

const platformPrefixes = [
  "/alternating-care",
  "/settings",
  "/modele",
  "/maps",
  "/warunki-wspin",
];

const standaloneRoutes = new Set([
  "/",
  "/login",
  "/rejestracja",
  "/privacy",
  "/support",
  "/terms",
  "/mcp-auth-test",
]);

export function ClimberbookRouteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const bypassProvider =
    standaloneRoutes.has(pathname) ||
    platformPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (bypassProvider) return children;

  return <LazyClimberbookProvider>{children}</LazyClimberbookProvider>;
}
