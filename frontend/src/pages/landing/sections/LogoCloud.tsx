import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

const LogoCloud = () => {
  const { t } = useTranslation();

  // Partner logos - companies with verified working logo URLs
  const partners = [
    { 
      name: 'Ethiopian Airlines', 
      logo: 'https://logo.clearbit.com/ethiopianairlines.com' 
    },
    { 
      name: 'Safaricom', 
      logo: 'https://logo.clearbit.com/safaricom.co.ke' 
    },
    { 
      name: 'Ethio Telecom', 
      logo: 'https://logo.clearbit.com/ethiotelecom.et' 
    },
    { 
      name: 'Commercial Bank of Ethiopia', 
      logo: 'https://logo.clearbit.com/combanketh.et' 
    },
    { 
      name: 'Dashen Bank', 
      logo: 'https://logo.clearbit.com/dashenbanksc.com' 
    },
    { 
      name: 'Bank of Abyssinia', 
      logo: 'https://logo.clearbit.com/bankofabyssinia.com' 
    },
  ];

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-2">
            {t('logoCloud.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('logoCloud.subtitle')}
          </p>
        </motion.div>

        {/* Logo Grid with Infinite Scroll Effect */}
        <div className="relative overflow-hidden">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 dark:from-gray-900/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 dark:from-gray-900/50 to-transparent z-10" />

          {/* Scrolling logos */}
          <motion.div
            animate={{
              x: [0, -1000],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 30,
                ease: 'linear',
              },
            }}
            className="flex space-x-12"
          >
            {/* Render logos twice for seamless loop */}
            {[...partners, ...partners].map((partner, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 flex items-center justify-center w-40 h-24 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-w-full max-h-full object-contain transition-all duration-300 opacity-90 hover:opacity-100 hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to styled text if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="text-center px-2"><span class="text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">${partner.name}</span></div>`;
                    }
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '10,000+', label: t('logoCloud.stat1') },
            { value: '500,000+', label: t('logoCloud.stat2') },
            { value: '99.9%', label: t('logoCloud.stat3') },
            { value: '4.9/5', label: t('logoCloud.stat4') },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoCloud;

