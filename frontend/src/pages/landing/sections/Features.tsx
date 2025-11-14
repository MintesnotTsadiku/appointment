import { motion } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Smartphone,
  Users,
  UserCircle,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fadeInUp, slideInFromRight, slideInFromLeft } from '@/lib/animations';

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Calendar,
      title: t('features.feature1Title'),
      description: t('features.feature1Description'),
      visual: '📅',
    },
    {
      icon: CreditCard,
      title: t('features.feature2Title'),
      description: t('features.feature2Description'),
      visual: '💳',
    },
    {
      icon: Smartphone,
      title: t('features.feature3Title'),
      description: t('features.feature3Description'),
      visual: '📱',
    },
    {
      icon: Users,
      title: t('features.feature4Title'),
      description: t('features.feature4Description'),
      visual: '👥',
    },
    {
      icon: UserCircle,
      title: t('features.feature5Title'),
      description: t('features.feature5Description'),
      visual: '❤️',
    },
    {
      icon: BarChart3,
      title: t('features.feature6Title'),
      description: t('features.feature6Description'),
      visual: '📊',
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Features List - Alternating Layout */}
        <div className="space-y-24">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  !isEven ? 'lg:grid-flow-dense' : ''
                }`}
              >
                {/* Text Content */}
                <motion.div
                  variants={isEven ? slideInFromLeft : slideInFromRight}
                  className={!isEven ? 'lg:col-start-2' : ''}
                >
                  {/* Icon */}
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-hero flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    {feature.description}
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <li key={item} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-emerald flex items-center justify-center mt-0.5">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t(`features.feature${index + 1}Point${item}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Visual */}
                <motion.div
                  variants={isEven ? slideInFromRight : slideInFromLeft}
                  className={isEven ? '' : 'lg:col-start-1 lg:row-start-1'}
                >
                  <div className="relative">
                    {/* Main visual container */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {/* Animated background */}
                      <div className="absolute inset-0 bg-gradient-hero opacity-5" />

                      {/* Large emoji/icon visual */}
                      <div className="relative text-center">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="text-9xl mb-4"
                        >
                          {feature.visual}
                        </motion.div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {feature.title}
                        </div>
                      </div>

                      {/* Floating elements */}
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute top-4 right-4 w-12 h-12 bg-brand-indigo rounded-full opacity-20"
                      />
                      <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: 0.5,
                        }}
                        className="absolute bottom-4 left-4 w-16 h-16 bg-brand-emerald rounded-full opacity-20"
                      />
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -z-10 -inset-4 bg-gradient-to-br from-brand-indigo/20 to-brand-emerald/20 rounded-3xl blur-2xl" />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;

