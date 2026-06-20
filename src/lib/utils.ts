import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Nigerian Naira, e.g. 350000 -> "₦350,000". */
export function formatNaira(value: number): string {
  return "₦" + Math.round(value).toLocaleString("en-NG");
}

export function formatPercent(ratio: number): string {
  return (ratio * 100).toFixed(1) + "%";
}
