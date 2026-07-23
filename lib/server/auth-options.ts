import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { findOrCreateSocialUser } from "@/lib/server/climberbook-repository";

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
const facebookConfigured = Boolean(
  process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET,
);
const entraConfigured = Boolean(
  process.env.AUTH_ENTRA_CLIENT_ID &&
    process.env.AUTH_ENTRA_CLIENT_SECRET &&
    process.env.AUTH_ENTRA_TENANT_ID,
);

export function isSocialLoginConfigured() {
  return Boolean(
    process.env.AUTH_SECRET &&
      (googleConfigured || facebookConfigured || entraConfigured),
  );
}

const providers: NextAuthOptions["providers"] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  );
}

if (facebookConfigured) {
  providers.push(
    FacebookProvider({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
  );
}

if (entraConfigured) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AUTH_ENTRA_CLIENT_ID!,
      clientSecret: process.env.AUTH_ENTRA_CLIENT_SECRET!,
      tenantId: process.env.AUTH_ENTRA_TENANT_ID!,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.providerAccountId || !user.email?.trim()) return false;

      const providerProfile = profile as {
        given_name?: unknown;
        family_name?: unknown;
      } | null;
      const firstName =
        typeof providerProfile?.given_name === "string"
          ? providerProfile.given_name
          : undefined;
      const lastName =
        typeof providerProfile?.family_name === "string"
          ? providerProfile.family_name
          : undefined;

      const appUser = await findOrCreateSocialUser({
        provider: account.provider,
        providerSubject: account.providerAccountId,
        email: user.email,
        displayName: user.name || user.email || "Użytkownik",
        firstName,
        lastName,
        nick: user.name || user.email,
      });
      user.appUserId = appUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.appUserId) token.appUserId = user.appUserId;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.appUserId === "string") {
        session.user.id = token.appUserId;
      }
      return session;
    },
  },
};