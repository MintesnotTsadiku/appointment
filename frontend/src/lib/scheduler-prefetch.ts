/**
 * A public scheduler page asks for its data and its page code while the application code still loads
 * (docs/operations/PUBLIC_PERFORMANCE.md). The page's own `useFrappeGetCall` then takes the request
 * that is already running (SWR `preload`) instead of sending its own. When a page changes its request,
 * the keys no longer match and the page simply fetches as before.
 */
import { preload } from "frappe-react-sdk";

interface SchedulerRequest {
  key: string;
  method: string;
  params: Record<string, string>;
  page: () => Promise<unknown>;
}

const query = (params: Record<string, string>) =>
  Object.entries(params).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");

/** The first request of a scheduler address, with the SWR key that frappe-react-sdk gives it. */
export function schedulerRequest(pathname: string): SchedulerRequest | null {
  const organization = /^\/schedule\/org\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (organization) {
    const [orgSlug, serviceSlug] = [organization[1], organization[2]].map((part) => (part ? decodeURIComponent(part) : part));
    // pages/organization-appointment: the service chooser, or one service's time picker.
    const method = serviceSlug
      ? "appointment.api.personal_meet.get_organization_meeting_windows"
      : "appointment.api.personal_meet.get_organization_services";
    const params: Record<string, string> = serviceSlug ? { org_slug: orgSlug, service_slug: serviceSlug } : { org_slug: orgSlug };
    return { key: `${method}?${query(params)}`, method, params, page: () => import("@/pages/organization-appointment") };
  }
  const provider = /^\/schedule\/p\/([^/]+)\/?$/.exec(pathname);
  if (provider) {
    // pages/public-experience/provider-page: an independent provider's page.
    const slug = decodeURIComponent(provider[1]);
    return { key: `provider-page-${slug}`, method: "appointment.scheduler.provider_page.public_provider", params: { slug },
      page: () => import("@/pages/public-experience/provider-page") };
  }
  return null;
}

/** The same GET request, result and error shape as frappe-js-sdk's `FrappeCall.get`. */
async function frappeGet(method: string, params: Record<string, string>): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Frappe-Site-Name": window.location.hostname };
  const csrf = (window as unknown as { csrf_token?: string }).csrf_token;
  if (csrf && csrf !== "{{ csrf_token }}") headers["X-Frappe-CSRF-Token"] = csrf;
  let response: Response;
  try {
    response = await fetch(`/api/method/${method}?${query(params)}`, { headers, credentials: "same-origin" });
  } catch (error) {
    throw { httpStatus: 0, httpStatusText: "", message: error instanceof Error ? error.message : "There was an error.", exception: "" };
  }
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (response.ok) return body;
  throw { ...(body && typeof body === "object" ? body : {}), httpStatus: response.status, httpStatusText: response.statusText,
    message: (body && typeof body.message === "string" && body.message) || "There was an error.", exception: (body && body.exception) || "" };
}

export function prefetchScheduler(pathname = window.location.pathname): void {
  const request = schedulerRequest(pathname);
  if (!request) return;
  preload(request.key, () => frappeGet(request.method, request.params));
  request.page().catch(() => undefined);
}
