/**
 * Hierarchical Management Interface
 * Provides complete view and CRUD operations for Organization, Services, Locations, Providers, EventTypes
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HierarchyTree } from './components/HierarchyTree';
import { ProviderHierarchyTree } from './components/ProviderHierarchyTree';
import { ValidationBadge } from './components/ValidationBadge';
import { PolicyManager } from '../components/PolicyManager';
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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Spinner />
      </div>
    );
  }

  if (error || hierarchy?.user_type === 'error') {
    return (
      <div 
        className="min-h-screen"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div 
            className="rounded-2xl p-6 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--status-cancelled-bg)',
              border: '1px solid var(--status-cancelled)'
            }}
          >
            <div className="flex items-center space-x-3" style={{ color: 'var(--status-cancelled)' }}>
              <AlertCircle className="w-5 h-5" />
              <div>
                <h2 className="font-semibold">Error loading management data</h2>
                <p className="text-sm mt-1">{error?.message || hierarchy?.error || 'Unknown error'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hierarchy?.user_type === 'none') {
    return (
      <div 
        className="min-h-screen"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div 
            className="rounded-2xl p-6 backdrop-blur-sm"
            style={{ 
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center space-x-3" style={{ color: 'var(--text-muted)' }}>
              <AlertCircle className="w-5 h-5" />
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>No setup found</h2>
                <p className="text-sm mt-1">{hierarchy.message || 'Please complete onboarding first.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header 
            className="sticky top-0 z-50 mb-6 backdrop-blur-xl rounded-2xl p-6"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
              border: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/home')}
              className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div 
                    className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                  />
                  <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl lg:text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    Manage Setup
                    <span 
                      className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                      style={{ 
                        background: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary-light)'
                      }}
                    >
                      PRO
                    </span>
                  </h1>
                  <p className="text-xs lg:text-sm mt-2" style={{ color: 'var(--text-subtle)' }}>
                    View and manage your complete appointment system structure
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                Refresh
              </motion.button>
            </div>
          </header>

        {/* View Type Toggle - Only show if user owns/manages organizations */}
        {(hierarchy?.user_type === 'organization_owner' || hierarchy?.user_type === 'organization_member') && 
         (organizations.length > 0 || hierarchy?.providers) ? (
          <div 
            className="p-4 mb-6 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>View by:</span>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewType('organization')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewType === 'organization'
                      ? 'bg-gradient-primary text-white shadow-md'
                      : 'hover:bg-[var(--border-subtle)]'
                  }`}
                  style={viewType !== 'organization' ? {
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)'
                  } : {}}
                >
                  Organization
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setViewType('provider')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewType === 'provider'
                      ? 'bg-gradient-primary text-white shadow-md'
                      : 'hover:bg-[var(--border-subtle)]'
                  }`}
                  style={viewType !== 'provider' ? {
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)'
                  } : {}}
                >
                  Provider
                </motion.button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Organization Selector - Only show in organization view */}
        {viewType === 'organization' && organizations.length > 1 && (
          <div 
            className="p-4 mb-6 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Select Organization:
            </label>
            <select
              value={selectedOrgIndex}
              onChange={(e) => setSelectedOrgIndex(Number(e.target.value))}
              className="w-full max-w-md px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
            >
              {organizations.map((org, index) => (
                <option key={org.name} value={index}>
                  {org.organization_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Organization View */}
        {viewType === 'organization' && currentOrganization && (
          <>
            <HierarchyTree
              key={refreshKey}
              organization={currentOrganization}
              onRefresh={handleRefresh}
            />
            
            {/* Policies Section */}
            <div className="mt-6">
              <PolicyManager
                userType="organization"
                entityId={currentOrganization.name}
              />
            </div>
          </>
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
          <div 
            className="p-6 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)'
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                  {hierarchy.provider.provider_name}
                  <ValidationBadge status={hierarchy.provider.validation.status} />
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Individual Provider
                </p>
              </div>
            </div>

            {hierarchy.provider.validation.issues.length > 0 && (
              <div 
                className="mb-4 p-3 rounded-lg backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--accent-secondary-light)',
                  border: '1px solid var(--accent-secondary-light)'
                }}
              >
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-secondary)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--accent-secondary)' }}>
                      Issues found:
                    </p>
                    <ul className="text-sm mt-1 list-disc list-inside" style={{ color: 'var(--text-muted)' }}>
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
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Manage;

