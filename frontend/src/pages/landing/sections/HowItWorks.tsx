import { motion } from 'framer-motion';
import { UserPlus, Settings, Share2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: UserPlus,
      title: t('howItWorks.step1Title'),
      duration: t('howItWorks.step1Duration'),
      description: t('howItWorks.step1Description'),
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&h=400&fit=crop',
      imageAlt: 'Set your availability and working hours',
      gradient: 'primary'
    },
    {
      icon: Settings,
      title: t('howItWorks.step2Title'),
      duration: t('howItWorks.step2Duration'),
      description: t('howItWorks.step2Description'),
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop',
      imageAlt: 'Configure your services and pricing',
      gradient: 'secondary'
    },
    {
      icon: Share2,
      title: t('howItWorks.step3Title'),
      duration: t('howItWorks.step3Duration'),
      description: t('howItWorks.step3Description'),
      image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=600&h=400&fit=crop',
      imageAlt: 'Share your booking link with customers',
      gradient: 'success'
    },
    {
      icon: CheckCircle2,
      title: t('howItWorks.step4Title'),
      duration: t('howItWorks.step4Duration'),
      description: t('howItWorks.step4Description'),
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop',
      imageAlt: 'Automatic booking confirmation and payment',
      gradient: 'primary'
    },
  ];

  return (
    <section className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.3, 1] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[160px] opacity-10"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Premium Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl mx-auto mb-24"
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
              How It Works
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('howItWorks.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        {/* Premium Timeline - Desktop */}
        <div className="hidden lg:block relative mb-20">
          {/* Premium Connecting Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 left-0 right-0 h-1.5 transform -translate-y-1/2 rounded-full"
            style={{ 
              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-secondary-from), var(--gradient-success-from), var(--gradient-primary-to))',
              opacity: 0.4
            }}
          />

          <div className="grid grid-cols-4 gap-8 lg:gap-12 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.15,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative"
              >
                {/* Premium Step Card */}
                <div 
                  className="rounded-3xl overflow-hidden shadow-2xl border backdrop-blur-sm transition-all duration-500"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-default)',
                    boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Premium Step Number Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      delay: index * 0.15 + 0.3,
                      type: 'spring',
                      stiffness: 200,
                      damping: 15
                    }}
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-2xl"
                      style={{ 
                        background: step.gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : step.gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                        boxShadow: '0 10px 30px -10px var(--accent-primary)'
                      }}
                    >
                      {index + 1}
                    </div>
                  </motion.div>

                  {/* Premium Screenshot Image */}
                  <div className="relative h-56 overflow-hidden">
                    <motion.img
                      src={step.image}
                      alt={step.imageAlt}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                    
                    {/* Premium Icon Badge */}
                    <div 
                      className="absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ 
                        background: step.gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : step.gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                      }}
                    >
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Premium Content */}
                  <div className="p-6">
                    <h3 
                      className="text-lg font-heading font-bold text-center mb-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </h3>
                    <div 
                      className="text-sm font-bold text-center mb-3"
                      style={{ 
                        backgroundImage: step.gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : step.gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {step.duration}
                    </div>
                    <p 
                      className="text-sm text-center leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Premium Timeline - Mobile */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative pl-16"
            >
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div 
                  className="absolute left-8 top-16 bottom-0 w-0.5"
                  style={{ 
                    background: `linear-gradient(to bottom, var(--border-default), transparent)`
                  }}
                />
              )}

              {/* Premium Step Number */}
              <div className="absolute left-0 top-0">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg"
                  style={{ 
                    background: step.gradient === 'primary'
                      ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : step.gradient === 'success'
                      ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                      : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                  }}
                >
                  {index + 1}
                </div>
              </div>

              {/* Premium Card */}
              <div 
                className="rounded-2xl p-6 shadow-xl border backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)'
                }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ 
                      background: step.gradient === 'primary'
                        ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                        : step.gradient === 'success'
                        ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                        : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                    }}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="text-xl font-heading font-bold mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </h3>
                    <div 
                      className="text-sm font-bold mb-3"
                      style={{ 
                        backgroundImage: step.gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : step.gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {step.duration}
                    </div>
                    <p 
                      className="text-base leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Premium CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mt-20"
        >
          <p 
            className="text-xl sm:text-2xl mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('howItWorks.cta')}
          </p>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex items-center justify-center gap-3 px-10 py-6 rounded-2xl font-semibold text-lg overflow-hidden shadow-2xl mx-auto"
            style={{ 
              background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
              color: 'white',
              boxShadow: '0 20px 60px -15px var(--accent-primary)'
            }}
          >
            <span className="relative z-10">{t('howItWorks.ctaButton')}</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            <motion.div
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(135deg, var(--gradient-primary-to), var(--gradient-primary-from))'
              }}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
