"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyIdProps {
  value: string;
  label?: string;
}

export function CopyId({ value, label = "Copy ID" }: CopyIdProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Tooltip open={copied || hovered}>
      <TooltipTrigger asChild>
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-copy"
        >
          {value}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "Copied!" : label}</TooltipContent>
    </Tooltip>
  );
}
