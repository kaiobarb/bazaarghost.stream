import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert seconds to Twitch VOD timestamp format (e.g., "1h23m45s")
 * @param seconds - The time in seconds
 * @returns Formatted time string for Twitch VOD URLs
 */
export function secondsToTwitchTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h${minutes}m${secs}s`;
}
