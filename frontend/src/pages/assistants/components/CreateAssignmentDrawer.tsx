import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Users, UserCircle, Calendar, LinkIcon } from 'lucide-react';
import { Drawer } from './Drawer';
import { Label } from '@/components/label';
import { OptionSelect } from '@/components/select/OptionSelect';
import { DatePicker } from '@/components/datetime-picker';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverError, useTaskFormat } from '@/lib/tasks-assistants/format';
import type { VAProfile, ClientProfile, AssistantClientAssignment } from '@/lib/tasks-assistants/types';

const selectClassName = 'h-auto w-full rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] transition-all';

interface CreateAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAssignmentDrawer = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateAssignmentDrawerProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const [loading, setLoading] = useState(false);
  const [vaProfiles, setVAProfiles] = useState<VAProfile[]>([]);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [formData, setFormData] = useState<Partial<AssistantClientAssignment>>({
    va_profile: '',
    client_profile: '',
    assignment_model: '1:1',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const [vaResponse, clientResponse] = await Promise.all([
        assistantAPI.vaProfile.list({ filters: { status: 'active' }, page_length: 100 }),
        assistantAPI.clientProfile.list({ filters: { status: 'active' }, page_length: 100 }),
      ]);

      if (vaResponse.success && vaResponse.data) {
        setVAProfiles(vaResponse.data);
      }
      if (clientResponse.success && clientResponse.data) {
        setClientProfiles(clientResponse.data);
      }
    } catch (error) {
      toast.error(serverError(error, t('assistants.assignments.loadProfilesFailed')));
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.va_profile || !formData.client_profile) {
      toast.error(t('assistants.assignments.selectVaAndClient'));
      return;
    }

    try {
      setLoading(true);
      const response = await assistantAPI.assignment.create({
        ...formData,
      });

      if (response.success) {
        toast.success(t('assistants.assignments.created'));
        onSuccess?.();
        resetForm();
        onClose();
      } else {
        toast.error(response.error || t('assistants.assignments.createFailed'));
      }
    } catch (error) {
      toast.error(serverError(error, t('assistants.assignments.createFailed')));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      va_profile: '',
      client_profile: '',
      assignment_model: '1:1',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('assistants.assignments.createTitle')}
      width="md"
      qa="assignment-drawer"
      footer={
        <div className="flex items-center gap-3 justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            {t('assistants.common.cancel')}
          </motion.button>
          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            data-qa="assignment-submit"
            className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden"
            style={{
              background: loading
                ? 'var(--text-muted)'
                : 'linear-gradient(135deg, var(--accent-success), var(--accent-success-hover))',
            }}
          >
            <span className="flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('assistants.common.creating')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('assistants.assignments.createTitle')}
                </>
              )}
            </span>
          </motion.button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* VA Profile Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            {t('assistants.assignments.virtualAssistant')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
          </Label>
          <OptionSelect
            value={formData.va_profile ?? ''}
            onValueChange={(value) => setFormData({ ...formData, va_profile: value })}
            disabled={loadingProfiles}
            className={selectClassName}
            placeholder={t('assistants.assignments.selectVa')}
            options={vaProfiles.map((va) => ({ value: va.name, label: va.full_name }))}
          />
        </div>

        {/* Client Profile Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <UserCircle className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
            {t('assistants.assignments.client')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
          </Label>
          <OptionSelect
            value={formData.client_profile ?? ''}
            onValueChange={(value) => setFormData({ ...formData, client_profile: value })}
            disabled={loadingProfiles}
            className={selectClassName}
            placeholder={t('assistants.assignments.selectClient')}
            options={clientProfiles.map((client) => ({ value: client.name, label: client.full_name }))}
          />
        </div>

        {/* Assignment Model */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <LinkIcon className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
            {t('assistants.assignments.model')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(['1:1', '1:2', '1:3'] as const).map((model) => (
              <motion.button
                key={model}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setFormData({ ...formData, assignment_model: model })}
                className={`relative p-3 rounded-xl text-center transition-all ${
                  formData.assignment_model === model ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor:
                    formData.assignment_model === model
                      ? model === '1:1'
                        ? 'var(--accent-primary-light)'
                        : model === '1:2'
                        ? 'var(--accent-secondary-light)'
                        : 'var(--accent-success-light)'
                      : 'var(--bg-secondary)',
                  border: `1px solid ${
                    formData.assignment_model === model
                      ? model === '1:1'
                        ? 'var(--accent-primary)'
                        : model === '1:2'
                        ? 'var(--accent-secondary)'
                        : 'var(--accent-success)'
                      : 'var(--border-default)'
                  }`,
                  color: 'var(--text-primary)',
                }}
              >
                <span className="text-xs font-semibold leading-snug">{fmt.model(model)}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            {t('assistants.assignments.startDate')}
          </Label>
          <DatePicker
            value={formData.start_date ?? ''}
            onValueChange={(value) => setFormData({ ...formData, start_date: value })}
            className="w-full"
          />
        </div>

        {/* End Date (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            {t('assistants.assignments.endDateOptional')}
          </Label>
          <DatePicker
            value={formData.end_date || ''}
            onValueChange={(value) => setFormData({ ...formData, end_date: value || undefined })}
            clearable
            className="w-full"
          />
        </div>
      </form>
    </Drawer>
  );
};
