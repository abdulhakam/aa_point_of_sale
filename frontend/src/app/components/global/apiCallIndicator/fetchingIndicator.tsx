"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export default function FetchingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  return (
    <>
      <h1 style={{ position: "absolute", color: "skyblue" }}>{isFetching}</h1>
      <h1 style={{ position: "absolute",top:'-24px', color: "lightpink" }}>{isMutating}</h1>
    </>
  );
}
