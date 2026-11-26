import "@styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { Inter } from "next/font/google";
import type { PropsWithChildren } from "react";
import { ToastContainer } from "react-toastify";
import AppRoot from "@/components/alternating-care/source/app/AppRoot";
import QueryClientContext from "@/components/alternating-care/source/app/QueryClientContext";
import { ThemeRoot } from "@/components/alternating-care/source/app/ThemeRoot";
import { requireAuthenticatedUser } from "@/lib/server/require-auth";
import { getPlatformUserById } from "@/lib/server/platform-user";

const inter = Inter({ subsets: ["latin"] });

export default async function AlternatingCareLayout({
  children,
}: PropsWithChildren) {
  const authenticatedUser = await requireAuthenticatedUser();
  const platformUser = authenticatedUser?.id
    ? await getPlatformUserById(authenticatedUser.id)
    : null;

  return (
    <div className={`alternatingCareRoot ${inter.className}`}>
      <ThemeRoot>
        <QueryClientContext>
          <AppRoot
            initialUser={
              platformUser
                ? { id: platformUser.id, name: platformUser.name }
                : undefined
            }
          >
            <div>{children}</div>
            <ToastContainer
              position="top-right"
              hideProgressBar
              closeOnClick
              pauseOnHover
              closeButton={false}
            />
          </AppRoot>
        </QueryClientContext>
      </ThemeRoot>
    </div>
  );
}
