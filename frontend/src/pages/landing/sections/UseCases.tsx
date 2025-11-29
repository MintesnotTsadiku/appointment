import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  Scissors,
  Briefcase,
  Video,
  GraduationCap,
  Building2,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const UseCases = () => {
  const { t } = useTranslation();
  const [activeCase, setActiveCase] = useState(0);

  const useCases = [
    {
      icon: Stethoscope,
      title: t('useCases.case1Title'),
      subtitle: t('useCases.case1Subtitle'),
      description: t('useCases.case1Description'),
      example: t('useCases.case1Example'),
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
      imageAlt: 'Healthcare appointment scheduling',
      gradient: 'primary'
    },
    {
      icon: Scissors,
      title: t('useCases.case2Title'),
      subtitle: t('useCases.case2Subtitle'),
      description: t('useCases.case2Description'),
      example: t('useCases.case2Example'),
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
      imageAlt: 'Beauty salon booking system',
      gradient: 'secondary'
    },
    {
      icon: Briefcase,
      title: t('useCases.case3Title'),
      subtitle: t('useCases.case3Subtitle'),
      description: t('useCases.case3Description'),
      example: t('useCases.case3Example'),
      image: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=600&fit=crop',
      imageAlt: 'Professional consulting scheduling',
      gradient: 'success'
    },
    {
      icon: Video,
      title: t('useCases.case4Title'),
      subtitle: t('useCases.case4Subtitle'),
      description: t('useCases.case4Description'),
      example: t('useCases.case4Example'),
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop',
      imageAlt: 'Content creator meet and greet booking',
      gradient: 'primary'
    },
    {
      icon: GraduationCap,
      title: t('useCases.case5Title'),
      subtitle: t('useCases.case5Subtitle'),
      description: t('useCases.case5Description'),
      example: t('useCases.case5Example'),
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&h=600&fit=crop',
      imageAlt: 'Educational institution scheduling',
      gradient: 'secondary'
    },
    {
      icon: Building2,
      title: t('useCases.case6Title'),
      subtitle: t('useCases.case6Subtitle'),
      description: t('useCases.case6Description'),
      example: t('useCases.case6Example'),
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
      imageAlt: 'Professional services booking',
      gradient: 'success'
    },
  ];

  return (
    <section id="use-cases" className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[140px] opacity-15"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{ rotate: -360, scale: [1.2, 1, 1.2] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
          style={{ backgroundColor: 'var(--glow-success)' }}
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
              Use Cases
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('useCases.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('useCases.subtitle')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Premium Tab List */}
          <div className="space-y-4">
            {useCases.map((useCase, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveCase(index)}
                whileHover={{ x: 8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="w-full text-left p-6 rounded-2xl transition-all duration-300 backdrop-blur-xl border group"
                style={{ 
                  backgroundColor: activeCase === index 
                    ? 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)' 
                    : 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
                  borderColor: activeCase === index ? 'var(--accent-primary)' : 'var(--border-default)',
                  borderWidth: activeCase === index ? '2px' : '1px',
                  boxShadow: activeCase === index 
                    ? '0 10px 40px -15px var(--accent-primary)' 
                    : '0 5px 20px -10px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div className="flex items-center gap-4">
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
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ 
                      background: useCase.gradient === 'primary'
                        ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                        : useCase.gradient === 'success'
                        ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                        : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                    }}
                  >
                    <useCase.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 
                      className="text-xl font-bold mb-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {useCase.title}
                    </h3>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {useCase.subtitle}
                    </p>
                  </div>
                  <motion.div
                    animate={{ 
                      scale: activeCase === index ? 1.2 : 1,
                      opacity: activeCase === index ? 1 : 0.5
                    }}
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: activeCase === index ? 'var(--accent-primary)' : 'var(--border-default)',
                    }}
                  />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Premium Content Display */}
          <div className="relative lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl overflow-hidden shadow-2xl border backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.4)'
                }}
              >
                {/* Premium Screenshot Image */}
                <div className="relative h-72 overflow-hidden">
                  <motion.img
                    key={`img-${activeCase}`}
                    src={useCases[activeCase].image}
                    alt={useCases[activeCase].imageAlt}
                    className="w-full h-full object-cover"
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  
                  {/* Premium Icon Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 200,
                      damping: 15
                    }}
                    className="absolute top-6 left-6"
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
                      style={{ 
                        background: useCases[activeCase].gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : useCases[activeCase].gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                        boxShadow: '0 10px 30px -10px var(--accent-primary)'
                      }}
                    >
                      {(() => {
                        const Icon = useCases[activeCase].icon;
                        return <Icon className="w-8 h-8 text-white" />;
                      })()}
                    </div>
                  </motion.div>
                </div>

                {/* Premium Content */}
                <div className="p-8 lg:p-10">
                  <h3 
                    className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {useCases[activeCase].title}
                  </h3>
                  <p 
                    className="text-lg sm:text-xl mb-8 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {useCases[activeCase].description}
                  </p>

                  {/* Premium Example Card */}
                  <div 
                    className="p-6 rounded-2xl backdrop-blur-xl border mb-8"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <p 
                      className="text-sm font-semibold mb-3 uppercase tracking-wider"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {t('useCases.exampleLabel')}
                    </p>
                    <p 
                      className="text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {useCases[activeCase].example}
                    </p>
                  </div>

                  {/* Premium Stats/Benefits */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -3 }}
                      className="text-center p-6 rounded-2xl backdrop-blur-xl border"
                      style={{ 
                        backgroundColor: 'var(--accent-primary-light)',
                        borderColor: 'var(--accent-primary)'
                      }}
                    >
                      <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-primary)' }} />
                      <div 
                        className="text-3xl font-extrabold mb-1"
                        style={{ 
                          backgroundImage: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        40%
                      </div>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {t('useCases.benefitTime')}
                      </div>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -3 }}
                      className="text-center p-6 rounded-2xl backdrop-blur-xl border"
                      style={{ 
                        backgroundColor: 'var(--accent-success-light)',
                        borderColor: 'var(--accent-success)'
                      }}
                    >
                      <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-success)' }} />
                      <div 
                        className="text-3xl font-extrabold mb-1"
                        style={{ 
                          backgroundImage: 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        3x
                      </div>
                      <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {t('useCases.benefitBookings')}
                      </div>
                    </motion.div>
                  </div>

                  {/* Premium CTA */}
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-xl border cursor-pointer group"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                      borderColor: 'var(--border-default)'
                    }}
                  >
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Learn more
                    </span>
                    <ArrowRight 
                      className="w-5 h-5 transition-transform group-hover:translate-x-1"
                      style={{ color: 'var(--accent-primary)' }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
