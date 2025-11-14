import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { fadeInUp, staggerContainer, scaleIn } from '@/lib/animations';

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
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center space-x-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                isYearly
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t('pricing.yearly')}
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-brand-emerald text-white text-xs rounded-full">
                {t('pricing.save20')}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="relative"
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex items-center space-x-1 px-4 py-1 bg-gradient-hero rounded-full shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">
                      {t('pricing.popular')}
                    </span>
                  </div>
                </div>
              )}

              {/* Card */}
              <div
                className={`relative h-full p-8 rounded-2xl border-2 transition-all duration-300 ${
                  tier.popular
                    ? 'border-brand-indigo bg-gradient-to-b from-brand-indigo/5 to-transparent dark:from-brand-indigo/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                } hover:border-brand-indigo dark:hover:border-brand-indigo shadow-lg hover:shadow-2xl`}
              >
                {/* Tier Name */}
                <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isYearly ? 'yearly' : 'monthly'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {tier.price !== null ? (
                        <>
                          <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                              {tier.priceLabel}
                            </span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              /{tier.priceUnit}
                            </span>
                          </div>
                          {isYearly && (
                            <p className="text-sm text-brand-emerald mt-1">
                              {t('pricing.saveAmount')}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {tier.priceLabel}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full mb-6 ${
                    tier.popular
                      ? 'bg-gradient-hero text-white hover:opacity-90'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tier.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, fIndex) => (
                    <motion.li
                      key={fIndex}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: fIndex * 0.05 }}
                      className="flex items-start space-x-3"
                    >
                      <Check className="w-5 h-5 text-brand-emerald flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-600 dark:text-gray-400 mt-12"
        >
          {t('pricing.bottomNote')}
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;

