import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import App from "./App.tsx";

const router = createRouter({ routeTree });
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme='auto'>
      <RouterProvider router={router} />
      <App />
    </MantineProvider>
  </StrictMode>,
);
