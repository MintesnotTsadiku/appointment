import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  Globe, 
  CheckCircle2, 
  Star,
  Clock,
  Briefcase,
  Award,
  Zap,
  Calendar,
  DollarSign,
  Languages,
  Wrench,
  X
} from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/dialog';
import { PhoneText } from '@/components/phone-input';
import { useTranslation } from '@/lib/i18n';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import { serverError, useTaskFormat } from '@/lib/tasks-assistants/format';
import { clockForLanguage, formatWallTime } from '@/lib/time';
import { vaZoneName } from './CreateVAProfileModal';
import { ContactMenu } from '../ContactMenu';
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

/** The header renders its own close button beside the tier badge, so the dialog's corner one is hidden. */
const HIDE_BUILT_IN_CLOSE = '[&>button:last-child]:hidden';

const TIER_BACKGROUNDS: Record<string, string> = {
  junior: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  standard: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  senior: 'linear-gradient(135deg, #f59e0b, #ef4444)',
};

const AVAILABILITY_COLORS: Record<string, { bg: string; fg: string }> = {
  available: { bg: 'rgba(34, 197, 94, 0.15)', fg: '#22c55e' },
  limited: { bg: 'rgba(251, 191, 36, 0.15)', fg: '#fbbf24' },
  booked: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444' },
};

const RESPONSE_ICONS: Record<string, string> = {
  immediate: '⚡',
  within_1_hour: '⚡',
  within_4_hours: '🕐',
  within_24_hours: '📅',
};

const resolveAvatar = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const backend =
    (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, '') ||
    window.location.origin.replace(':5173', ':8000');
  return `${backend}${url}`;
};

