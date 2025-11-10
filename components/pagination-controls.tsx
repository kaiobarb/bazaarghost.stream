"use client";

import type React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  currentPage,
  totalResults,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="flex items-center justify-between py-4 font-mono text-sm">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          {"<<"}
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          {"<"}
        </button>
        <span className="px-4 text-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          {">"}
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          {">>"}
        </button>
      </div>
      <div className="flex-1 text-right text-muted-foreground">
        {totalResults} result{totalResults !== 1 ? 's' : ''}
      </div>
    </div>
  );
}