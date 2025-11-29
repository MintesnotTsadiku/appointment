import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, PlayCircle, CheckCircle, Users, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
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
      url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=800&fit=crop',
      alt: 'Calendar scheduling interface',
      type: 'calendar'
    },
    {
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop',
      alt: 'Dashboard analytics view',
      type: 'dashboard'
    },
    {
      url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop',
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
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Premium Background with Multiple Layers */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `radial-gradient(ellipse at top, var(--glow-primary) 0%, transparent 50%),
                         radial-gradient(ellipse at bottom right, var(--glow-secondary) 0%, transparent 50%),
                         radial-gradient(ellipse at bottom left, var(--glow-success) 0%, transparent 50%),
                         var(--bg-primary)`
          }}
        />
        
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-20 right-20 w-96 h-96 rounded-full blur-[120px] opacity-40"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute bottom-20 left-20 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-[1600px] mx-auto w-full px-6 sm:px-8 lg:px-12 pt-32 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content (8 columns) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 text-center lg:text-left"
          >
            {/* Premium Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <div 
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {getContent(settings?.hero?.eyebrow, 'hero.eyebrow')}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-success)' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Main Headline - Premium Typography */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading font-extrabold text-6xl sm:text-7xl lg:text-8xl xl:text-9xl mb-8 leading-[1.1] tracking-tight"
            >
              <span 
                className="block bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from) 0%, var(--gradient-primary-to) 50%, var(--accent-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {getContent(settings?.hero?.headline1, 'hero.headline1')}
              </span>
              <span 
                className="block mt-2 bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from) 0%, var(--gradient-primary-to) 50%, var(--accent-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {getContent(settings?.hero?.headline2, 'hero.headline2')}
              </span>
            </motion.h1>

            {/* Subheadline - Premium Typography */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl sm:text-2xl lg:text-3xl mb-12 max-w-3xl mx-auto lg:mx-0 leading-relaxed font-light"
              style={{ color: 'var(--text-secondary)' }}
            >
              {getContent(settings?.hero?.subheadline, 'hero.subheadline')}
            </motion.p>

            {/* Premium CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex items-center justify-center gap-3 px-10 py-6 rounded-2xl font-semibold text-lg overflow-hidden shadow-2xl"
                style={{ 
                  background: 'linear-gradient(135deg, var(--gradient-primary-from) 0%, var(--gradient-primary-to) 100%)',
                  color: 'white',
                  boxShadow: '0 20px 60px -15px var(--accent-primary)'
                }}
              >
                <span className="relative z-10">{getContent(settings?.hero?.ctaPrimary, 'hero.ctaPrimary')}</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <motion.div
                  className="absolute inset-0"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--gradient-primary-to) 0%, var(--gradient-primary-from) 100%)'
                  }}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center justify-center gap-3 px-10 py-6 rounded-2xl font-semibold text-lg border-2 backdrop-blur-xl transition-all"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{getContent(settings?.hero?.ctaSecondary, 'hero.ctaSecondary')}</span>
              </motion.button>
            </motion.div>

            {/* Premium Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-8"
            >
              {/* Avatar Stack with Premium Design */}
              <div 
                className="flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-xl border"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex -space-x-3">
                  {avatars.map((avatar, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: 0.9 + index * 0.1,
                        type: 'spring',
                        stiffness: 200,
                        damping: 15
                      }}
                      className="w-12 h-12 rounded-full border-2 overflow-hidden shadow-lg"
                      style={{ 
                        borderColor: 'var(--bg-primary)',
                        zIndex: avatars.length - index
                      }}
                    >
                      <img
                        src={avatar}
                        alt={`User ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {settings?.hero?.trust?.count || '10,000+'}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {getContent(settings?.hero?.trust?.label, 'hero.trustUsers')}
                  </span>
                </div>
              </div>

              {/* Premium Rating Display */}
              <div 
                className="flex items-center gap-3 px-6 py-4 rounded-2xl backdrop-blur-xl border"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.svg
                      key={star}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.1 + star * 0.05 }}
                      className="w-5 h-5"
                      style={{ color: 'var(--accent-secondary)' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </motion.svg>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {settings?.hero?.trust?.rating || '4.9/5'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {settings?.hero?.trust?.reviewsCount || '1,247'} {t('hero.trustReviews')}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Premium Product Showcase (5 columns) */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Premium Product Container */}
            <div className="relative">
              {/* Main Product Showcase */}
              <div 
                className="relative rounded-3xl overflow-hidden shadow-2xl border backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-default)'
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                  >
                    <img
                      src={heroImages[currentImageIndex].url}
                      alt={heroImages[currentImageIndex].alt}
                      className="w-full h-[600px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Premium Image Label */}
                    <div 
                      className="absolute bottom-6 left-6 px-5 py-3 rounded-xl backdrop-blur-xl border"
                      style={{ 
                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
                        borderColor: 'var(--border-default)'
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {heroImages[currentImageIndex].alt}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Premium Carousel Navigation */}
                <div className="absolute bottom-6 right-6 flex gap-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className="relative group"
                    >
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === currentImageIndex ? 'w-8' : 'w-1.5'
                        }`}
                        style={{ 
                          backgroundColor: index === currentImageIndex 
                            ? 'var(--accent-primary)' 
                            : 'rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Floating Cards */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -top-12 -left-12 z-20 hidden xl:block"
              >
                <div 
                  className="rounded-2xl p-5 shadow-2xl backdrop-blur-xl border w-64"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 95%, transparent)',
                    borderColor: 'var(--border-default)',
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      }}
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Appointment Confirmed
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Payment received
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span 
                      className="text-2xl font-bold"
                      style={{ 
                        backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      500
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ETB</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                }}
                className="absolute -bottom-12 -right-12 z-20 hidden xl:block"
              >
                <div 
                  className="rounded-2xl p-5 shadow-2xl backdrop-blur-xl border w-72"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 95%, transparent)',
                    borderColor: 'var(--border-default)',
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Revenue This Month
                    </p>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        backgroundColor: 'var(--accent-success-light)',
                        color: 'var(--accent-success)'
                      }}
                    >
                      +40%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span 
                      className="text-3xl font-bold"
                      style={{ 
                        backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      45,230
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ETB</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" style={{ color: 'var(--accent-success)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Up from last month
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Premium Decorative Elements */}
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 top-1/4 right-1/4 w-40 h-40 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: 'var(--glow-primary)' }}
              />
              <motion.div
                animate={{ rotate: -360, scale: [1.2, 1, 1.2] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute -z-10 bottom-1/4 left-1/4 w-52 h-52 rounded-full blur-3xl opacity-25"
                style={{ backgroundColor: 'var(--glow-secondary)' }}
              />
            </div>
          </motion.div>
        </div>

        {/* Premium Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { icon: Users, label: 'Active Users', value: '10,000+', gradient: 'primary' },
            { icon: Zap, label: 'Appointments', value: '500K+', gradient: 'success' },
            { icon: TrendingUp, label: 'Revenue', value: '2.5M+ ETB', gradient: 'secondary' },
            { icon: CheckCircle, label: 'Uptime', value: '99.9%', gradient: 'primary' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative group"
            >
              <div 
                className="relative p-6 rounded-2xl backdrop-blur-xl border transition-all"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div 
                  className="inline-flex p-3 rounded-xl mb-4"
                  style={{ 
                    background: stat.gradient === 'primary'
                      ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : stat.gradient === 'success'
                      ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                      : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))'
                  }}
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div 
                  className="text-3xl font-bold mb-1"
                  style={{ 
                    backgroundImage: stat.gradient === 'primary'
                      ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : stat.gradient === 'success'
                      ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                      : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Premium Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('hero.scrollPrompt')}
          </span>
          <div 
            className="w-6 h-10 rounded-full flex justify-center pt-2 border-2"
            style={{ 
              borderColor: 'var(--border-default)'
            }}
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
