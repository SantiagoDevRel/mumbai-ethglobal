import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Slides · From zero to hero with Arkiv, the Web3 database",
  description: "The slides of the ETHGlobal Mumbai workshop on Arkiv, the Web3 database.",
};

export default function TalkLayout({ children }: { children: ReactNode }) {
  return children;
}
