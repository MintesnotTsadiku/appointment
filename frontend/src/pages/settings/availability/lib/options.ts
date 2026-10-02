import type { AvailabilityScope } from '../hooks/use-availability-scope';

export function locationOptions(scope: AvailabilityScope) {
  return scope.locations.map((l) => ({ value: l.name, label: l.location_name }));
}

export function organizationOptions(scope: AvailabilityScope) {
  return scope.organizations.map((o) => ({ value: o.name, label: o.organization_name }));
}