export const VAProfileDetailModal = ({ vaId, isOpen, onClose, onEdit, onDelete }: VAProfileDetailModalProps) => {
  const { t, language } = useTranslation();
  const fmt = useTaskFormat();
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
      toast.error(serverError(error, t('assistants.va.toast.loadOneFailed')));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('assistants.va.detail.confirmDelete'))) return;
    try {
      await assistantAPI.vaProfile.delete(vaId!);
      toast.success(t('assistants.va.toast.deleted'));
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast.error(serverError(error, t('assistants.va.toast.deleteFailed')));
    }
  };

  if (!profile && !loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          side="right"
          className={`max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl overflow-hidden ${HIDE_BUILT_IN_CLOSE}`}
          data-qa="va-detail"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <div className="p-12 text-center">
            <DialogTitle className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('assistants.va.detail.notFound')}</DialogTitle>
            <button onClick={onClose} data-qa="va-detail-close" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              {t('assistants.common.close')}
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
  
  const wallTime = (value?: string) => (value ? formatWallTime(value.slice(0, 5), clockForLanguage(language, '24h')) : '');

  const tier = profile?.assistant_tier || 'standard';
  const tierBg = TIER_BACKGROUNDS[tier] || TIER_BACKGROUNDS.standard;

  const availability = profile?.availability_status || 'available';
  const availabilityColors = AVAILABILITY_COLORS[availability] || AVAILABILITY_COLORS.available;

  const responseTime = profile?.response_time || 'within_1_hour';
  const responseIcon = RESPONSE_ICONS[responseTime] || '⚡';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        side="right"
        className={`max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[90vh] sm:max-h-[90vh] sm:rounded-2xl overflow-hidden p-0 ${profile ? HIDE_BUILT_IN_CLOSE : ''}`}
        data-qa="va-detail"
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
            <div className="relative" style={{ background: tierBg }}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative px-6 pt-6 pb-16">
                {/* Top badges */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap gap-2 min-w-0">
                    {profile.verified && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 text-white flex items-center gap-1 backdrop-blur-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('assistants.va.verified')}
                      </span>
                    )}
                    {profile.featured && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/30 text-amber-200 flex items-center gap-1 backdrop-blur-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-300" /> {t('assistants.va.featured')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span data-qa="va-detail-tier" className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 text-white backdrop-blur-xs whitespace-nowrap">
                      {fmt.tier(tier)}
                    </span>
                    <DialogClose
                      data-qa="va-detail-close"
                      aria-label={t('assistants.common.close')}
                      title={t('assistants.common.close')}
                      className="p-1.5 rounded-xl text-white/80 transition-all hover:text-white hover:bg-black/20 focus:outline-hidden focus:ring-2 focus:ring-white/60"
                    >
                      <X className="h-5 w-5" />
                    </DialogClose>
                  </div>
                </div>

                {/* Avatar and name */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profile.full_name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-bold text-white ring-4 ring-white/30">
                        {initials}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-white flex items-center justify-center ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-white mb-1 leading-tight">{profile.full_name}</DialogTitle>
                    {profile.headline && <p className="text-white/80 text-sm">{profile.headline}</p>}
                    {/* Rating */}
                    {rating > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= rating ? 'fill-amber-300 text-amber-300' : 'text-white/30'}`} />
                        ))}
                        <span className="text-white/80 text-sm ml-1">({t('assistants.va.detail.reviews').replace('{0}', fmt.number(profile.total_reviews || 0))})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics cards - floating */}
              <div className="absolute -bottom-12 left-6 right-6 grid grid-cols-4 gap-3">
                {[
                  { key: 'tasks', label: t('assistants.va.metric.tasks'), value: fmt.number(profile.tasks_completed || 0), icon: Briefcase },
                  { key: 'success', label: t('assistants.va.metric.success'), value: `${fmt.number(profile.success_rate || 0)}%`, icon: Award },
                  { key: 'years', label: t('assistants.va.metric.years'), value: fmt.number(profile.years_experience || 0), icon: Clock },
                  { key: 'rate', label: t('assistants.va.metric.rate'), value: profile.hourly_rate ? `$${fmt.number(profile.hourly_rate)}` : '-', icon: DollarSign },
                ].map((metric, i) => (
                  <motion.div
                    key={metric.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl backdrop-blur-md text-center"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                  >
                    <metric.icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{metric.value}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{metric.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pt-16 px-6 pb-6 space-y-6">
              {/* Availability & Response */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 text-sm font-semibold rounded-lg" style={{ backgroundColor: availabilityColors.bg, color: availabilityColors.fg }}>
                  {fmt.availability(availability)}
                </span>
                <span className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {responseIcon} {t('assistants.va.detail.responds').replace('{0}', fmt.responseTime(responseTime))}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>{t('assistants.va.detail.about')}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>{t('assistants.va.detail.skills')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill.skill}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}
                      >
                        {skill.skill}
                        <span className="text-xs opacity-70">• {fmt.proficiency(skill.proficiency_level)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools */}
              {profile.tools && profile.tools.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Wrench className="w-4 h-4" /> {t('assistants.va.detail.tools')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {profile.tools.map((tool) => (
                      <div
                        key={tool.tool_name}
                        className="px-3 py-2 rounded-lg flex items-center justify-between"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tool.tool_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                          {fmt.proficiency(tool.proficiency_level)}
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
                    <Zap className="w-4 h-4" /> {t('assistants.va.detail.specializations')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.map((spec) => (
                      <span
                        key={spec.specialization}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))', color: '#a78bfa' }}
                      >
                        {spec.specialization} {spec.years_in_industry ? `• ${t('assistants.va.detail.yearsShort').replace('{0}', fmt.number(spec.years_in_industry))}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Award className="w-4 h-4" /> {t('assistants.va.detail.certifications')}
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
                        {cert.date_obtained && <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{t('assistants.va.detail.obtained').replace('{0}', fmt.date(cert.date_obtained))}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                    <Languages className="w-4 h-4" /> {t('assistants.va.languages')}
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
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>• {fmt.proficiency(lang.proficiency)}</span>
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
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>{t('assistants.common.email')}</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile.email}</p>
                </div>
                {profile.phone && (
                  <div className="p-4 rounded-xl" data-qa="va-detail-phone" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>{t('controls.phone.label')}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}><PhoneText value={profile.phone} /></p>
                  </div>
                )}
                {profile.timezone && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>{t('assistants.common.timeZone')}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{vaZoneName(t, profile.timezone)}</p>
                  </div>
                )}
              </div>

              {/* Working Hours */}
              {(profile.working_hours_start || profile.working_hours_end) && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-subtle)' }}>{t('assistants.va.detail.workingHours')}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {wallTime(profile.working_hours_start)} - {wallTime(profile.working_hours_end)}
                    {profile.available_hours_per_week && <span style={{ color: 'var(--text-muted)' }}> • {t('assistants.va.detail.hoursPerWeek').replace('{0}', fmt.number(profile.available_hours_per_week))}</span>}
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
                {t('assistants.common.delete')}
              </motion.button>
              <div className="flex gap-3">
                <ContactMenu phone={profile.phone} email={profile.email} />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEdit}
                  data-qa="assistant-detail-edit"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2"
                  style={{ background: tierBg }}
                >
                  <Edit className="w-4 h-4" />
                  {t('assistants.va.detail.editProfile')}
                </motion.button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
