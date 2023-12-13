"use client";

import HeaderSimple from "./HeaderSimple";
import NavbarMinimal from "./NavbarMinimal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height:'100vh' }}>
      <NavbarMinimal />
      <div style={{ width: "100%" }}>
        <HeaderSimple />
        {children}
      </div>
    </div>
  );
}
