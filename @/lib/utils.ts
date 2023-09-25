import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

export const LICENSE_LENGTH = 18;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateLicenseKey() {
  const licenseKey = nanoid(LICENSE_LENGTH);
  return licenseKey;
}
