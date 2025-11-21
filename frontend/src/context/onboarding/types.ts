export interface OnboardingProgress {
  current_step: number;
  completed_steps: number[];
  onboarding_complete: boolean;
  completed_at?: string;
  onboarding_type?: 'individual' | 'organization' | null;
  selected_organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Organization {
  name: string;
  organization_name: string;
  organization_type: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  description?: string;
  slug: string;
  role?: string;
}

export interface Provider {
  name: string;
  provider_name: string;
  full_name?: string;
  user: string;
  email?: string;
  phone: string;
  organization?: string;
  organization_status: string;
  organization_name?: string;
  source?: string;
}
