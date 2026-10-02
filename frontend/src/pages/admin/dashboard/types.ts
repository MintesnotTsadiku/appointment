export interface AdminStats {
  overview: {
    total_providers: number;
    active_providers: number;
    total_organizations: number;
    active_organizations: number;
    total_appointments: number;
    appointments_this_week: number;
    appointments_this_month: number;
    appointment_growth: number;
    total_services: number;
    total_locations: number;
    active_users: number;
  };
  revenue: {
    total: number;
    this_month: number;
    last_month: number;
    growth: number;
  };
  appointments: {
    status_breakdown: Record<string, number>;
    this_week: number;
    this_month: number;
    growth: number;
  };
  recent_activity: Array<{
    id: string;
    client_name: string;
    provider: string;
    status: string;
    date: string;
    time: string;
    amount: number;
    created_at: string;
  }>;
  top_providers: Array<{
    name: string;
    provider_name: string;
    appointment_count: number;
    total_revenue: number;
  }>;
}

export type Activity = AdminStats['recent_activity'][number];
export type TopProvider = AdminStats['top_providers'][number];

/** The endpoint omits blocks when optional columns are missing; fill every figure with 0. */
export function normalizeStats(stats: Partial<AdminStats>): AdminStats {
  const overview = stats.overview ?? ({} as Partial<AdminStats['overview']>);
  const revenue = stats.revenue ?? ({} as Partial<AdminStats['revenue']>);
  const appointments = stats.appointments ?? ({} as Partial<AdminStats['appointments']>);
  return {
    overview: {
      total_providers: overview.total_providers || 0,
      active_providers: overview.active_providers || 0,
      total_organizations: overview.total_organizations || 0,
      active_organizations: overview.active_organizations || 0,
      total_appointments: overview.total_appointments || 0,
      appointments_this_week: overview.appointments_this_week || 0,
      appointments_this_month: overview.appointments_this_month || 0,
      appointment_growth: overview.appointment_growth || 0,
      total_services: overview.total_services || 0,
      total_locations: overview.total_locations || 0,
      active_users: overview.active_users || 0,
    },
    revenue: {
      total: revenue.total || 0,
      this_month: revenue.this_month || 0,
      last_month: revenue.last_month || 0,
      growth: revenue.growth || 0,
    },
    appointments: {
      status_breakdown: appointments.status_breakdown || {},
      this_week: appointments.this_week || 0,
      this_month: appointments.this_month || 0,
      growth: appointments.growth || 0,
    },
    recent_activity: stats.recent_activity || [],
    top_providers: stats.top_providers || [],
  };
}

export const number = new Intl.NumberFormat();

export const etb = (amount: number) => `${number.format(amount || 0)} ETB`;
