import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Moon, Sun, Sparkles, LucideIcon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface AssistantsHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  showBackButton?: boolean;
  backPath?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const AssistantsHeader = ({
  title,
  subtitle,
  icon: Icon,
  showBackButton = false,
  backPath = '/assistants',
  actions,
  children,
}: AssistantsHeaderProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Title & Navigation */}
          <div className="flex items-center gap-3 lg:gap-4 flex-shrink min-w-0">
            {showBackButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(backPath)}
                className="p-1.5 lg:p-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)',
                }}
              >
                <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.button>
            )}

            {/* Logo & Title */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary" />
                <div className="relative bg-gradient-primary p-2 lg:p-2.5 rounded-xl">
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1
                  className="text-lg lg:text-xl font-bold tracking-tight flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                  <span
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                    style={{
                      background: 'var(--accent-primary-light)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary-light)',
                    }}
                  >
                    PRO
                  </span>
                </h1>
                <p
                  className="text-xs hidden lg:block"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions & Theme Toggle */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {actions}

            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 lg:py-2 rounded-lg lg:rounded-xl transition-all"
              style={{
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border-default)',
              }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme + '-icon'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                </motion.div>
              </AnimatePresence>
              <span
                className="text-xs lg:text-sm font-medium hidden md:inline"
                style={{ color: theme === 'light' ? '#60a5fa' : '#fbbf24' }}
              >
                {theme === 'light' ? 'Dark' : 'Light'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Optional children content (filters, etc) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
};
