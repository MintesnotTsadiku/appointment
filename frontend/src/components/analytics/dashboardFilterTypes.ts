export type Filters = {
    start?: string;
    end?: string;
    basis: string;
    providers: string[];
    locations: string[];
    services: string[];
    statuses: string[];
    sources: string[];
    segment: string;
    granularity: string;
};
export const initialFilters: Filters = { basis: 'appointment', providers: [], locations: [], services: [], statuses: [], sources: [], segment: 'all', granularity: 'daily' };
