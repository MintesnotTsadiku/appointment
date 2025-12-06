import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Mail,
  Globe,
  Building2,
  Clock,
  Briefcase,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/card';
import { AssistantsHeader } from '../components/AssistantsHeader';
import { StatsRow } from '../components/StatsRow';
import { FilterBar, ViewMode, StatusFilter } from '../components/FilterBar';
import { CreateClientProfileModal } from '@/components/assistants/modals/CreateClientProfileModal';
import { EditClientProfileModal } from '@/components/assistants/modals/EditClientProfileModal';
import { ClientProfileDetailModal } from '@/components/assistants/modals/ClientProfileDetailModal';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { ClientProfile, AssistantClientAssignment } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

const resolveAvatar = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const backend =
    (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ||
    window.location.origin.replace(':5173', ':8000');
  return `${backend}${url}`;
};

const ClientProfiles = () => {
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [assignments, setAssignments] = useState<AssistantClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [clientResponse, assignResponse] = await Promise.all([
        assistantAPI.clientProfile.list({
          page_length: 100,
          order_by: 'modified desc',
        }),
        assistantAPI.assignment.list({
          page_length: 200,
        }),
      ]);

      if (clientResponse.success && clientResponse.data) {
        setClientProfiles(clientResponse.data);
      }
      if (assignResponse.success && assignResponse.data) {
        setAssignments(assignResponse.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load client profiles');
    } finally {
      setLoading(false);
    }
  };

  // Get VA assignment for each client
  const getClientAssignment = (clientName: string) => {
    return assignments.find(
      (a) => a.client_profile === clientName && a.status === 'active'
    );
  };

  const filteredProfiles = useMemo(() => {
    return clientProfiles.filter((profile) => {
      if (statusFilter !== 'all' && profile.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          profile.full_name.toLowerCase().includes(query) ||
          profile.email.toLowerCase().includes(query) ||
          (profile.company || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [clientProfiles, statusFilter, searchQuery]);

  const activeCount = clientProfiles.filter((p) => p.status === 'active').length;
  const inactiveCount = clientProfiles.filter((p) => p.status === 'inactive').length;
  const assignedCount = clientProfiles.filter((p) =>
    assignments.some((a) => a.client_profile === p.name && a.status === 'active')
  ).length;

  const stats = [
    {
      label: 'Total Clients',
      value: clientProfiles.length,
      icon: UserCircle,
      gradient: 'bg-gradient-secondary',
    },
    {
      label: 'Active',
      value: activeCount,
      icon: CheckCircle2,
      gradient: 'bg-gradient-success',
    },
    {
      label: 'Inactive',
      value: inactiveCount,
      icon: XCircle,
      customGradient: 'from-gray-500 to-gray-600',
    },
    {
      label: 'With VA Assigned',
      value: assignedCount,
      icon: LinkIcon,
      gradient: 'bg-gradient-primary',
    },
  ];

  // Premium tier colors
  const tierGradient = {
    enterprise: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    business: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    starter: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  };

  return (
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <AssistantsHeader
          title="Client Profiles"
          subtitle="Client Relationship Management"
          icon={UserCircle}
          showBackButton
          backPath="/assistants"
          actions={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="relative group flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl font-medium text-xs lg:text-sm overflow-hidden"
            >
              <div className="absolute inset-0 transition-all bg-gradient-secondary group-hover:opacity-90" />
              <Plus className="relative z-10 w-4 h-4 text-white" />
              <span className="relative z-10 text-white hidden sm:inline">
                Create Client
              </span>
              <span className="relative z-10 text-white sm:hidden">New</span>
              <Sparkles className="relative z-10 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block" />
            </motion.button>
          }
        />

        {/* Main Content */}
        <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Row */}
              <StatsRow stats={stats} />

              {/* Filter Bar */}
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search client profiles..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

              {/* Content */}
              {filteredProfiles.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {filteredProfiles.map((profile, index) => {
                        const assignment = getClientAssignment(profile.name);
                        const avatarUrl = resolveAvatar(profile.avatar_url || profile.image_url || profile.profile_image);
                        const initials = profile.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                        const isActive = profile.status === 'active';
                        
                        // Determine client tier based on assignment model
                        const clientTier = assignment?.assignment_model === '1:1' ? 'enterprise' : assignment?.assignment_model === '1:2' ? 'business' : 'starter';
                        
                        return (
                          <motion.div
                            key={profile.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative group"
                          >
                            {/* Premium glow effect on hover */}
                            <div 
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
                              style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.2))' }}
                            />
                            
                            <Card
                              className="relative p-5 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                              style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                              }}
                              onClick={() => {
                                setSelectedClientId(profile.name);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              {/* Top badges row */}
                              <div className="flex items-center justify-between mb-4">
                                {/* Status badge */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                    isActive ? 'bg-green-500/15 text-green-500' : 'bg-gray-500/15 text-gray-400'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                                
                                {/* Company badge */}
                                {profile.company && (
                                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate max-w-[80px]">{profile.company}</span>
                                  </span>
                                )}
                              </div>

                              {/* Avatar and basic info */}
                              <div className="flex items-start gap-4 mb-4">
                                <div className="relative flex-shrink-0">
                                  {avatarUrl ? (
                                    <img 
                                      src={avatarUrl} 
                                      alt={profile.full_name}
                                      className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10"
                                      style={{ background: assignment ? tierGradient[clientTier as keyof typeof tierGradient] : 'linear-gradient(135deg, #6b7280, #9ca3af)' }}
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div 
                                      className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white ring-2 ring-white/10"
                                      style={{ background: assignment ? tierGradient[clientTier as keyof typeof tierGradient] : 'linear-gradient(135deg, #6b7280, #9ca3af)' }}
                                    >
                                      {initials}
                                    </div>
                                  )}
                                  
                                  {/* Online/assigned indicator */}
                                  {assignment && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 flex items-center justify-center" style={{ borderColor: 'var(--bg-elevated)' }}>
                                      <LinkIcon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-base truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                                    {profile.full_name}
                                  </h3>
                                  <p className="text-sm truncate mb-1" style={{ color: 'var(--text-muted)' }}>
                                    {profile.email}
                                  </p>
                                  {profile.timezone && (
                                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                                      <Globe className="w-3 h-3" />
                                      {profile.timezone.replace('Africa/', '')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* VA Assignment Status */}
                              <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                {assignment ? (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                                      <Star className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium" style={{ color: 'var(--accent-success)' }}>Assigned VA</p>
                                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{assignment.va_profile}</p>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-gradient-primary text-white">
                                      {assignment.assignment_model}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }}>
                                      <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>No VA Assigned</p>
                                      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Waiting for assignment</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Quick Info Row */}
                              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                {profile.preferred_language && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    🌐 {profile.preferred_language === 'en' ? 'English' : profile.preferred_language === 'am' ? 'Amharic' : profile.preferred_language}
                                  </span>
                                )}
                                {profile.city && (
                                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                    📍 {profile.city}
                                  </span>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Table View */
                  <Card
                    className="overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr
                            className="text-left text-xs uppercase tracking-wide"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Company</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Assigned VA</th>
                            <th className="px-4 py-3 font-medium">Location</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody
                          className="divide-y"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          {filteredProfiles.map((profile) => {
                            const assignment = getClientAssignment(profile.name);
                            const avatarUrl = resolveAvatar(profile.avatar_url || profile.image_url || profile.profile_image);
                            const initials = profile.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                            
                            return (
                              <tr
                                key={profile.name}
                                className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedClientId(profile.name);
                                  setIsDetailModalOpen(true);
                                }}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {avatarUrl ? (
                                      <img 
                                        src={avatarUrl} 
                                        alt={profile.full_name}
                                        className="w-10 h-10 rounded-lg object-cover"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ${profile.status === 'active' ? 'bg-gradient-secondary' : 'bg-gray-500'}`}>
                                        {initials}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium block" style={{ color: 'var(--text-primary)' }}>{profile.full_name}</span>
                                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {profile.company || '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                                      profile.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${profile.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    {profile.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {assignment ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-gradient-primary text-white">{assignment.assignment_model}</span>
                                      <span className="text-sm" style={{ color: 'var(--accent-success)' }}>{assignment.va_profile}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>Unassigned</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {profile.city ? `${profile.city}${profile.country ? `, ${profile.country}` : ''}` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedClientId(profile.name);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{
                                      backgroundColor: 'var(--border-subtle)',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </motion.button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )
              ) : (
                /* Empty State */
                <Card
                  className="p-12 text-center"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-secondary flex items-center justify-center opacity-50">
                    <UserCircle className="w-8 h-8 text-white" />
                  </div>
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    No client profiles found
                  </p>
                  <p
                    className="text-sm mb-6"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first client profile'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-secondary"
                    >
                      <Plus className="w-4 h-4" />
                      Create Client Profile
                    </motion.button>
                  )}
                </Card>
              )}
            </div>
          )}
        </main>

        {/* Modals */}
        <CreateClientProfileModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />

        <EditClientProfileModal
          clientId={selectedClientId}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClientId(null);
          }}
          onSave={() => {
            loadData();
          }}
        />

        <ClientProfileDetailModal
          clientId={selectedClientId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedClientId(null);
          }}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDelete={() => {
            loadData();
          }}
        />
      </div>
    </div>
  );
};

export default ClientProfiles;
