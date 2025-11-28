/**
 * API Gateway Client
 * Provides obfuscated API calls to hide endpoint structure from users
 */

// Action code mapping - matches backend gateway.py
const ACTION_MAP: Record<string, string> = {
  // Landing page settings
  'frappe_appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings': 'a1b2c3d4',
  
  // Management APIs
  'frappe_appointment.api.manage.get_management_hierarchy': 'e5f6g7h8',
  'frappe_appointment.api.manage.get_provider_centric_hierarchy': 'i9j0k1l2',
  'frappe_appointment.api.manage.create_service': 'm3n4o5p6',
  'frappe_appointment.api.manage.update_service': 'q7r8s9t0',
  'frappe_appointment.api.manage.delete_service': 'u1v2w3x4',
  'frappe_appointment.api.manage.create_location': 'y5z6a7b8',
  'frappe_appointment.api.manage.update_location': 'c9d0e1f2',
  'frappe_appointment.api.manage.delete_location': 'g3h4i5j6',
  'frappe_appointment.api.manage.create_event_type': 'k7l8m9n0',
  'frappe_appointment.api.manage.update_event_type': 'o1p2q3r4',
  'frappe_appointment.api.manage.delete_event_type': 's5t6u7v8',
  
  // Onboarding APIs
  'frappe_appointment.onboarding.get_progress': 'w9x0y1z2',
  'frappe_appointment.onboarding.save_profile': 'a3b4c5d6',
  'frappe_appointment.onboarding.connect_calendar': 'e7f8g9h0',
  'frappe_appointment.onboarding.save_availability': 'i1j2k3l4',
  'frappe_appointment.onboarding.create_service': 'm5n6o7p8',
  'frappe_appointment.onboarding.complete': 'q9r0s1t2',
  'frappe_appointment.onboarding.update_step': 'u3v4w5x6',
  'frappe_appointment.onboarding.save_organization_profile': 'y7z8a9b0',
  'frappe_appointment.onboarding.add_organization_provider': 'c1d2e3f4',
  'frappe_appointment.onboarding.link_provider_to_service': 'g5h6i7j8',
  'frappe_appointment.onboarding.remove_provider_from_service': 'k9l0m1n2',
  'frappe_appointment.onboarding.update_provider_profile': 'o3p4q5r6',
  'frappe_appointment.onboarding.create_location': 's7t8u9v0',
  'frappe_appointment.onboarding.delete_service': 'w1x2y3z4',
  'frappe_appointment.onboarding.delete_location': 'a5b6c7d8',
  
  // Dashboard APIs
  'frappe_appointment.dashboard.stats': 'e9f0g1h2',
  'frappe_appointment.dashboard.recent_activity': 'i3j4k5l6',
  'frappe_appointment.dashboard.alerts': 'm7n8o9p0',
  
  // Calendar APIs
  'frappe_appointment.calendar.get_appointments': 'q1r2s3t4',
  'frappe_appointment.calendar.get_stats': 'u5v6w7x8',
  
  // Availability APIs
  'frappe_appointment.availability.get_progress': 'y9z0a1b2',
  'frappe_appointment.availability.get_locations': 'c3d4e5f6',
  'frappe_appointment.availability.get_services': 'g7h8i9j0',
  'frappe_appointment.availability.get_location_availability': 'k1l2m3n4',
  'frappe_appointment.availability.get_service_availability': 'o5p6q7r8',
  'frappe_appointment.availability.get_service_providers': 's9t0u1v2',
  'frappe_appointment.availability.get_provider_availability': 'w3x4y5z6',
  'frappe_appointment.availability.save_availability': 'a7b8c9d0',
  'frappe_appointment.availability.remove_provider': 'e1f2g3h4',
  'frappe_appointment.availability.get_organizations': 'i5j6k7l8',
  
  // Profile APIs
  'frappe_appointment.profile.get_user_data': 'm9n0o1p2',
  'frappe_appointment.profile.get_provider_data': 'q3r4s5t6',
  
  // Admin APIs
  'frappe_appointment.admin.get_stats': 'u7v8w9x0',
  
  // Debug APIs
  'frappe_appointment.debug.get_debug_info': 'y1z2a3b4',
  
  // Share link APIs
  'frappe_appointment.share.get_share_link': 'c5d6e7f8',
  
  // Organization appointment APIs
  'frappe_appointment.organization.get_appointment_data': 'g9h0i1j2',
  
  // Policy Manager APIs
  'frappe_appointment.scheduler.api.policy_manager.get_policy_templates': 'p1o2l3i4',
  'frappe_appointment.scheduler.api.policy_manager.create_policy_from_template': 'c5y6m7a8',
  'frappe_appointment.scheduler.api.policy_manager.get_user_policies': 'g9u0s1e2',
  'frappe_appointment.scheduler.api.policy_manager.update_policy': 'u3p4d5a6',
  'frappe_appointment.scheduler.api.policy_manager.delete_policy': 'd7e8l9p0',
  'frappe_appointment.scheduler.api.policy_manager.get_organization_services': 'g1o2r3s4',
};

/**
 * Get action code for an endpoint
 */
export function getActionCode(endpoint: string): string | null {
  return ACTION_MAP[endpoint] || null;
}

/**
 * Make a GET request through the API gateway
 */
export async function gatewayGet<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const actionCode = getActionCode(endpoint);
  
  if (!actionCode) {
    throw new Error(`No action code found for endpoint: ${endpoint}`);
  }
  
  // Build query string - action code + all params
  const queryParams = new URLSearchParams();
  queryParams.append('action', actionCode);
  
  // Add all params as query parameters (Frappe style)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const response = await fetch(
    `/api/method/frappe_appointment.api.gateway.route?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.success && data.message) {
    return data.message as T;
  } else {
    throw new Error(data.error || 'API call failed');
  }
}

/**
 * Make a POST request through the API gateway
 */
export async function gatewayPost<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const actionCode = getActionCode(endpoint);
  
  if (!actionCode) {
    throw new Error(`No action code found for endpoint: ${endpoint}`);
  }
  
  // Build request body with action code and all params
  const body: Record<string, any> = {
    action: actionCode,
    ...(params || {}),
  };
  
  const response = await fetch(
    '/api/method/frappe_appointment.api.gateway.route',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.success && data.message) {
    return data.message as T;
  } else {
    throw new Error(data.error || 'API call failed');
  }
}

/**
 * React hook for GET requests through gateway
 */
export function useGatewayGet<T = any>(
  endpoint: string | null,
  params?: Record<string, any>
) {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (!endpoint) return;
    
    let cancelled = false;
    
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await gatewayGet<T>(endpoint, params);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [endpoint, JSON.stringify(params)]);
  
  return { data, isLoading, error };
}

/**
 * React hook for POST requests through gateway
 */
export function useGatewayPost<T = any>(endpoint: string) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const call = React.useCallback(async (params?: Record<string, any>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await gatewayPost<T>(endpoint, params);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);
  
  return { call, loading: isLoading, error };
}

// Import React for hooks
import React from 'react';

