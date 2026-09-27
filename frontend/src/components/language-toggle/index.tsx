import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const SHORT_LABEL: Record<string, string> = { en: 'EN', am: 'አማ' };
const FLAG: Record<string, string> = { en: '🇺🇸', am: '🇪🇹' };

const LanguageToggle = () => {
  const { language, setLanguage, languages } = useTranslation();

  const cycleLanguage = () => {
    const available = languages.length ? languages : ['en', 'am'];
    const index = available.indexOf(language);
    setLanguage(available[(index + 1) % available.length]);
  };

  return (
    <button
      data-qa="language-toggle"
      onClick={cycleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Language: ${language}. Switch language`}
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
        <span
          data-qa="language-current"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {SHORT_LABEL[language] ?? language.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {FLAG[language] ?? '🌐'}
        </span>
      </motion.div>
    </button>
  );
};

export default LanguageToggle;
