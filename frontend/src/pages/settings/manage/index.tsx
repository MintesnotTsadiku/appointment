/**
 * Hierarchical Management Interface
 * Provides complete view and CRUD operations for Organization, Services, Locations, Providers, EventTypes
 */

import { useState, useEffect } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HierarchyTree } from './components/HierarchyTree';
import { ProviderHierarchyTree } from './components/ProviderHierarchyTree';
import { ValidationBadge } from './components/ValidationBadge';
import Spinner from '@/components/spinner';

interface ManagementHierarchy {
  user_type: 'organization_owner' | 'organization_member' | 'individual' | 'none' | 'error';
  organization?: {
    name: string;
    organization_name: string;
    slug: string;
    organization_type?: string;
    email?: string;
    phone?: string;
    timezone?: string;
    language?: string;
    description?: string;
    validation: {
      status: 'complete' | 'warning' | 'error';
      issues: string[];
      has_services: boolean;
      has_locations: boolean;
      has_providers: boolean;
      has_booking_urls: boolean;
    };
    booking_urls?: Array<{
      url_type: string;
      slug: string;
      full_url: string;
      description?: string;
      access_level?: string;
      service?: string;
      provider?: string;
    }>;
    services: any[];
    locations: any[];
    providers: Array<{
      name: string;
      provider_name: string;
      email?: string;
      phone?: string;
      is_primary?: boolean;
      validation: any;
      booking_urls?: Array<{
        url_type: string;
        slug: string;
        full_url: string;
        description?: string;
        access_level?: string;
        service?: string;
        location?: string;
      }>;
      event_types: any[];
    }>;
  };
  organizations?: Array<{
    name: string;
    organization_name: string;
    slug: string;
    booking_urls?: Array<{
      url_type: string;
      slug: string;
      full_url: string;
      description?: string;
    }>;
    [key: string]: any;
  }>;
  provider?: {
    name: string;
    provider_name: string;
    email?: string;
    phone?: string;
    validation: {
      status: 'complete' | 'warning' | 'error';
      issues: string[];
    };
    booking_urls?: Array<{
      url_type: string;
      slug: string;
      full_url: string;
      description?: string;
    }>;
    event_types: any[];
    locations: any[];
  };
  providers?: Array<{
    name: string;
    provider_name: string;
    email?: string;
    phone?: string;
    validation: any;
    booking_urls?: Array<{
      url_type: string;
      slug: string;
      full_url: string;
      description?: string;
    }>;
    organizations: Array<{
      name: string;
      organization_name: string;
      slug: string;
      is_primary?: boolean;
      locations: Array<{
        name: string;
        location_name: string;
        address?: string;
        services: any[];
      }>;
    }>;
  }>;
  view_type?: 'organization' | 'provider_centric';
  error?: string;
  message?: string;
}

type ViewType = 'organization' | 'provider';

const Manage = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0);
  const [viewType, setViewType] = useState<ViewType>('organization');

  const { data, isLoading, error, mutate } = useFrappeGetCall<{
    message: ManagementHierarchy;
  }>(
    viewType === 'organization' 
      ? 'frappe_appointment.api.manage.get_management_hierarchy'
      : 'frappe_appointment.api.manage.get_provider_centric_hierarchy',
    undefined,
    undefined,
    {
      revalidateOnFocus: false,
    }
  );

  const hierarchy = data?.message;
  
  // Handle multiple organizations
  const organizations = hierarchy?.organizations || (hierarchy?.organization ? [hierarchy.organization] : []);
  const currentOrganization = organizations[selectedOrgIndex];

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    mutate();
  };

  // Refetch when view type changes
  useEffect(() => {
    mutate();
  }, [viewType]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || hierarchy?.user_type === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <div>
                <h2 className="font-semibold">Error loading management data</h2>
                <p className="text-sm mt-1">{error?.message || hierarchy?.error || 'Unknown error'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (hierarchy?.user_type === 'none') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-5 h-5" />
              <div>
                <h2 className="font-semibold">No setup found</h2>
                <p className="text-sm mt-1">{hierarchy.message || 'Please complete onboarding first.'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Setup
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage your complete appointment system structure
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* View Type Toggle - Only show if user owns/manages organizations */}
        {(hierarchy?.user_type === 'organization_owner' || hierarchy?.user_type === 'organization_member') && 
         (organizations.length > 0 || hierarchy?.providers) ? (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View by:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewType('organization')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewType === 'organization'
                      ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-md ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  Organization
                </button>
                <button
                  onClick={() => setViewType('provider')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewType === 'provider'
                      ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-md ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  Provider
                </button>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Organization Selector - Only show in organization view */}
        {viewType === 'organization' && organizations.length > 1 && (
          <Card className="p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Organization:
            </label>
            <select
              value={selectedOrgIndex}
              onChange={(e) => setSelectedOrgIndex(Number(e.target.value))}
              className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {organizations.map((org, index) => (
                <option key={org.name} value={index}>
                  {org.organization_name}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Organization View */}
        {viewType === 'organization' && currentOrganization && (
          <HierarchyTree
            key={refreshKey}
            organization={currentOrganization}
            onRefresh={handleRefresh}
          />
        )}

        {/* Provider-Centric View */}
        {viewType === 'provider' && hierarchy?.providers && (
          <ProviderHierarchyTree
            key={refreshKey}
            providers={hierarchy.providers}
            onRefresh={handleRefresh}
          />
        )}

        {/* Individual Provider View */}
        {hierarchy?.provider && (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {hierarchy.provider.provider_name}
                  <ValidationBadge status={hierarchy.provider.validation.status} />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Individual Provider
                </p>
              </div>
            </div>

            {hierarchy.provider.validation.issues.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Issues found:
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
                      {hierarchy.provider.validation.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <HierarchyTree
              provider={hierarchy.provider}
              onRefresh={handleRefresh}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default Manage;

