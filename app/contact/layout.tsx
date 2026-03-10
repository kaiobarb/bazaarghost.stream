import type React from "react";
import { ProsePage } from "@/components/prose-page";

/** Prose layout for the contact MDX page. */
export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProsePage>{children}</ProsePage>;
}
