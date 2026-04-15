import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
//@ts-ignore
const router = createRouter({ routeTree });
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme='auto'>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
