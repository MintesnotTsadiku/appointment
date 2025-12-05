import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Calendar, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { DateTimePicker } from '@/components/datetime-picker';
import { taskAPI, assistantAPI, taskMasterDataAPI } from '@/lib/tasks-assistants/api';
import { toast } from 'sonner';
import type { Task } from '@/lib/tasks-assistants/types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTaskModal = ({ isOpen, onClose, onSuccess }: CreateTaskModalProps) => {
  const [loading, setLoading] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [vaProfiles, setVaProfiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'requested',
    priority: 'medium',
    client_profile: '',
    assignee: '',
    category: '',
    project: '',
    deadline: '',
    estimated_duration: undefined,
    is_daily_briefing: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadAllOptions();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'requested',
      priority: 'medium',
      client_profile: '',
      assignee: '',
      category: '',
      project: '',
      deadline: '',
      estimated_duration: undefined,
      is_daily_briefing: false,
    });
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
      toast.error('Title and client profile are required');
      return;
    }

    try {
      setLoading(true);
      const response = await taskAPI.create(formData);
      if (response.success) {
        toast.success('Task created successfully');
        onSuccess?.();
        resetForm();
        onClose();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4" style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }}>
        <DialogHeader className="pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <DialogTitle 
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Create Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-6">
          {/* Basic Information Section */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-subtle)' }}>
                Basic Information
              </h3>
              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Title <span style={{ color: 'var(--accent-secondary)' }}>*</span>
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
                    Description
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
                      Status
                    </Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)',
                        padding: '0.875rem 1.125rem',
                      }}
                    >
                      <option value="requested">Requested</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Priority
                    </Label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)',
                        padding: '0.875rem 1.125rem',
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Deadline and Daily Briefing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      Deadline
                    </Label>
                    <DateTimePicker
                      value={formData.deadline ? new Date(formData.deadline) : undefined}
                      onChange={(date) => {
                        setFormData({
                          ...formData,
                          deadline: date ? date.toISOString().slice(0, 16) : '',
                        });
                      }}
                      placeholder="Select deadline date and time"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Options
                    </Label>
                    <div className="flex items-center h-[3rem] px-5 rounded-xl border-2" style={{
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
                        Show in Daily Briefing
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
                Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_profile" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Client Profile <span style={{ color: 'var(--accent-secondary)' }}>*</span>
                  </Label>
                  <select
                    id="client_profile"
                    value={formData.client_profile}
                    onChange={(e) => setFormData({ ...formData, client_profile: e.target.value })}
                    required
                    className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      padding: '0.875rem 1.125rem',
                    }}
                  >
                    <option value="">Select a client...</option>
                    {clientProfiles.map((client) => (
                      <option key={client.name} value={client.name}>
                        {client.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Virtual Assistant
                  </Label>
                  <select
                    id="assignee"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      padding: '0.875rem 1.125rem',
                    }}
                  >
                    <option value="">None</option>
                    {vaProfiles.map((va) => (
                      <option key={va.name} value={va.name}>
                        {va.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Category
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      padding: '0.875rem 1.125rem',
                    }}
                  >
                    <option value="">None</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Project
                  </Label>
                  <select
                    id="project"
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full rounded-xl border-2 transition-all focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      padding: '0.875rem 1.125rem',
                    }}
                  >
                    <option value="">None</option>
                    {projects.map((proj) => (
                      <option key={proj.name} value={proj.name}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Section */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                <Clock className="w-4 h-4" />
                Duration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Estimated Duration (Minutes)
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
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Task
                  </>
                )}
              </span>
            </motion.button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

