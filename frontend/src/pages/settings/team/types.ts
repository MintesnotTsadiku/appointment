export interface Member {
  name: string;
  user: string;
  full_name: string;
  enabled: boolean;
  membership_role: string;
  status: string;
  provider: string | null;
  provider_name: string | null;
  locations: Array<{ name: string; label: string }>;
  assigned_at: string | null;
}

export interface ProviderOption {
  name: string;
  provider_name?: string;
}

export interface LocationOption {
  name: string;
  location_name: string;
}

export const ROLE_OPTIONS = [
  { value: 'Manager', helpKey: 'staff.team.roleHelp.manager' },
  { value: 'Provider', helpKey: 'staff.team.roleHelp.provider' },
  { value: 'Receptionist', helpKey: 'staff.team.roleHelp.receptionist' },
] as const;
