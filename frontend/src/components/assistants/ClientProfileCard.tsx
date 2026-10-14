import { motion } from 'framer-motion';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { Card } from '@/components/card';
import { formatPhone } from '@/lib/phone';
import { useTranslation } from '@/lib/i18n';
import { useTaskFormat } from '@/lib/tasks-assistants/format';
import type { ClientProfile } from '@/lib/tasks-assistants/types';

interface ClientProfileCardProps {
  clientProfile: ClientProfile;
  onClick?: () => void;
  onEdit?: () => void;
}

export const ClientProfileCard = ({ clientProfile, onClick, onEdit }: ClientProfileCardProps) => {
  const { t } = useTranslation();
  const fmt = useTaskFormat();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-linear-to-r/srgb opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
      <Card
        className="relative p-6 backdrop-blur-xs hover:scale-[1.02] transition-all duration-300 cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3
                className="font-semibold text-lg"
                style={{ color: 'var(--text-primary)' }}
              >
                {clientProfile.full_name}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  clientProfile.status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}
              >
                {fmt.profileStatus(clientProfile.status)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div
                className="flex items-center gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <Mail className="w-4 h-4" />
                {clientProfile.email}
              </div>
              {clientProfile.phone && (
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Phone className="w-4 h-4" />
                  {formatPhone(clientProfile.phone)}
                </div>
              )}
            </div>
          </div>
          {onEdit && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onEdit}
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
                title={t('assistants.client.page.viewProfile')}
                aria-label={t('assistants.client.page.viewProfile')}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};


