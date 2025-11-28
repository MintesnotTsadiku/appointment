import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, PlayCircle, CheckCircle, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
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
      {/* Background uses CSS variables - ambient glows are handled by parent */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--bg-primary)' }} />

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
              <div 
                className="inline-flex items-center space-x-2 px-4 py-2 backdrop-blur-sm rounded-full"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {getContent(settings?.hero?.eyebrow, 'hero.eyebrow')}
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={heroItemVariants}
              className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight"
            >
              <span 
                className="bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                }}
              >
                {getContent(settings?.hero?.headline1, 'hero.headline1')}
              </span>
              <br />
              <span style={{ color: 'var(--text-primary)' }}>
                {getContent(settings?.hero?.headline2, 'hero.headline2')}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroItemVariants}
              className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto lg:mx-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              {getContent(settings?.hero?.subheadline, 'hero.subheadline')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={heroItemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group flex items-center gap-2 px-8 py-6 rounded-xl font-medium text-base sm:text-lg overflow-hidden"
                style={{ 
                  background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                  color: 'white'
                }}
              >
                <span>{getContent(settings?.hero?.ctaPrimary, 'hero.ctaPrimary')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-8 py-6 rounded-xl font-medium text-base sm:text-lg border-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{getContent(settings?.hero?.ctaSecondary, 'hero.ctaSecondary')}</span>
              </motion.button>
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
                  <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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
                      className="w-5 h-5 fill-current"
                      style={{ color: 'var(--accent-secondary)' }}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium ml-2" style={{ color: 'var(--text-primary)' }}>
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
                  className="absolute -top-8 -left-8 z-20 rounded-2xl shadow-2xl p-4 max-w-xs backdrop-blur-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                      }}
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Appointment Confirmed
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
                  className="absolute -bottom-8 -right-8 z-20 rounded-2xl shadow-2xl p-4 max-w-xs backdrop-blur-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Revenue This Month
                    </p>
                    <span 
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: 'var(--accent-success-light)',
                        color: 'var(--accent-success)'
                      }}
                    >
                      +40%
                    </span>
                  </div>
                  <p 
                    className="text-2xl font-bold bg-clip-text text-transparent"
                    style={{ 
                      backgroundImage: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                    }}
                  >
                    45,230 ETB
                  </p>
                </motion.div>

                {/* Main Mockup Container with Carousel */}
                <div 
                  className="relative rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Image label */}
                    <div 
                      className="absolute bottom-4 left-4 px-4 py-2 backdrop-blur-sm rounded-lg"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)'
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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

              {/* Decorative Elements - using CSS variables */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 top-1/4 right-1/4 w-32 h-32 opacity-20 rounded-full blur-2xl"
                style={{ backgroundColor: 'var(--glow-secondary)' }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 bottom-1/4 left-1/4 w-40 h-40 opacity-20 rounded-full blur-2xl"
                style={{ backgroundColor: 'var(--glow-primary)' }}
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
          className="flex flex-col items-center space-y-2"
          style={{ color: 'var(--text-muted)' }}
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

