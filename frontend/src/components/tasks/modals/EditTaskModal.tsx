import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Calendar, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { DateTimePicker } from '@/components/datetime-picker';
import { OptionSelect } from '@/components/select/OptionSelect';
import { taskAPI, assistantAPI, taskMasterDataAPI } from '@/lib/tasks-assistants/api';
import { toast } from 'sonner';
import type { Task } from '@/lib/tasks-assistants/types';
import { useTranslation } from '@/lib/i18n';
import { serverError, useTaskFormat, parseApiDate, toApiDateTime } from '@/lib/tasks-assistants/format';

const STATUS_VALUES: Task['status'][] = ['Requested', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITY_VALUES: Task['priority'][] = ['Low', 'Medium', 'High', 'Urgent'];
import Spinner from '@/components/spinner';

const selectClassName = 'h-auto w-full rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-secondary)] px-[1.125rem] py-[0.875rem] text-[var(--text-primary)] transition-all';

interface EditTaskModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const EditTaskModal = ({ taskId, isOpen, onClose, onSave }: EditTaskModalProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [vaProfiles, setVaProfiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'Requested',
    priority: 'Medium',
    client_profile: '',
    assignee: '',
    category: '',
    project: '',
    deadline: '',
    estimated_duration: undefined,
    actual_duration: undefined,
    is_daily_briefing: false,
  });

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask();
      loadAllOptions();
    } else {
      resetForm();
      setInitialLoading(true);
    }
  }, [isOpen, taskId]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'Requested',
      priority: 'Medium',
      client_profile: '',
      assignee: '',
      category: '',
      project: '',
      deadline: '',
      estimated_duration: undefined,
      actual_duration: undefined,
      is_daily_briefing: false,
    });
  };

  const loadTask = async () => {
    try {
      setInitialLoading(true);
      const response = await taskAPI.get(taskId!);
      if (response.success && response.data) {
        const task = response.data;
        setFormData({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          client_profile: task.client_profile || '',
          assignee: task.assignee || '',
          category: task.category || '',
          project: task.project || '',
          deadline: toApiDateTime(task.deadline),
          estimated_duration: task.estimated_duration,
          actual_duration: task.actual_duration,
          is_daily_briefing: task.is_daily_briefing || false,
        });
      }
    } catch (error) {
      toast.error(serverError(error, t('tasks.form.loadFailed')));
      onClose();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadAllOptions = async () => {
    try {
      const [clientsRes, vasRes, categoriesRes, projectsRes] = await Promise.all([
        assistantAPI.clientProfile.list({ page_length: 100 }),
        assistantAPI.vaProfile.list({ page_length: 100 }),
        taskMasterDataAPI.categories.list(),
        taskMasterDataAPI.projects.list({}, 'name'),
      ]);

      if (clientsRes.success && clientsRes.data) setClientProfiles(clientsRes.data);
      if (vasRes.success && vasRes.data) setVaProfiles(vasRes.data);
      if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data);
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.client_profile) {
      toast.error(t('tasks.form.required'));
      return;
    }

    try {
      setLoading(true);
      const response = await taskAPI.update(taskId!, formData);
      if (response.success) {
        toast.success(t('tasks.form.updated'));
        onSave?.();
        onClose();
      }
    } catch (error) {
      toast.error(serverError(error, t('tasks.form.updateFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-qa="task-form"
        side="right"
        className="w-full sm:max-w-[900px] p-0 h-full overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-default)',
        }}
      >
        <div className="border-b px-6 py-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
          <DialogHeader className="pb-0 border-0">
            <DialogTitle 
              className="text-2xl font-bold"
              style={{
                color: 'var(--text-primary)',
              }}
            >
              {t('tasks.form.editTitle')}
            </DialogTitle>
          </DialogHeader>
        </div>

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
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
            {/* Basic Information Section */}
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-subtle)' }}>
                  {t('tasks.form.basicInfo')}
                </h3>
                <div className="space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.title')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="rounded-xl border-2 transition-all"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        padding: '0.875rem 1.125rem',
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.description')}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="rounded-xl border-2 transition-all resize-none"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        padding: '0.875rem 1.125rem',
                      }}
                    />
                  </div>

                  {/* Status and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('assistants.common.status')}
                      </Label>
                      <OptionSelect
                        id="status"
                        value={formData.status ?? ''}
                        onValueChange={(value) => setFormData({ ...formData, status: value as Task['status'] })}
                        className={selectClassName}
                        options={STATUS_VALUES.map((value) => ({ value, label: fmt.taskStatus(value) }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('tasks.form.priority')}
                      </Label>
                      <OptionSelect
                        id="priority"
                        value={formData.priority ?? ''}
                        onValueChange={(value) => setFormData({ ...formData, priority: value as Task['priority'] })}
                        className={selectClassName}
                        options={PRIORITY_VALUES.map((value) => ({ value, label: fmt.taskPriority(value) }))}
                      />
                    </div>
                  </div>

                  {/* Deadline and Daily Briefing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        {t('tasks.form.deadline')}
                      </Label>
                      <DateTimePicker
                        value={parseApiDate(formData.deadline) ?? undefined}
                        onChange={(date) => {
                          setFormData({
                            ...formData,
                            deadline: toApiDateTime(date),
                          });
                        }}
                        placeholder={t('tasks.form.deadlinePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t('tasks.form.options')}
                      </Label>
                      <div className="flex items-center h-12 px-5 rounded-xl border-2" style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                      }}>
                        <input
                          type="checkbox"
                          id="is_daily_briefing"
                          checked={formData.is_daily_briefing}
                          onChange={(e) => setFormData({ ...formData, is_daily_briefing: e.target.checked })}
                          className="w-4 h-4 rounded"
                          style={{
                            accentColor: 'var(--accent-primary)',
                          }}
                        />
                        <Label htmlFor="is_daily_briefing" className="ml-3 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                          {t('tasks.form.dailyBriefing')}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-6 mb-8 pb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                  <User className="w-4 h-4" />
                  {t('tasks.form.assignment')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_profile" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.clientProfile')} <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                    </Label>
                    <OptionSelect
                      id="client_profile"
                      value={formData.client_profile ?? ''}
                      onValueChange={(value) => setFormData({ ...formData, client_profile: value })}
                      required
                      className={selectClassName}
                      placeholder={t('tasks.form.clientPlaceholder')}
                      options={clientProfiles.map((client) => ({ value: client.name, label: client.full_name }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.assistant')}
                    </Label>
                    <OptionSelect
                      id="assignee"
                      value={formData.assignee ?? ''}
                      onValueChange={(value) => setFormData({ ...formData, assignee: value })}
                      className={selectClassName}
                      options={[{ value: '', label: t('tasks.form.none') }, ...vaProfiles.map((va) => ({ value: va.name, label: va.full_name }))]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.category')}
                    </Label>
                    <OptionSelect
                      id="category"
                      value={formData.category ?? ''}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      className={selectClassName}
                      options={[{ value: '', label: t('tasks.form.none') }, ...categories.map((cat) => ({ value: cat.name, label: cat.name }))]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.project')}
                    </Label>
                    <OptionSelect
                      id="project"
                      value={formData.project ?? ''}
                      onValueChange={(value) => setFormData({ ...formData, project: value })}
                      className={selectClassName}
                      options={[{ value: '', label: t('tasks.form.none') }, ...projects.map((proj) => ({ value: proj.name, label: proj.name }))]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration Section */}
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                  <Clock className="w-4 h-4" />
                  {t('tasks.form.duration')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.estimatedMinutes')}
                    </Label>
                    <Input
                      id="estimated_duration"
                      type="number"
                      min="0"
                      value={formData.estimated_duration || ''}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="rounded-xl border-2 transition-all"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        padding: '0.875rem 1.125rem',
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_duration" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t('tasks.form.actualMinutes')}
                    </Label>
                    <Input
                      id="actual_duration"
                      type="number"
                      min="0"
                      value={formData.actual_duration || ''}
                      onChange={(e) => setFormData({ ...formData, actual_duration: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="rounded-xl border-2 transition-all"
                      disabled
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-muted)',
                        padding: '0.875rem 1.125rem',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
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
                data-qa="task-submit"
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
                      {t('tasks.form.saveChanges')}
                    </>
                  )}
                </span>
              </motion.button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
