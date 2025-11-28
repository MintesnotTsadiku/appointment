import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import ModeToggle from '@/components/theme-provider/components/modeToggle';
import LanguageToggle from '@/components/language-toggle';
import { useTranslation } from '@/lib/i18n';

const Navigation = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t('nav.product'), href: '#features', hasDropdown: true },
    { label: t('nav.solutions'), href: '#use-cases', hasDropdown: false },
    { label: t('nav.pricing'), href: '#pricing', hasDropdown: false },
    { label: t('nav.resources'), href: '#faq', hasDropdown: false },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl"
        style={{ 
          backgroundColor: isScrolled 
            ? 'color-mix(in srgb, var(--bg-primary) 90%, transparent)'
            : 'transparent',
          height: isScrolled ? '64px' : '80px',
          borderBottom: isScrolled ? '1px solid var(--border-subtle)' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <motion.div
              className="flex-shrink-0 flex items-center"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <a href="/" className="flex items-center space-x-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                  }}
                >
                  <span className="text-white font-bold text-xl">ET</span>
                </div>
                <span className="font-heading font-bold text-xl hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                  Meet.et
                </span>
              </a>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-medium transition-colors duration-200 flex items-center space-x-1"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  <span>{link.label}</span>
                  {link.hasDropdown && <ChevronDown className="w-4 h-4" />}
                </a>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              {/* Language Toggle */}
              <div className="hidden md:block">
                <LanguageToggle />
              </div>

              {/* Theme Toggle */}
              <div className="hidden md:block">
                <ModeToggle />
              </div>

              {/* Desktop CTAs */}
              <div className="hidden md:flex items-center space-x-3">
                <motion.a
                  href="/login"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Sign In
                </motion.a>
                <motion.a
                  href="/signup"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-white transition-all"
                  style={{ 
                    background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                  }}
                >
                  Get Started
                </motion.a>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg transition-colors"
                style={{ 
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm shadow-xl backdrop-blur-xl"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderLeft: '1px solid var(--border-default)'
              }}
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div 
                  className="flex items-center justify-between p-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                    {t('nav.menu')}
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Mobile Menu Links */}
                <div className="flex-1 overflow-y-auto py-6">
                  <div className="space-y-1 px-4">
                    {navLinks.map((link, index) => (
                      <motion.a
                        key={link.label}
                        href={link.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="block px-4 py-3 rounded-lg font-medium transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                      </motion.a>
                    ))}
                  </div>
                </div>

                {/* Mobile Menu Footer */}
                <div 
                  className="p-4 space-y-3"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Language
                    </span>
                    <LanguageToggle />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Theme
                    </span>
                    <ModeToggle />
                  </div>
                  <motion.a
                    href="/login"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block w-full px-4 py-2 rounded-lg font-medium text-sm text-center transition-all"
                    style={{ 
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Sign In
                  </motion.a>
                  <motion.a
                    href="/signup"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block w-full px-4 py-2 rounded-lg font-medium text-sm text-center text-white transition-all"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                    }}
                  >
                    Get Started
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;

