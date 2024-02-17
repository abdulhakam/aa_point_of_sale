// In Next.js, this file would be called: app/providers.jsx
"use client";

// We can not useState or useRef in a server component, which is why we are
// extracting this part out into it's own file with 'use client' on top
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { MantineProvider } from "@mantine/core";
import { Notifications } from '@mantine/notifications';
import { UserAuthContextProvider } from "./context/AuthContext";


export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <MantineProvider defaultColorScheme='light'>
      <Notifications />
        <UserAuthContextProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </QueryClientProvider>
        </UserAuthContextProvider>
      
    </MantineProvider>
  );
}
