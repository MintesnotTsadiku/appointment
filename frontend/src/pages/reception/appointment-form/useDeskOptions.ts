import { useFrappeGetCall } from 'frappe-react-sdk';
import type { Location, Provider, Service } from '../types';

/** Services, providers and locations for the desk booking forms (shared SWR keys). */
export function useDeskOptions() {
  const { data: servicesData } = useFrappeGetCall<{ message: { services: Service[] } }>(
    'appointment.scheduler.api.desk.get_services_list',
    undefined,
    'services'
  );
  const { data: providersData } = useFrappeGetCall<{ message: { providers: Provider[] } }>(
    'appointment.scheduler.api.desk.get_providers_list',
    undefined,
    'providers'
  );
  const { data: locationsData } = useFrappeGetCall<{ message: { locations: Location[] } }>(
    'appointment.scheduler.api.desk.get_locations_list',
    undefined,
    'locations'
  );
  return {
    services: servicesData?.message?.services || [],
    providers: providersData?.message?.providers || [],
    locations: locationsData?.message?.locations || [],
  };
}
