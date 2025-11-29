import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const Pricing = () => {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  const tiers = [
    {
      name: t('pricing.tier1Name'),
      description: t('pricing.tier1Description'),
      price: { monthly: 0, yearly: 0 },
      priceLabel: t('pricing.tier1PriceLabel'),
      features: [
        t('pricing.tier1Feature1'),
        t('pricing.tier1Feature2'),
        t('pricing.tier1Feature3'),
        t('pricing.tier1Feature4'),
        t('pricing.tier1Feature5'),
      ],
      cta: t('pricing.tier1CTA'),
      popular: false,
      color: 'gray',
      icon: Zap,
    },
    {
      name: t('pricing.tier2Name'),
      description: t('pricing.tier2Description'),
      price: { monthly: 500, yearly: 5000 },
      priceLabel: isYearly ? '5,000 ETB' : '500 ETB',
      priceUnit: t('pricing.perMonth'),
      features: [
        t('pricing.tier2Feature1'),
        t('pricing.tier2Feature2'),
        t('pricing.tier2Feature3'),
        t('pricing.tier2Feature4'),
        t('pricing.tier2Feature5'),
        t('pricing.tier2Feature6'),
        t('pricing.tier2Feature7'),
      ],
      cta: t('pricing.tier2CTA'),
      popular: true,
      color: 'indigo',
      icon: Crown,
    },
    {
      name: t('pricing.tier3Name'),
      description: t('pricing.tier3Description'),
      price: { monthly: 1500, yearly: 15000 },
      priceLabel: isYearly ? '15,000 ETB' : '1,500 ETB',
      priceUnit: t('pricing.perMonth'),
      features: [
        t('pricing.tier3Feature1'),
        t('pricing.tier3Feature2'),
        t('pricing.tier3Feature3'),
        t('pricing.tier3Feature4'),
        t('pricing.tier3Feature5'),
        t('pricing.tier3Feature6'),
        t('pricing.tier3Feature7'),
        t('pricing.tier3Feature8'),
      ],
      cta: t('pricing.tier3CTA'),
      popular: false,
      color: 'emerald',
      icon: Rocket,
    },
    {
      name: t('pricing.tier4Name'),
      description: t('pricing.tier4Description'),
      price: null,
      priceLabel: t('pricing.tier4PriceLabel'),
      features: [
        t('pricing.tier4Feature1'),
        t('pricing.tier4Feature2'),
        t('pricing.tier4Feature3'),
        t('pricing.tier4Feature4'),
        t('pricing.tier4Feature5'),
        t('pricing.tier4Feature6'),
        t('pricing.tier4Feature7'),
        t('pricing.tier4Feature8'),
      ],
      cta: t('pricing.tier4CTA'),
      popular: false,
      color: 'gold',
      icon: Crown,
    },
  ];

  return (
    <section id="pricing" className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Premium Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl mx-auto mb-20"
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
              Pricing
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('pricing.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light mb-12"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('pricing.subtitle')}
          </p>

          {/* Premium Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-2 p-1.5 rounded-2xl backdrop-blur-xl border shadow-lg"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
              borderColor: 'var(--border-default)'
            }}
          >
            <motion.button
              onClick={() => setIsYearly(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-xl text-sm font-semibold transition-all relative"
              style={{ 
                backgroundColor: !isYearly ? 'var(--bg-primary)' : 'transparent',
                color: !isYearly ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: !isYearly ? '0 4px 20px -5px rgba(0, 0, 0, 0.2)' : 'none'
              }}
            >
              {t('pricing.monthly')}
            </motion.button>
            <motion.button
              onClick={() => setIsYearly(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-xl text-sm font-semibold transition-all relative"
              style={{ 
                backgroundColor: isYearly ? 'var(--bg-primary)' : 'transparent',
                color: isYearly ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: isYearly ? '0 4px 20px -5px rgba(0, 0, 0, 0.2)' : 'none'
              }}
            >
              {t('pricing.yearly')}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: isYearly ? 1 : 0 }}
                className="absolute -top-2 -right-2 px-2.5 py-1 text-white text-xs font-bold rounded-full shadow-lg"
                style={{ backgroundColor: 'var(--accent-success)' }}
              >
                {t('pricing.save20')}
              </motion.span>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Premium Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{ y: -12, scale: tier.popular ? 1.03 : 1.02 }}
              className="relative"
            >
              {/* Premium Popular Badge */}
              {tier.popular && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20"
                >
                  <div 
                    className="flex items-center space-x-2 px-5 py-2 rounded-full shadow-2xl"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                      boxShadow: '0 10px 40px -10px var(--accent-primary)'
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">
                      {t('pricing.popular')}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Premium Card */}
              <div
                className={`relative h-full rounded-3xl p-8 transition-all duration-500 backdrop-blur-xl border-2 shadow-2xl ${
                  tier.popular ? 'lg:scale-105' : ''
                }`}
                style={{ 
                  backgroundColor: tier.popular 
                    ? 'color-mix(in srgb, var(--bg-elevated) 95%, var(--accent-primary))'
                    : 'var(--bg-elevated)',
                  borderColor: tier.popular ? 'var(--accent-primary)' : 'var(--border-default)',
                  boxShadow: tier.popular 
                    ? '0 25px 80px -20px var(--accent-primary), 0 0 0 1px var(--accent-primary)'
                    : '0 20px 60px -20px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Premium Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.1 + 0.2,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15
                  }}
                  className="mb-6"
                >
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: tier.popular
                        ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                        : tier.color === 'emerald'
                        ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                        : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                    }}
                  >
                    <tier.icon className="w-8 h-8 text-white" />
                  </div>
                </motion.div>

                {/* Tier Name */}
                <h3 
                  className="text-2xl font-heading font-bold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {tier.name}
                </h3>
                <p 
                  className="text-sm mb-8 leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {tier.description}
                </p>

                {/* Premium Price */}
                <div className="mb-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isYearly ? 'yearly' : 'monthly'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {tier.price !== null ? (
                        <>
                          <div className="flex items-baseline mb-2">
                            <span 
                              className="text-5xl font-extrabold"
                              style={{ 
                                backgroundImage: tier.popular
                                  ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                                  : 'linear-gradient(135deg, var(--text-primary), var(--text-primary))',
                                WebkitBackgroundClip: tier.popular ? 'text' : 'unset',
                                WebkitTextFillColor: tier.popular ? 'transparent' : 'var(--text-primary)'
                              }}
                            >
                              {tier.priceLabel}
                            </span>
                            <span 
                              className="ml-2 text-lg font-medium"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              /{tier.priceUnit}
                            </span>
                          </div>
                          {isYearly && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm font-semibold"
                              style={{ color: 'var(--accent-success)' }}
                            >
                              {t('pricing.saveAmount')}
                            </motion.p>
                          )}
                        </>
                      ) : (
                        <div 
                          className="text-4xl font-extrabold"
                          style={{ 
                            backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {tier.priceLabel}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Premium CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mb-8 px-6 py-4 rounded-xl font-semibold text-base transition-all shadow-lg relative overflow-hidden group"
                  style={{ 
                    background: tier.popular
                      ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : 'var(--bg-secondary)',
                    color: tier.popular ? 'white' : 'var(--text-primary)',
                    border: tier.popular ? 'none' : '1px solid var(--border-default)',
                    boxShadow: tier.popular 
                      ? '0 10px 30px -10px var(--accent-primary)'
                      : '0 4px 20px -5px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span className="relative z-10">{tier.cta}</span>
                  {!tier.popular && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>

                {/* Premium Features */}
                <ul className="space-y-4">
                  {tier.features.map((feature, fIndex) => (
                    <motion.li
                      key={fIndex}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: fIndex * 0.05 }}
                      className="flex items-start space-x-3"
                    >
                      <div 
                        className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ 
                          backgroundColor: 'var(--accent-success-light)',
                          color: 'var(--accent-success)'
                        }}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span 
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Premium Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-base mt-16 font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('pricing.bottomNote')}
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
