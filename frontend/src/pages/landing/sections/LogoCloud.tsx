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
    <section className="relative py-24 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.3, 1] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[160px] opacity-10"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Premium Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-6"
          >
            <span 
              className="px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-xl border"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                borderColor: 'var(--border-default)',
                color: 'var(--accent-primary)'
              }}
            >
              Trusted By
            </span>
          </motion.div>
          <h2 
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('logoCloud.title')}
          </h2>
          <p 
            className="text-lg sm:text-xl"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('logoCloud.subtitle')}
          </p>
        </motion.div>

        {/* Premium Logo Grid with Infinite Scroll */}
        <div className="relative overflow-hidden mb-20">
          {/* Premium Gradient Overlays */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ 
              background: `linear-gradient(to right, var(--bg-primary), transparent)`
            }}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ 
              background: `linear-gradient(to left, var(--bg-primary), transparent)`
            }}
          />

          {/* Scrolling Logos */}
          <motion.div
            animate={{
              x: [0, -2000],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 40,
                ease: 'linear',
              },
            }}
            className="flex gap-16"
          >
            {/* Render logos multiple times for seamless loop */}
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <motion.div
                key={`${partner.name}-${index}`}
                whileHover={{ scale: 1.1, y: -5 }}
                className="flex-shrink-0 flex items-center justify-center w-48 h-28 rounded-2xl backdrop-blur-xl border transition-all"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                  borderColor: 'var(--border-default)',
                  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.2)'
                }}
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-w-full max-h-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="text-center px-4"><span class="text-sm font-bold leading-tight" style="color: var(--text-primary)">${partner.name}</span></div>`;
                    }
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Premium Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8"
        >
          {[
            { value: '10,000+', label: t('logoCloud.stat1') },
            { value: '500,000+', label: t('logoCloud.stat2') },
            { value: '99.9%', label: t('logoCloud.stat3') },
            { value: '4.9/5', label: t('logoCloud.stat4') },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="text-center p-8 rounded-3xl backdrop-blur-xl border"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                borderColor: 'var(--border-default)',
                boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div 
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-3"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {stat.value}
              </div>
              <div className="text-sm sm:text-base font-medium" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoCloud;
