import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/button';
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg h-16'
            : 'bg-transparent h-20'
        }`}
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
                <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">ET</span>
                </div>
                <span className="font-heading font-bold text-xl text-gray-900 dark:text-white hidden sm:block">
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
                  className="text-gray-700 dark:text-gray-300 hover:text-brand-indigo dark:hover:text-brand-indigo-light font-medium transition-colors duration-200 flex items-center space-x-1"
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
                <Button variant="ghost" size="sm" asChild>
                  <a href="#signin">{t('nav.signIn')}</a>
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-hero hover:opacity-90 text-white"
                  asChild
                >
                  <a href="#get-started">{t('nav.getStarted')}</a>
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-xl"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                  <span className="font-heading font-bold text-xl text-gray-900 dark:text-white">
                    {t('nav.menu')}
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                        className="block px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {link.label}
                      </motion.a>
                    ))}
                  </div>
                </div>

                {/* Mobile Menu Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Language
                    </span>
                    <LanguageToggle />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Theme
                    </span>
                    <ModeToggle />
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="#signin">{t('nav.signIn')}</a>
                  </Button>
                  <Button className="w-full bg-gradient-hero text-white" asChild>
                    <a href="#get-started">{t('nav.getStarted')}</a>
                  </Button>
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

