/**
 * Direct Leapmile API access from the browser.
 *
 * The token is intentionally shipped with the app (internal TV dashboard).
 * Prefer the VITE_LEAPMILE_API_TOKEN env var; the constant below is the
 * fallback for builds where the env var is not set.
 */
export const LEAPMILE_BASE_URL = "https://testrobot1.leapmile.com";

export const LEAPMILE_API_TOKEN =
  (import.meta.env.VITE_LEAPMILE_API_TOKEN as string | undefined) ??
  "PASTE_LEAPMILE_API_TOKEN_HERE";
