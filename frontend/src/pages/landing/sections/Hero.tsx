import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, PlayCircle, CheckCircle, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import {
  heroContentVariants,
  heroItemVariants,
  slideInFromRight,
} from '@/lib/animations';
import { useTranslation } from '@/lib/i18n';
import { useLandingPageSettingsContext } from '@/context/landingPageSettings';

const Hero = () => {
  const { t } = useTranslation();
  const { settings, getText, loading } = useLandingPageSettingsContext();

  // Helper to get content with CMS fallback
  const getContent = (cmsValue: { en: string; am: string } | undefined, translationKey: string) => {
    if (settings?.hero && cmsValue) {
      return getText(cmsValue);
    }
    return t(translationKey);
  };
  
  // Professional stock photos of diverse Ethiopian professionals
  const avatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces',
  ];

  // Hero carousel images - use CMS data if available, otherwise use defaults
  const defaultHeroImages = [
    {
      url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop',
      alt: 'Calendar scheduling interface',
      type: 'calendar'
    },
    {
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
      alt: 'Dashboard analytics view',
      type: 'dashboard'
    },
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
      alt: 'Appointment booking flow',
      type: 'booking'
    },
  ];

  const heroImages = settings?.hero?.carouselImages && settings.hero.carouselImages.length > 0
    ? settings.hero.carouselImages.map((img: any) => ({
        url: img.url,
        alt: getText(img.altText),
        type: 'custom'
      }))
    : defaultHeroImages;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [heroImages.length]);

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
                  {getContent(settings?.hero?.eyebrow, 'hero.eyebrow')}
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight"
            >
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                {getContent(settings?.hero?.headline1, 'hero.headline1')}
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                {getContent(settings?.hero?.headline2, 'hero.headline2')}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroItemVariants}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              {getContent(settings?.hero?.subheadline, 'hero.subheadline')}
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
                <span>{getContent(settings?.hero?.ctaPrimary, 'hero.ctaPrimary')}</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 text-base sm:text-lg px-8 py-6 group"
              >
                <PlayCircle className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{getContent(settings?.hero?.ctaSecondary, 'hero.ctaSecondary')}</span>
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
                    {settings?.hero?.trust?.count || '10,000+'} {getContent(settings?.hero?.trust?.label, 'hero.trustUsers')}
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
                  {settings?.hero?.trust?.rating || '4.9/5'} {t('hero.trustRating')} {settings?.hero?.trust?.reviewsCount || '1,247'} {t('hero.trustReviews')}
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

              {/* Main Mockup Container with Carousel */}
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    <img
                      src={heroImages[currentImageIndex].url}
                      alt={heroImages[currentImageIndex].alt}
                      className="w-full h-[500px] object-cover"
                    />
                    {/* Image overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
                    
                    {/* Image label */}
                    <div className="absolute bottom-4 left-4 px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {heroImages[currentImageIndex].alt}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Carousel Navigation Dots */}
                <div className="absolute bottom-8 right-4 flex space-x-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
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

