import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  gradient?: string;
  customGradient?: string;
  onClick?: () => void;
}

interface StatsRowProps {
  stats: StatItem[];
  className?: string;
}

export const StatsRow = ({ stats, className = '' }: StatsRowProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ${className}`}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl" />
          <div
            className={`relative backdrop-blur-sm rounded-xl p-4 hover:bg-[var(--border-subtle)] transition-all duration-300 ${
              stat.onClick ? 'cursor-pointer' : ''
            }`}
            style={{
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border-default)',
            }}
            onClick={stat.onClick}
          >
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex p-2 rounded-lg ${stat.gradient || ''} ${
                  stat.customGradient
                    ? `bg-gradient-to-br ${stat.customGradient}`
                    : ''
                }`}
              >
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <motion.div
                  className="text-2xl font-bold tracking-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
