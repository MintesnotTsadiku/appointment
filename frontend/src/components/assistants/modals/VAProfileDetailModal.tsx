import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  Trash2, 
  Mail, 
  Globe, 
  CheckCircle2, 
  Star,
  Clock,
  Briefcase,
  Award,
  Zap,
  Calendar,
  DollarSign,
  MessageSquare,
  Languages,
  Wrench
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/dialog';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { VAProfile } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

interface VAProfileDetailModalProps {
  vaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const resolveAvatar = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const backend =
    (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ||
    window.location.origin.replace(':5173', ':8000');
  return `${backend}${url}`;
};

export const VAProfileDetailModal = ({ vaId, isOpen, onClose, onEdit, onDelete }: VAProfileDetailModalProps) => {
  const [profile, setProfile] = useState<VAProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vaId) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [isOpen, vaId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await assistantAPI.vaProfile.get(vaId!);
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load VA profile');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this VA profile?')) return;
    try {
      await assistantAPI.vaProfile.delete(vaId!);
      toast.success('VA Profile deleted successfully');
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete VA profile');
    }
  };

  if (!profile && !loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          side="right"
          className="max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <div className="p-12 text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>VA Profile not found</p>
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const avatarUrl = resolveAvatar(profile?.avatar_url || profile?.image_url || profile?.profile_image);
  const initials = (profile?.full_name || profile?.email || '?').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const isActive = profile?.status === 'active';
  const rating = profile?.rating || 0;
  
  const tierConfig = {
    junior: { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', label: 'Junior' },
    standard: { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', label: 'Standard' },
    senior: { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', label: 'Senior' },
  }[profile?.assistant_tier || 'standard'] || { bg: 'linear-gradient(135deg, #3b82f6, #6366f1)', label: 'Standard' };

  const availabilityConfig = {
    available: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Available' },
    limited: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', label: 'Limited Availability' },
    booked: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Fully Booked' },
  }[profile?.availability_status || 'available'] || { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Available' };

  const responseTimeConfig = {
    immediate: { icon: '⚡', label: 'Immediate Response' },
    within_1_hour: { icon: '⚡', label: 'Responds within 1 hour' },
    within_4_hours: { icon: '🕐', label: 'Responds within 4 hours' },
    within_24_hours: { icon: '📅', label: 'Responds within 24 hours' },
  }[profile?.response_time || 'within_1_hour'] || { icon: '⚡', label: 'Responds within 1 hour' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        side="right"
        className="max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl overflow-hidden p-0"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
              <Spinner />
            </div>
          </div>
        ) : profile ? (
          <div className="flex flex-col h-full">
            {/* Hero Header */}
            <div className="relative" style={{ background: tierConfig.bg }}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative px-6 pt-6 pb-16">
                {/* Top badges */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {profile.verified && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 text-white flex items-center gap-1 backdrop-blur-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                    {profile.featured && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/30 text-amber-200 flex items-center gap-1 backdrop-blur-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-300" /> Featured
                      </span>
                    )}
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 text-white backdrop-blur-sm">
                    {tierConfig.label}
                  </span>
                </div>

                {/* Avatar and name */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profile.full_name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white ring-4 ring-white/30">
                        {initials}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-white flex items-center justify-center ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">{profile.full_name}</h2>
                    {profile.headline && <p className="text-white/80 text-sm">{profile.headline}</p>}
                    {/* Rating */}
                    {rating > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= rating ? 'fill-amber-300 text-amber-300' : 'text-white/30'}`} />
                        ))}
                        <span className="text-white/80 text-sm ml-1">({profile.total_reviews || 0} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics cards - floating */}
              <div className="absolute -bottom-12 left-6 right-6 grid grid-cols-4 gap-3">
                {[
                  { label: 'Tasks', value: profile.tasks_completed || 0, icon: Briefcase },
                  { label: 'Success', value: `${profile.success_rate || 0}%`, icon: Award },
                  { label: 'Years', value: profile.years_experience || 0, icon: Clock },
                  { label: 'Rate', value: profile.hourly_rate ? `$${profile.hourly_rate}` : '-', icon: DollarSign },
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl backdrop-blur-md text-center"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                  >
                    <metric.icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{metric.value}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{metric.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pt-16 px-6 pb-6 space-y-6">
              {/* Availability & Response */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 text-sm font-semibold rounded-lg" style={{ backgroundColor: availabilityConfig.bg, color: availabilityConfig.text }}>
                  {availabilityConfig.label}
                </span>
                <span className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {responseTimeConfig.icon} {responseTimeConfig.label}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>About</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill.skill}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}
                      >
                        {skill.skill}
                        <span className="text-xs opacity-70 capitalize">• {skill.proficiency_level}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools */}
              {profile.tools && profile.tools.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Wrench className="w-4 h-4" /> Tools & Software
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {profile.tools.map((tool) => (
                      <div
                        key={tool.tool_name}
                        className="px-3 py-2 rounded-lg flex items-center justify-between"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tool.tool_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                          {tool.proficiency_level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specializations */}
              {profile.specializations && profile.specializations.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Zap className="w-4 h-4" /> Industry Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.map((spec) => (
                      <span
                        key={spec.specialization}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))', color: '#a78bfa' }}
                      >
                        {spec.specialization} {spec.years_in_industry ? `• ${spec.years_in_industry}y` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Award className="w-4 h-4" /> Certifications
                  </h3>
                  <div className="space-y-2">
                    {profile.certifications.map((cert, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cert.certification_name}</p>
                        {cert.issuing_organization && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{cert.issuing_organization}</p>}
                        {cert.date_obtained && <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Obtained: {new Date(cert.date_obtained).toLocaleDateString()}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Languages className="w-4 h-4" /> Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span
                        key={lang.language}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        {lang.language}
                        <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>• {lang.proficiency}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>Email</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile.email}</p>
                </div>
                {profile.timezone && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>Timezone</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.timezone.replace('Africa/', '')}</p>
                  </div>
                )}
              </div>

              {/* Working Hours */}
              {(profile.working_hours_start || profile.working_hours_end) && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>Working Hours</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {profile.working_hours_start?.slice(0, 5)} - {profile.working_hours_end?.slice(0, 5)}
                    {profile.available_hours_per_week && <span style={{ color: 'var(--text-muted)' }}> • {profile.available_hours_per_week}h/week available</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-secondary)' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Delete
              </motion.button>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2"
                  style={{ background: tierConfig.bg }}
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </motion.button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
