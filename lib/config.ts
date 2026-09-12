/**
 * Centralized API Configuration
 * Update the BASE_URL variable to change the backend URL globally
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const PROXY_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/api-proxy" : undefined);
const BASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL || "https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net");
const SIGNALR_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_SIGNALR_URL || BASE_URL);
const REST_API_URL = PROXY_API_URL || `${BASE_URL}/api`;
const TENANT_ID = process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || "";
const DELIVERY_PARTNERS_ENABLED = process.env.NEXT_PUBLIC_DELIVERY_PARTNERS_ENABLED !== "false";
// When "true" (IIS builds), absolute /uploads URLs are rewritten to the current
// origin so the reverse-proxy rewrite serves them; Azure builds leave it unset.
const RELATIVE_UPLOADS = process.env.NEXT_PUBLIC_RELATIVE_UPLOADS === "true";

export const config = {
  // API endpoint for REST calls
  apiBaseUrl: REST_API_URL,
  
  // SignalR hub URL
  signalRUrl: `${SIGNALR_URL}/kitchenHub`,
  
  // Backend base URL (without /api prefix)
  backendUrl: BASE_URL,

  // Tenant header value required by the backend query filters
  tenantId: TENANT_ID,

  deliveryPartnersEnabled: DELIVERY_PARTNERS_ENABLED,

  // Serve stored absolute /uploads image URLs relative to the current origin
  // (requires the host to proxy /uploads to the backend, as IIS web.config does)
  relativeUploads: RELATIVE_UPLOADS,
} as const;

export default config;
