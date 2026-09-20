// In Next.js, this file would be called: app/providers.jsx
"use client";

// We can not useState or useRef in a server component, which is why we are
// extracting this part out into it's own file with 'use client' on top
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { UserAuthContextProvider } from "./context/AuthContext";
import { theme } from "@/theme";
import { ModalsProvider } from "@mantine/modals";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // POS-0009 — was `staleTime: 1000 / 2` (0.5 s) with refetchOnMount: true,
            // so every navigation re-fetched 9k–26k row report views.
            //
            // Now: 60 s of freshness for transactional/report data means navigating
            // back to a page serves cache instantly (in the background it refreshes
            // only when stale). Reference data uses 5 min — see useAPI.ts
            // (REFERENCE_STALE_TIME / referenceQueryOptions).
            //
            // refetchOnMount stays at its default (true) and is governed by staleTime.
            // Setting it to false while mutations call a bare invalidateQueries()
            // (which only refreshes *active* queries) would leave invalidated but
            // inactive queries stale forever — i.e. screens showing pre-write data.
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <MantineProvider defaultColorScheme='light' theme={theme}>
      <ModalsProvider>
        <Notifications />
        <UserAuthContextProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </QueryClientProvider>
        </UserAuthContextProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
