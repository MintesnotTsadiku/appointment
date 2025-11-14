import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const LanguageToggle = () => {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      <motion.div
        key={language}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex items-center space-x-1"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {language === 'en' ? 'EN' : 'አማ'}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {language === 'en' ? '🇺🇸' : '🇪🇹'}
        </span>
      </motion.div>
    </button>
  );
};

export default LanguageToggle;

