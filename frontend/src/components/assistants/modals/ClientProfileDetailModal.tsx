import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, User, Mail, Phone, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/dialog';
import { assistantAPI } from '@/lib/tasks-assistants/api';
import type { ClientProfile } from '@/lib/tasks-assistants/types';
import Spinner from '@/components/spinner';
import { toast } from 'sonner';

interface ClientProfileDetailModalProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ClientProfileDetailModal = ({ clientId, isOpen, onClose, onEdit, onDelete }: ClientProfileDetailModalProps) => {
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
      toast.error(error?.message || 'Failed to load client profile');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client profile?')) return;

    try {
      await assistantAPI.clientProfile.delete(clientId!);
      toast.success('Client Profile deleted successfully');
      onDelete?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete client profile');
    }
  };

  const isActive = profile?.status === 'active';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4" style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }}>
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
              className="relative h-32 rounded-lg overflow-hidden -mx-4 -mt-4"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-success), var(--accent-success-hover))'
                  : 'linear-gradient(135deg, var(--text-muted), var(--text-subtle))',
              }}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative h-full flex items-end p-6">
                <div className="flex-1">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-white mb-3"
                  >
                    {profile.full_name}
                  </motion.h2>
                  <div className="flex items-center gap-2">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold text-white backdrop-blur-sm"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 -mt-2 mb-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onEdit}
                  className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-sm transition-all"
                  style={{
                    backgroundColor: 'var(--border-subtle)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit
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
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete
                </motion.button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl backdrop-blur-sm border"
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
                        Email
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
                    className="p-4 rounded-xl backdrop-blur-sm border"
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
                          Phone
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          {profile.phone}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile.timezone && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl backdrop-blur-sm border"
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
                          Timezone
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          {profile.timezone.replace('Africa/', '')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile.creation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl backdrop-blur-sm border"
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
                          Created
                        </p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                          {new Date(profile.creation || '').toLocaleDateString()}
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
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Client Profile not found</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

