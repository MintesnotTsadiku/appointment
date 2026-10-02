export interface SetupForm {
  business_name: string;
  location_name: string;
  service_name: string;
  timezone: string;
  duration: string;
  opens_at: string;
  closes_at: string;
}

// Values are sent to the server as-is; labels are translated separately.
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
