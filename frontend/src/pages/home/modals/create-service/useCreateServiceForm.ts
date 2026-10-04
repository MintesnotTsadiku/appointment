import { useEffect, useState } from 'react';

export interface ServiceFormOptions {
  organizations: Array<{ name: string; organization_name: string }>;
  user_provider: { name: string; provider_name: string } | null;
  org_providers: Record<string, Array<{ name: string; provider_name: string; is_primary: boolean }>>;
  locations: Array<{ name: string; location_name: string; organization?: string }>;
  is_organization_user: boolean;
}

export interface CreateServiceValues {
  serviceName: string;
  duration: string;
  buffer: string;
  price: string;
  description: string;
  organization: string;
  location: string;
}

export interface CreateServiceMessages {
  name: string;
  duration: string;
  location: string;
  providers: string;
}

const INITIAL: CreateServiceValues = {
  serviceName: '',
  duration: '30',
  buffer: '0',
  price: '0',
  description: '',
  organization: '',
  location: '',
};

/** Field state, option-driven defaults and validation for the create-service form. */
export function useCreateServiceForm(options: ServiceFormOptions | undefined, messages: CreateServiceMessages) {
  const [values, setValues] = useState<CreateServiceValues>(INITIAL);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Picking an organization preselects all its providers; solo users get their own provider.
  useEffect(() => {
    if (values.organization && options?.org_providers) {
      setSelectedProviders((options.org_providers[values.organization] || []).map((p) => p.name));
    } else if (!values.organization && options?.user_provider) {
      setSelectedProviders([options.user_provider.name]);
    } else {
      setSelectedProviders([]);
    }
  }, [values.organization, options]);

  useEffect(() => {
    if (options?.locations?.length && !values.location) {
      setValues((prev) => ({ ...prev, location: options.locations[0].name }));
    }
  }, [options?.locations, values.location]);

  useEffect(() => {
    if (options?.organizations?.length === 1 && !values.organization) {
      setValues((prev) => ({ ...prev, organization: options.organizations[0].name }));
    }
  }, [options?.organizations, values.organization]);

  const setField = (field: keyof CreateServiceValues, value: string, errorKey: string = field) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[errorKey] ? { ...prev, [errorKey]: '' } : prev));
  };

  const toggleProvider = (providerId: string, checked: boolean) => {
    setSelectedProviders((prev) => (checked ? [...prev, providerId] : prev.filter((p) => p !== providerId)));
    setErrors((prev) => ({ ...prev, providers: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!values.serviceName || values.serviceName.trim().length < 3) next.serviceName = messages.name;
    if (!values.duration || parseInt(values.duration) < 5) next.duration = messages.duration;
    if (!values.location) next.location = messages.location;
    // A business without staff may create a service and book it by room or machine instead.
    const businessHasProviders = (options?.org_providers?.[values.organization] || []).length > 0;
    if (values.organization && businessHasProviders && selectedProviders.length === 0) next.providers = messages.providers;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const reset = () => {
    setValues(INITIAL);
    setSelectedProviders([]);
    setErrors({});
  };

  return { values, selectedProviders, errors, setErrors, setField, toggleProvider, validate, reset };
}
