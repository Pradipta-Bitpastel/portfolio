import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * clsx + tailwind-merge in one call. Lets components accept a
 * `className` override that wins against default classes without
 * duplicating Tailwind tokens.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
