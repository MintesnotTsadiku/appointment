import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/button';
import {
  heroContentVariants,
  heroItemVariants,
  slideInFromRight,
} from '@/lib/animations';
import { useTranslation } from '@/lib/i18n';

const Hero = () => {
  const { t } = useTranslation();
  // Mock avatar URLs for trusted users
  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-0 -left-1/4 w-96 h-96 bg-gradient-hero opacity-30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-0 -right-1/4 w-96 h-96 bg-gradient-feature opacity-30 rounded-full blur-3xl"
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <motion.div
            variants={heroContentVariants}
            initial="initial"
            animate="animate"
            className="text-center lg:text-left"
          >
            {/* Eyebrow */}
            <motion.div variants={heroItemVariants} className="mb-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-brand-indigo/20 shadow-sm">
                <CheckCircle className="w-4 h-4 text-brand-emerald" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('hero.eyebrow')}
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight"
            >
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                {t('hero.headline1')}
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                {t('hero.headline2')}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroItemVariants}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              {t('hero.subheadline')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={heroItemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
            >
              <Button
                size="lg"
                className="bg-gradient-hero hover:opacity-90 text-white shadow-lg shadow-indigo-500/50 text-base sm:text-lg px-8 py-6 group"
              >
                <span>{t('hero.ctaPrimary')}</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 text-base sm:text-lg px-8 py-6 group"
              >
                <PlayCircle className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{t('hero.ctaSecondary')}</span>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={heroItemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-6"
            >
              {/* Avatar Stack */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {avatars.map((avatar, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden"
                    >
                      <img
                        src={avatar}
                        alt={`User ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="ml-3 flex items-center space-x-1">
                  <Users className="w-4 h-4 text-brand-indigo" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    10,000+ {t('hero.trustUsers')}
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-1">
                <div className="flex space-x-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-5 h-5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">
                  4.9/5 {t('hero.trustRating')} 1,247 {t('hero.trustReviews')}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            variants={slideInFromRight}
            initial="initial"
            animate="animate"
            className="relative hidden lg:block"
          >
            {/* Main Product Mockup */}
            <div className="relative">
              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -top-8 -left-8 z-20 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 max-w-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Appointment Confirmed
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Payment received: 500 ETB
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
                className="absolute -bottom-8 -right-8 z-20 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 max-w-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Revenue This Month
                  </p>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    +40%
                  </span>
                </div>
                <p className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  45,230 ETB
                </p>
              </motion.div>

              {/* Main Mockup Container */}
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                {/* Calendar Grid Mockup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        November 2024
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        32 appointments scheduled
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-hero rounded-lg"></div>
                  </div>

                  {/* Mini Calendar */}
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div
                        key={i}
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 pb-2"
                      >
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                          i % 7 === 0 || i % 7 === 6
                            ? 'text-gray-400 dark:text-gray-600'
                            : i % 5 === 0
                            ? 'bg-gradient-hero text-white font-semibold'
                            : i % 3 === 0
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {i + 1}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 top-1/4 right-1/4 w-32 h-32 bg-gradient-feature opacity-20 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 bottom-1/4 left-1/4 w-40 h-40 bg-gradient-hero opacity-20 rounded-full blur-2xl"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center space-y-2 text-gray-500 dark:text-gray-400"
        >
          <span className="text-sm font-medium">{t('hero.scrollPrompt')}</span>
          <div className="w-6 h-10 border-2 border-current rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-current rounded-full" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;

