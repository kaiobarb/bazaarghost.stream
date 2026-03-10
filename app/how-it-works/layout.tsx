import type React from "react";
import { ProsePage } from "@/components/prose-page";

/** Prose layout for the how-it-works MDX page. */
export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProsePage>{children}</ProsePage>;
}
