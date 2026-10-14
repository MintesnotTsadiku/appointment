import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, User, Mail, Phone, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { PhoneInput } from '@/components/phone-input';
import { OptionSelect } from '@/components/select/OptionSelect';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import { serverError, useTaskFormat } from '@/lib/tasks-assistants/format';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { formatPhone, normalizePhone } from '@/lib/phone';
import type { VAProfile } from '@/lib/tasks-assistants/types';
import { VA_TIMEZONES, vaZoneName } from './CreateVAProfileModal';
import Spinner from '@/components/spinner';

const selectClassName = 'h-auto w-full rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-secondary)] px-[1.125rem] py-[0.875rem] text-[var(--text-primary)] transition-all';

interface EditVAProfileModalProps {
  vaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const EditVAProfileModal = ({ vaId, isOpen, onClose, onSave }: EditVAProfileModalProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<VAProfile>>({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
    timezone: 'Africa/Addis_Ababa',
  });

  useEffect(() => {
    if (isOpen && vaId) {
      loadProfile();
    } else {
      resetForm();
      setInitialLoading(true);
    }
  }, [isOpen, vaId]);

  const resetForm = () => {
    setPhoneChecked(false);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      status: 'active',
      timezone: 'Africa/Addis_Ababa',
    });
  };

  const loadProfile = async () => {
    try {
      setInitialLoading(true);
      const response = await assistantAPI.vaProfile.get(vaId!);
      if (response.success && response.data) {
        const profile = response.data;
        setFormData({
          full_name: profile.full_name,
          email: profile.email,
          phone: formatPhone(profile.phone),
          status: profile.status,
          timezone: profile.timezone || 'Africa/Addis_Ababa',
        });
      }
    } catch (error: any) {
      toast.error(serverError(error, t('assistants.va.toast.loadOneFailed')));
      onClose();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      toast.error(t('assistants.va.form.required'));
      return;
    }
    if (formData.phone?.trim() && !normalizePhone(formData.phone)) {
      setPhoneChecked(true);
      return;
    }

    try {
      setLoading(true);
      const response = await assistantAPI.vaProfile.update(vaId!, { ...formData, phone: normalizePhone(formData.phone) });
      if (response.success) {
        toast.success(t('assistants.va.form.updated'));
        onSave?.();
        onClose();
      }
    } catch (error: any) {
      toast.error(serverError(error, t('assistants.va.form.updateFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        side="right"
        className="max-w-2xl sm:max-w-xl sm:right-4 sm:left-auto sm:inset-y-auto sm:top-auto sm:bottom-4 sm:h-[85vh] sm:max-h-[85vh] sm:rounded-2xl overflow-hidden p-0"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex flex-col h-full">
          <DialogHeader className="p-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <DialogTitle 
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('assistants.va.form.editTitle')}
            </DialogTitle>
          </DialogHeader>

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
              <Spinner />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  {t('assistants.common.fullName')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="rounded-xl border-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    padding: '0.875rem 1.125rem',
                  }}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  {t('assistants.common.email')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="rounded-xl border-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    padding: '0.875rem 1.125rem',
                  }}
                />
              </div>

              {/* Phone and Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Phone className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    {t('controls.phone.label')}
                  </Label>
                  <PhoneInput
                    id="phone"
                    data-qa="assistant-profile-phone"
                    value={formData.phone || ''}
                    showError={phoneChecked}
                    onChange={(phone) => setFormData({ ...formData, phone })}
                    className="rounded-xl border-2 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      padding: '0.875rem 1.125rem',
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t('assistants.common.status')}
                  </Label>
                  <OptionSelect
                    id="status"
                    value={formData.status ?? ''}
                    onValueChange={(value) => setFormData({ ...formData, status: value as VAProfile['status'] })}
                    className={selectClassName}
                    options={[{ value: 'active', label: fmt.profileStatus('active') }, { value: 'inactive', label: fmt.profileStatus('inactive') }]}
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Globe className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  {t('assistants.common.timeZone')}
                </Label>
                <OptionSelect
                  id="timezone"
                  value={formData.timezone ?? ''}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  className={selectClassName}
                  options={VA_TIMEZONES.map((tz) => ({ value: tz, label: vaZoneName(t, tz) }))}
                />
              </div>
            </div>

            <DialogFooter className="gap-3 pt-6 border-t mt-6" style={{ borderColor: 'var(--border-subtle)' }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-sm font-semibold backdrop-blur-xs transition-all"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('assistants.common.cancel')}
              </motion.button>
              <motion.button
                type="submit"
                data-qa="assistant-profile-submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="relative px-6 py-3 rounded-xl text-sm font-semibold text-white overflow-hidden shadow-lg transition-all"
                style={{
                  background: loading
                    ? 'var(--text-muted)'
                    : `linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))`,
                }}
              >
                <div 
                  className="absolute inset-0 bg-white/20 transform scale-x-0 hover:scale-x-100 transition-transform origin-left duration-300" 
                />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('assistants.common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('assistants.va.form.saveChanges')}
                    </>
                  )}
                </span>
              </motion.button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

