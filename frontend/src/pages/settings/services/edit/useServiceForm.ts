import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ServiceDetails } from '../types';

export interface ServiceFormValues {
  serviceName: string;
  description: string;
  duration: string;
  price: string;
  buffer: string;
}

export type ServiceFormErrors = Partial<Record<keyof ServiceFormValues, string>>;

const EMPTY: ServiceFormValues = { serviceName: '', description: '', duration: '30', price: '0', buffer: '0' };

function fromService(service: ServiceDetails): ServiceFormValues {
  return {
    serviceName: service.service_name,
    description: service.description || '',
    duration: service.duration.toString(),
    price: service.price.toString(),
    buffer: service.buffer_before.toString(),
  };
}

/** Local edit state for a service, seeded from the loaded record. */
export function useServiceForm(service: ServiceDetails | undefined, messages: { required: string; minDuration: string }) {
  const initial = useMemo(() => (service ? fromService(service) : EMPTY), [service]);
  const [values, setValues] = useState<ServiceFormValues>(initial);
  const [errors, setErrors] = useState<ServiceFormErrors>({});

  useEffect(() => {
    setValues(initial);
    setErrors({});
  }, [initial]);

  const setField = useCallback((field: keyof ServiceFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const validate = () => {
    const next: ServiceFormErrors = {};
    if (!values.serviceName.trim()) next.serviceName = messages.required;
    if (!values.duration || parseInt(values.duration) < 5) next.duration = messages.minDuration;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const dirty = (Object.keys(initial) as Array<keyof ServiceFormValues>).some((key) => initial[key] !== values[key]);
  const reset = () => {
    setValues(initial);
    setErrors({});
  };

  return { values, errors, setField, validate, dirty, reset };
}
