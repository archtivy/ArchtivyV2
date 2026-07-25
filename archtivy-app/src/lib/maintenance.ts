/**
 * Production maintenance gate.
 * True only on the Vercel production deployment — preview and local always get the full app.
 */
export function isProductionMaintenance(): boolean {
  return process.env.VERCEL_ENV === "production";
}
