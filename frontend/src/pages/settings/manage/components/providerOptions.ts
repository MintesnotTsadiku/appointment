/** Dropdown options for create/edit dialogs opened from the provider-centric tree. */
import type { EditTarget, OrgOptions, ProviderNode, ProviderOrgNode } from '../types';

export interface CreateContext {
  provider?: string;
  service?: string;
  location?: string;
  organization?: string;
}

function uniqueServices(org: ProviderOrgNode) {
  const seen = new Map<string, { name: string; service_name: string }>();
  for (const loc of org.locations) {
    for (const svc of loc.services) {
      if (!seen.has(svc.name)) seen.set(svc.name, { name: svc.name, service_name: svc.service_name });
    }
  }
  return Array.from(seen.values());
}

function locationsOf(org: ProviderOrgNode) {
  return org.locations.map((l) => ({ name: l.name, location_name: l.location_name }));
}

export function createOptions(providers: ProviderNode[], context?: CreateContext): OrgOptions | undefined {
  if (!context) return undefined;
  const provider = providers.find((p) => p.name === context.provider);
  const org = provider?.organizations.find((o) => o.name === context.organization);
  if (!provider || !org) return undefined;
  return {
    services: uniqueServices(org),
    providers: [{ name: provider.name, provider_name: provider.provider_name }],
    locations: locationsOf(org),
  };
}

/** Options for the organization that offers the edited item's service; every provider in that org is listed. */
export function editOptions(providers: ProviderNode[], item: EditTarget): OrgOptions | undefined {
  if (!item.service) return undefined;
  const byOrg = new Map<string, Required<OrgOptions>>();
  for (const provider of providers) {
    for (const org of provider.organizations) {
      const entry = byOrg.get(org.name);
      const ref = { name: provider.name, provider_name: provider.provider_name };
      if (!entry) byOrg.set(org.name, { services: uniqueServices(org), providers: [ref], locations: locationsOf(org) });
      else if (!entry.providers.some((p) => p.name === provider.name)) entry.providers.push(ref);
    }
  }
  for (const provider of providers) {
    for (const org of provider.organizations) {
      if (org.locations.some((loc) => loc.services.some((s) => s.name === item.service))) return byOrg.get(org.name);
    }
  }
  return undefined;
}
