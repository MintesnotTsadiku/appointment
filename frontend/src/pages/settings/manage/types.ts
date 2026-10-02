/** Shapes returned by appointment.api.manage hierarchy endpoints. */

export type ValidationStatus = 'complete' | 'warning' | 'error';

export interface Validation {
  status: ValidationStatus;
  issues: string[];
}

export interface BookingUrl {
  url_type: string;
  slug: string;
  full_url: string;
  description?: string;
  access_level?: string;
  service?: string;
  provider?: string;
  location?: string;
}

/** Hierarchy rows are loosely typed by the API; fields vary per endpoint. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface OrganizationNode {
  name: string;
  organization_name: string;
  slug: string;
  validation?: Validation & Record<string, unknown>;
  booking_urls?: BookingUrl[];
  services?: Row[];
  locations?: Row[];
  providers?: Row[];
  [key: string]: unknown;
}

export interface IndividualProvider {
  name: string;
  provider_name: string;
  email?: string;
  phone?: string;
  validation: Validation;
  booking_urls?: BookingUrl[];
  event_types: Row[];
  locations: Row[];
  services?: Row[];
}

export interface ProviderServiceNode {
  name: string;
  service_name: string;
  validation?: Validation;
  event_types: Row[];
  [key: string]: unknown;
}

export interface ProviderLocationNode {
  name: string;
  location_name: string;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  phone?: string;
  timezone?: string;
  validation?: Validation;
  services: ProviderServiceNode[];
}

export interface ProviderOrgNode {
  name: string;
  organization_name: string;
  slug: string;
  is_primary?: boolean;
  locations: ProviderLocationNode[];
}

export interface ProviderNode {
  name: string;
  provider_name: string;
  email?: string;
  phone?: string;
  validation?: Validation;
  booking_urls?: BookingUrl[];
  organizations: ProviderOrgNode[];
}

export interface ManagementHierarchy {
  user_type: 'organization_owner' | 'organization_member' | 'individual' | 'none' | 'error';
  organization?: OrganizationNode;
  organizations?: OrganizationNode[];
  provider?: IndividualProvider;
  providers?: ProviderNode[];
  view_type?: 'organization' | 'provider_centric';
  error?: string;
  message?: string;
}

export type ItemType = 'service' | 'location' | 'provider' | 'event_type';
export type EditableType = 'service' | 'location' | 'event_type';

/** Options offered by the create/edit dropdowns. */
export interface OrgOptions {
  services?: Array<{ name: string; service_name: string }>;
  providers?: Array<{ name: string; provider_name: string }>;
  locations?: Array<{ name: string; location_name: string }>;
}

/** An item handed to EditItemModal: the API row plus its type. */
export type EditTarget = Row & { type: EditableType; name: string };

export interface DeleteTarget {
  type: EditableType;
  id: string;
  label: string;
}

export function matchesQuery(value: unknown, query: string): boolean {
  if (!query) return true;
  return String(value ?? '').toLowerCase().includes(query.toLowerCase());
}
