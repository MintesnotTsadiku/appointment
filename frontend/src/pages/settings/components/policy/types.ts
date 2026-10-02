export interface Policy {
  name: string;
  policy_name: string;
  description?: string;
  is_active: number;
  applies_to: string;
  organization?: string;
  service?: string;
  location?: string;
  provider?: string;
  deposit_percentage: number;
  deposit_amount: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_cancellation_fee_percentage: number;
  late_cancellation_fee_amount: number;
  no_show_fee_percentage: number;
  refund_policy: string;
  valid_from: string;
  valid_to?: string;
  template_used?: string;
  created_by_provider?: string;
  created_by_organization?: string;
}

export interface PolicyTemplate {
  key: string;
  name: string;
  description: string;
  deposit_percentage: number;
  deposit_amount: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_cancellation_fee_percentage: number;
  late_cancellation_fee_amount: number;
  no_show_fee_percentage: number;
  refund_policy: string;
}

export interface OrgService {
  name: string;
  service_name: string;
  duration?: number;
  price?: number;
}

export type PolicyUserType = 'provider' | 'organization';

export function formatEtb(amount: number): string {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(amount);
}

/** Service label with duration/price, plus the doc name when names collide. */
export function serviceOptionLabel(service: OrgService, all: OrgService[]): string {
  const parts = [service.service_name];
  if (service.duration) parts.push(`${service.duration}min`);
  if (service.price !== undefined && service.price > 0) parts.push(`${service.price} ETB`);
  const duplicate = all.filter((s) => s.service_name === service.service_name).length > 1;
  if (duplicate) parts.push(`(${service.name})`);
  return parts.join(' - ');
}
