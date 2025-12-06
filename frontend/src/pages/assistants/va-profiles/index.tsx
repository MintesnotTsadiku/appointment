import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Star,
  Mail,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/card';
import { AssistantsHeader } from '../components/AssistantsHeader';
import { StatsRow } from '../components/StatsRow';
import { FilterBar, ViewMode, StatusFilter } from '../components/FilterBar';
import { CreateVAProfileModal } from '@/components/assistants/modals/CreateVAProfileModal';
import { EditVAProfileModal } from '@/components/assistants/modals/EditVAProfileModal';
import { VAProfileDetailModal } from '@/components/assistants/modals/VAProfileDetailModal';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { VAProfile } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

const VAProfiles = () => {
  const [vaProfiles, setVAProfiles] = useState<VAProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedVAId, setSelectedVAId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadVAProfiles();
  }, []);

  const loadVAProfiles = async () => {
    try {
      setLoading(true);
      const response = await assistantAPI.vaProfile.list({
        page_length: 100,
        order_by: 'modified desc',
      });

      if (response.success && response.data) {
        setVAProfiles(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load VA profiles');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    return vaProfiles.filter((profile) => {
      // Status filter
      if (statusFilter !== 'all' && profile.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          profile.full_name.toLowerCase().includes(query) ||
          profile.email.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [vaProfiles, statusFilter, searchQuery]);

  const activeCount = vaProfiles.filter((p) => p.status === 'active').length;
  const inactiveCount = vaProfiles.filter((p) => p.status === 'inactive').length;
  const avgSkills =
    vaProfiles.length > 0
      ? Math.round(
          vaProfiles.reduce((sum, p) => sum + (p.skills?.length || 0), 0) /
            vaProfiles.length
        )
      : 0;

  const stats = [
    {
      label: 'Total VAs',
      value: vaProfiles.length,
      icon: Users,
      gradient: 'bg-gradient-primary',
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
      label: 'Avg. Skills',
      value: avgSkills,
      icon: Star,
      gradient: 'bg-gradient-secondary',
    },
  ];

  return (
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <AssistantsHeader
          title="VA Profiles"
          subtitle="Virtual Assistant Management"
          icon={Users}
          showBackButton
          backPath="/assistants"
          actions={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="relative group flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl font-medium text-xs lg:text-sm overflow-hidden"
            >
              <div className="absolute inset-0 transition-all bg-gradient-primary group-hover:opacity-90" />
              <Plus className="relative z-10 w-4 h-4 text-white" />
              <span className="relative z-10 text-white hidden sm:inline">
                Create VA Profile
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
                searchPlaceholder="Search VA profiles..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

              {/* Content */}
              {filteredProfiles.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    <AnimatePresence>
                      {filteredProfiles.map((profile, index) => {
                        const avatarUrl = profile.avatar_url || profile.image_url || profile.profile_image;
                        const initials = profile.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2);
                        const rating = profile.rating || 0;
                        const responseTimeLabel = {
                          immediate: '⚡ Immediate',
                          within_1_hour: '⚡ < 1 hour',
                          within_4_hours: '🕐 < 4 hours',
                          within_24_hours: '📅 < 24 hours',
                        }[profile.response_time || 'within_1_hour'] || '⚡ < 1 hour';
                        const availabilityColors = {
                          available: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Available' },
                          limited: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', label: 'Limited' },
                          booked: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Booked' },
                        }[profile.availability_status || 'available'] || { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Available' };
                        const tierColors = {
                          junior: { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', label: 'Junior' },
                          standard: { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', label: 'Standard' },
                          senior: { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', label: 'Senior' },
                        }[profile.assistant_tier || 'standard'] || { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', label: 'Standard' };

                        return (
                          <motion.div
                            key={profile.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative group"
                          >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl blur-2xl" />
                            
                            <Card
                              className="relative overflow-hidden backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                              style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                              }}
                              onClick={() => {
                                setSelectedVAId(profile.name);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              {/* Featured/Verified badges */}
                              {(profile.featured || profile.verified) && (
                                <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                                  {profile.verified && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Verified
                                    </span>
                                  )}
                                  {profile.featured && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-amber-400" /> Featured
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Top section with avatar and tier */}
                              <div className="p-5 pb-4">
                                <div className="flex items-start gap-4">
                                  {/* Avatar with availability ring */}
                                  <div className="relative flex-shrink-0">
                                    <div 
                                      className="absolute -inset-1 rounded-2xl opacity-60"
                                      style={{ background: tierColors.bg }}
                                    />
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={profile.full_name}
                                        className="relative w-16 h-16 rounded-xl object-cover ring-2 ring-white/20"
                                      />
                                    ) : (
                                      <div
                                        className="relative w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                                        style={{ background: tierColors.bg }}
                                      >
                                        {initials}
                                      </div>
                                    )}
                                    {/* Availability indicator */}
                                    <div
                                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                                      style={{
                                        backgroundColor: availabilityColors.text,
                                        borderColor: 'var(--bg-elevated)',
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    </div>
                                  </div>

                                  {/* Name and headline */}
                                  <div className="flex-1 min-w-0 pt-1">
                                    <h3
                                      className="font-bold text-lg truncate mb-0.5"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      {profile.full_name}
                                    </h3>
                                    {profile.headline ? (
                                      <p 
                                        className="text-sm truncate mb-2"
                                        style={{ color: 'var(--text-muted)' }}
                                      >
                                        {profile.headline}
                                      </p>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-sm mb-2">
                                        <Mail className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                        <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                                          {profile.email}
                                        </span>
                                      </div>
                                    )}

                                    {/* Rating and tier */}
                                    <div className="flex items-center gap-3">
                                      {rating > 0 && (
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`w-3.5 h-3.5 ${
                                                star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
                                              }`}
                                            />
                                          ))}
                                          <span className="text-xs font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>
                                            ({profile.total_reviews || 0})
                                          </span>
                                        </div>
                                      )}
                                      <span 
                                        className="px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                                        style={{ background: tierColors.bg }}
                                      >
                                        {tierColors.label}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Metrics row */}
                              <div 
                                className="px-5 py-3 flex items-center justify-between border-t border-b"
                                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
                              >
                                <div className="text-center">
                                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {profile.tasks_completed || 0}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Tasks</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {profile.success_rate || 0}%
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Success</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {profile.years_experience || 0}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Years</p>
                                </div>
                              </div>

                              {/* Skills and bottom section */}
                              <div className="p-5 pt-4">
                                {/* Skills tags */}
                                {profile.skills && profile.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {profile.skills.slice(0, 3).map((skill) => (
                                      <span
                                        key={skill.skill}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg"
                                        style={{
                                          backgroundColor: 'var(--accent-primary-light)',
                                          color: 'var(--accent-primary)',
                                        }}
                                      >
                                        {skill.skill}
                                      </span>
                                    ))}
                                    {profile.skills.length > 3 && (
                                      <span
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg"
                                        style={{
                                          backgroundColor: 'var(--border-subtle)',
                                          color: 'var(--text-muted)',
                                        }}
                                      >
                                        +{profile.skills.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Bottom info row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span 
                                      className="text-xs font-medium"
                                      style={{ color: 'var(--text-subtle)' }}
                                    >
                                      {responseTimeLabel}
                                    </span>
                                    {profile.languages && profile.languages.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                                        <Globe className="w-3 h-3" />
                                        {profile.languages.length}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="px-2 py-1 text-xs font-semibold rounded-md"
                                      style={{ backgroundColor: availabilityColors.bg, color: availabilityColors.text }}
                                    >
                                      {availabilityColors.label}
                                    </span>
                                    {profile.hourly_rate && (
                                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                        ${profile.hourly_rate}/hr
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Skills</th>
                            <th className="px-4 py-3 font-medium">Languages</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody
                          className="divide-y"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          {filteredProfiles.map((profile) => (
                            <tr
                              key={profile.name}
                              className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedVAId(profile.name);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {profile.avatar_url || profile.image_url || profile.profile_image ? (
                                    <img
                                      src={profile.avatar_url || profile.image_url || profile.profile_image}
                                      alt={profile.full_name}
                                      className="w-8 h-8 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                                        profile.status === 'active'
                                          ? 'bg-gradient-primary'
                                          : 'bg-gray-500'
                                      }`}
                                    >
                                      {profile.full_name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .slice(0, 2)}
                                    </div>
                                  )}
                                  <span className="font-medium">
                                    {profile.full_name}
                                  </span>
                                </div>
                              </td>
                              <td
                                className="px-4 py-3 text-sm"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {profile.email}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                    profile.status === 'active'
                                      ? 'bg-green-500/20 text-green-500'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      profile.status === 'active'
                                        ? 'bg-green-500'
                                        : 'bg-gray-400'
                                    }`}
                                  />
                                  {profile.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {profile.skills && profile.skills.length > 0 ? (
                                  <span
                                    className="text-sm"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {profile.skills.length} skill
                                    {profile.skills.length !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span
                                    className="text-sm"
                                    style={{ color: 'var(--text-subtle)' }}
                                  >
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {profile.languages && profile.languages.length > 0 ? (
                                  <span
                                    className="text-sm"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {profile.languages.length} lang
                                    {profile.languages.length !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span
                                    className="text-sm"
                                    style={{ color: 'var(--text-subtle)' }}
                                  >
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVAId(profile.name);
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
                          ))}
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
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center opacity-50">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    No VA profiles found
                  </p>
                  <p
                    className="text-sm mb-6"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first VA profile'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-primary"
                    >
                      <Plus className="w-4 h-4" />
                      Create VA Profile
                    </motion.button>
                  )}
                </Card>
              )}
            </div>
          )}
        </main>

        {/* Modals */}
        <CreateVAProfileModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            loadVAProfiles();
          }}
        />

        <EditVAProfileModal
          vaId={selectedVAId}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVAId(null);
          }}
          onSave={() => {
            loadVAProfiles();
          }}
        />

        <VAProfileDetailModal
          vaId={selectedVAId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedVAId(null);
          }}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }}
          onDelete={() => {
            loadVAProfiles();
          }}
        />
      </div>
    </div>
  );
};

export default VAProfiles;
