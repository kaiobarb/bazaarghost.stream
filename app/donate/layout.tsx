import type React from "react";
import { ProsePage } from "@/components/prose-page";

/** Prose layout for the donate MDX page. */
export default function DonateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProsePage>{children}</ProsePage>;
}
