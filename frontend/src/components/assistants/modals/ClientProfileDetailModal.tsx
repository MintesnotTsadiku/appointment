import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, User, Mail, Phone, Globe, CheckCircle2, XCircle, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/dialog';
import { PhoneText } from '@/components/phone-input';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { ClientProfile } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverError, useTaskFormat } from '@/lib/tasks-assistants/format';
import { timezoneLabel } from './CreateClientProfileModal';

interface ClientProfileDetailModalProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ClientProfileDetailModal = ({ clientId, isOpen, onClose, onEdit, onDelete }: ClientProfileDetailModalProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [isOpen, clientId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await assistantAPI.clientProfile.get(clientId!);
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error: any) {
      toast.error(serverError(error, t('assistants.client.detail.loadFailed')));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('assistants.client.detail.deleteConfirm'))) return;

    try {
      await assistantAPI.clientProfile.delete(clientId!);
      toast.success(t('assistants.client.detail.deleted'));
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast.error(serverError(error, t('assistants.client.detail.deleteFailed')));
    }
  };

  const isActive = profile?.status === 'active';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        side="right"
        data-qa="client-detail"
        aria-describedby={undefined}
        className="max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[85vh] sm:max-h-[85vh] sm:rounded-2xl overflow-hidden p-0 [&>button:last-child]:hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Own close button: stays above the gradient header and is reachable by QA. */}
        <DialogClose
          data-qa="client-detail-close"
          aria-label={t('assistants.common.close')}
          title={t('assistants.common.close')}
          className="absolute right-4 top-4 z-20 rounded-xl p-2 transition-all hover:scale-110 hover:bg-black/10 focus:outline-hidden focus:ring-2 focus:ring-white/70"
          style={{ color: profile && !loading ? '#fff' : 'var(--text-muted)' }}
        >
          <X className="h-5 w-5" />
        </DialogClose>
        <div className="flex flex-col h-full overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
              <Spinner />
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Premium Gradient Header */}
            <div 
              className="relative min-h-32 shrink-0 overflow-hidden"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-success), var(--accent-success-hover))'
                  : 'linear-gradient(135deg, var(--text-muted), var(--text-subtle))',
              }}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex min-h-32 items-end p-6 pr-16">
                <div className="min-w-0 flex-1">
                  <DialogTitle asChild>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-bold leading-tight text-white mb-3 break-words"
                    >
                      {profile.full_name}
                    </motion.h2>
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold text-white backdrop-blur-xs"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {fmt.profileStatus('active')}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          {fmt.profileStatus(profile.status || 'inactive')}
                        </>
                      )}
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onEdit}
                  data-qa="assistant-detail-edit"
                  className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-xs transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Edit className="w-4 h-4 inline me-2" />
                  {t('assistants.common.edit')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, var(--accent-secondary), var(--accent-secondary-hover))`,
                  }}
                >
                  <Trash2 className="w-4 h-4 inline me-2" />
                  {t('assistants.common.delete')}
                </motion.button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl backdrop-blur-xs border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: 'var(--accent-primary-light)',
                      }}
                    >
                      <Mail className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                        {t('assistants.common.email')}
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                        {profile.email}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {profile.phone && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl backdrop-blur-xs border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--accent-success-light)',
                        }}
                      >
                        <Phone className="w-5 h-5" style={{ color: 'var(--accent-success)' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                          {t('assistants.common.phone')}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          <PhoneText value={profile.phone} />
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile.timezone && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl backdrop-blur-xs border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--accent-primary-light)',
                        }}
                      >
                        <Globe className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                          {t('assistants.common.timeZone')}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          {timezoneLabel(t, profile.timezone)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile.creation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl backdrop-blur-xs border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                        }}
                      >
                        <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                          {t('assistants.client.detail.createdOn')}
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          {fmt.date(profile.creation)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <DialogTitle asChild>
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('assistants.client.detail.notFound')}</p>
            </DialogTitle>
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              {t('assistants.common.close')}
            </button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

