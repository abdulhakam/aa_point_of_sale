"use client";
// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import { ColorSchemeScript } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-datatable/styles.layer.css";
import Providers from "./providers";
import FetchingIndicator from "./components/global/apiCallIndicator/fetchingIndicator";
import RouteProtector from "./routeProtector";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>
          {/* <FetchingIndicator/> */}
          <RouteProtector>{children}</RouteProtector>
        </Providers>
      </body>
    </html>
  );
}
