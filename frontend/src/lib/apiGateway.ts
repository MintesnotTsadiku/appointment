/**
 * API Gateway Client
 * Provides obfuscated API calls to hide endpoint structure from users
 */

// Action code mapping - matches backend gateway.py
const ACTION_MAP: Record<string, string> = {
  // Landing page settings
  'appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings': 'a1b2c3d4',
  
  // Management APIs
  'appointment.api.manage.get_management_hierarchy': 'e5f6g7h8',
  'appointment.api.manage.get_provider_centric_hierarchy': 'i9j0k1l2',
  'appointment.api.manage.create_service': 'm3n4o5p6',
  'appointment.api.manage.update_service': 'q7r8s9t0',
  'appointment.api.manage.delete_service': 'u1v2w3x4',
  'appointment.api.manage.create_location': 'y5z6a7b8',
  'appointment.api.manage.update_location': 'c9d0e1f2',
  'appointment.api.manage.delete_location': 'g3h4i5j6',
  'appointment.api.manage.create_event_type': 'k7l8m9n0',
  'appointment.api.manage.update_event_type': 'o1p2q3r4',
  'appointment.api.manage.delete_event_type': 's5t6u7v8',
  
  // Onboarding APIs
  'appointment.onboarding.get_progress': 'w9x0y1z2',
  'appointment.onboarding.save_profile': 'a3b4c5d6',
  'appointment.onboarding.connect_calendar': 'e7f8g9h0',
  'appointment.onboarding.save_availability': 'i1j2k3l4',
  'appointment.onboarding.create_service': 'm5n6o7p8',
  'appointment.onboarding.complete': 'q9r0s1t2',
  'appointment.onboarding.update_step': 'u3v4w5x6',
  'appointment.onboarding.save_organization_profile': 'y7z8a9b0',
  'appointment.onboarding.add_organization_provider': 'c1d2e3f4',
  'appointment.onboarding.link_provider_to_service': 'g5h6i7j8',
  'appointment.onboarding.remove_provider_from_service': 'k9l0m1n2',
  'appointment.onboarding.update_provider_profile': 'o3p4q5r6',
  'appointment.onboarding.create_location': 's7t8u9v0',
  'appointment.onboarding.delete_service': 'w1x2y3z4',
  'appointment.onboarding.delete_location': 'a5b6c7d8',
  
  // Dashboard APIs
  'appointment.dashboard.stats': 'e9f0g1h2',
  'appointment.dashboard.recent_activity': 'i3j4k5l6',
  'appointment.dashboard.alerts': 'm7n8o9p0',
  
  // Calendar APIs
  'appointment.calendar.get_appointments': 'q1r2s3t4',
  'appointment.calendar.get_stats': 'u5v6w7x8',
  
  // Availability APIs
  'appointment.availability.get_progress': 'y9z0a1b2',
  'appointment.availability.get_locations': 'c3d4e5f6',
  'appointment.availability.get_services': 'g7h8i9j0',
  'appointment.availability.get_location_availability': 'k1l2m3n4',
  'appointment.availability.get_service_availability': 'o5p6q7r8',
  'appointment.availability.get_service_providers': 's9t0u1v2',
  'appointment.availability.get_provider_availability': 'w3x4y5z6',
  'appointment.availability.save_availability': 'a7b8c9d0',
  'appointment.availability.remove_provider': 'e1f2g3h4',
  'appointment.availability.get_organizations': 'i5j6k7l8',
  
  // Profile APIs
  'appointment.profile.get_user_data': 'm9n0o1p2',
  'appointment.profile.get_provider_data': 'q3r4s5t6',
  
  // Admin APIs
  'appointment.admin.get_stats': 'u7v8w9x0',
  
  // Debug APIs
  'appointment.debug.get_debug_info': 'y1z2a3b4',
  
  // Share link APIs
  'appointment.share.get_share_link': 'c5d6e7f8',
  
  // Organization appointment APIs
  'appointment.organization.get_appointment_data': 'g9h0i1j2',
  
  // Policy Manager APIs
  'appointment.scheduler.api.policy_manager.get_policy_templates': 'p1o2l3i4',
  'appointment.scheduler.api.policy_manager.create_policy_from_template': 'c5y6m7a8',
  'appointment.scheduler.api.policy_manager.get_user_policies': 'g9u0s1e2',
  'appointment.scheduler.api.policy_manager.update_policy': 'u3p4d5a6',
  'appointment.scheduler.api.policy_manager.delete_policy': 'd7e8l9p0',
  'appointment.scheduler.api.policy_manager.get_organization_services': 'g1o2r3s4',
  
  // Tasks Module APIs
  'appointment.tasks.api.task_api.create_task': 'd5b80608',
  'appointment.tasks.api.task_api.get_task': '4d696c8c',
  'appointment.tasks.api.task_api.list_tasks': 'ba79d18a',
  'appointment.tasks.api.task_api.update_task': 'e3220d99',
  'appointment.tasks.api.task_api.delete_task': 'a859a851',
  'appointment.tasks.api.task_api.update_task_status': '97023fd9',
  'appointment.tasks.api.task_api.assign_task': 'b62fa73f',
  'appointment.tasks.api.task_api.get_tasks_by_client': '6b5d0ea8',
  'appointment.tasks.api.task_api.get_tasks_by_assignee': '0e0368d2',
  'appointment.tasks.api.task_api.get_daily_briefing_tasks': '760ffdb7',
  'appointment.tasks.api.task_api.get_task_statistics': '2ef1c6a9',
  'appointment.tasks.api.task_master_data_api.create_task_category': '60bf0ea1',
  'appointment.tasks.api.task_master_data_api.list_task_categories': '62b0ca92',
  'appointment.tasks.api.task_master_data_api.create_task_template': 'a16a7d92',
  'appointment.tasks.api.task_master_data_api.get_task_template': '496816cc',
  'appointment.tasks.api.task_master_data_api.list_task_templates': 'e6e3c51b',
  'appointment.tasks.api.task_master_data_api.create_tasks_from_template': 'f8f7cec3',
  'appointment.tasks.api.task_master_data_api.create_task_project': '73b4ff03',
  'appointment.tasks.api.task_master_data_api.get_task_project': '4d03ad6f',
  'appointment.tasks.api.task_master_data_api.list_task_projects': 'b55f0def',
  'appointment.tasks.api.task_master_data_api.get_project_statistics': '5b5470c1',
  
  // Assistants Module APIs
  'appointment.assistants.api.assistant_api.create_va_profile': '75a7c028',
  'appointment.assistants.api.assistant_api.get_va_profile': '35fd42e7',
  'appointment.assistants.api.assistant_api.list_va_profiles': '7fa5b066',
  'appointment.assistants.api.assistant_api.update_va_profile': '98fc243c',
  'appointment.assistants.api.assistant_api.delete_va_profile': '52bc4669',
  'appointment.assistants.api.assistant_api.create_client_profile': '55081dd1',
  'appointment.assistants.api.assistant_api.get_client_profile': '44e25052',
  'appointment.assistants.api.assistant_api.list_client_profiles': '8cd817e4',
  'appointment.assistants.api.assistant_api.update_client_profile': '3cd540d4',
  'appointment.assistants.api.assistant_api.delete_client_profile': 'a4605cf0',
  'appointment.assistants.api.assistant_api.create_assignment': 'f0767f52',
  'appointment.assistants.api.assistant_api.get_assignment': 'f59696de',
  'appointment.assistants.api.assistant_api.list_assignments': 'e7cb015b',
  'appointment.assistants.api.assistant_api.update_assignment': 'cbb71d95',
  'appointment.assistants.api.assistant_api.delete_assignment': '2669041d',
  'appointment.assistants.api.assistant_api.get_clients_for_va': '3ec93d01',
  'appointment.assistants.api.assistant_api.get_vas_for_client': '486ca9aa',
  'appointment.assistants.api.assistant_api.get_assignment_statistics': 'c9ab672d',
  'appointment.assistants.api.assistant_skill_api.create_assistant_skill': 'a51ab4de',
  'appointment.assistants.api.assistant_skill_api.get_assistant_skill': 'f360e142',
  'appointment.assistants.api.assistant_skill_api.list_assistant_skills': '0d3344cc',
  'appointment.assistants.api.assistant_skill_api.update_assistant_skill': 'f71a8bf3',
  'appointment.assistants.api.assistant_skill_api.delete_assistant_skill': 'cc7d6bce',
  'appointment.assistants.api.assistant_skill_api.assign_skill_to_va': 'a6f41d9a',
  'appointment.assistants.api.assistant_skill_api.remove_skill_from_va': '69646948',
  'appointment.assistants.api.assistant_skill_api.get_va_skills': 'a0b3fac2',
  'appointment.assistants.api.assistant_skill_api.get_vas_by_skill': '6868f6e5',
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
        // JSON stringify objects and arrays, convert others to string
        if (typeof value === 'object' && !(value instanceof Date)) {
          queryParams.append(key, JSON.stringify(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }
  
  const response = await fetch(
    `/api/method/appointment.api.gateway.route?${queryParams.toString()}`,
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
  
  // Frappe wraps all responses in {"message": ...}
  // Our gateway returns {"success": true, "message": result}
  // So we get: {"message": {"success": true, "message": result}}
  
  // Unwrap Frappe's wrapper first
  let gatewayResponse = data.message || data;
  
  // If gatewayResponse has an error, throw it
  if (gatewayResponse?.error) {
    throw new Error(gatewayResponse.error);
  }
  
  // If gatewayResponse has success:false, throw
  if (gatewayResponse?.success === false) {
    throw new Error(gatewayResponse.error || 'API call failed');
  }
  
  // The gateway wraps the API response: {"success": true, "message": apiResponse}
  // So gatewayResponse.message contains the actual API response like {success: true, data: [...]}
  if (gatewayResponse?.success && gatewayResponse?.message) {
    // Return the unwrapped API response (this is what the frontend expects)
    return gatewayResponse.message as T;
  }
  
  // Fallback: if structure is different, return what we have
  return gatewayResponse as T;
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
    '/api/method/appointment.api.gateway.route',
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
  
  // Frappe wraps all responses in {"message": ...}
  // Our gateway returns {"success": true, "message": result}
  // So we get: {"message": {"success": true, "message": result}}
  
  // Unwrap Frappe's wrapper first
  let gatewayResponse = data.message || data;
  
  // If gatewayResponse has an error, throw it
  if (gatewayResponse?.error) {
    throw new Error(gatewayResponse.error);
  }
  
  // If gatewayResponse has success:false, throw
  if (gatewayResponse?.success === false) {
    throw new Error(gatewayResponse.error || 'API call failed');
  }
  
  // The gateway wraps the API response: {"success": true, "message": apiResponse}
  // So gatewayResponse.message contains the actual API response like {success: true, data: [...]}
  if (gatewayResponse?.success && gatewayResponse?.message) {
    // Return the unwrapped API response (this is what the frontend expects)
    return gatewayResponse.message as T;
  }
  
  // Fallback: if structure is different, return what we have
  return gatewayResponse as T;
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

