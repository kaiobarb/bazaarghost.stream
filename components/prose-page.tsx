import type React from "react";

/**
 * Shared wrapper for prose/MDX content pages (how-it-works, contact, donate).
 *
 * Provides a scrollable, centered container with Tailwind Typography
 * classes applied. Used by individual page layouts after the `(mdx)`
 * route group was flattened.
 *
 * @param children - MDX or JSX page content.
 */
export function ProsePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <article className="prose prose-neutral dark:prose-invert lg:prose-md max-w-none font-serif">
          {children}
        </article>
      </div>
    </div>
  );
}
