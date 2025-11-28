import { motion } from 'framer-motion';
import { UserPlus, Settings, Share2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: UserPlus,
      title: t('howItWorks.step1Title'),
      duration: t('howItWorks.step1Duration'),
      description: t('howItWorks.step1Description'),
      color: 'from-blue-500 to-cyan-500',
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop',
      imageAlt: 'Set your availability and working hours'
    },
    {
      icon: Settings,
      title: t('howItWorks.step2Title'),
      duration: t('howItWorks.step2Duration'),
      description: t('howItWorks.step2Description'),
      color: 'from-purple-500 to-pink-500',
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=300&fit=crop',
      imageAlt: 'Configure your services and pricing'
    },
    {
      icon: Share2,
      title: t('howItWorks.step3Title'),
      duration: t('howItWorks.step3Duration'),
      description: t('howItWorks.step3Description'),
      color: 'from-amber-500 to-orange-500',
      image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=300&fit=crop',
      imageAlt: 'Share your booking link with customers'
    },
    {
      icon: CheckCircle2,
      title: t('howItWorks.step4Title'),
      duration: t('howItWorks.step4Duration'),
      description: t('howItWorks.step4Description'),
      color: 'from-green-500 to-emerald-500',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop',
      imageAlt: 'Automatic booking confirmation and payment'
    },
  ];

  return (
    <section className="py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        {/* Timeline - Desktop */}
        <div className="hidden lg:block relative">
          {/* Connecting Line */}
          <div 
            className="absolute top-1/2 left-0 right-0 h-1 transform -translate-y-1/2"
            style={{ 
              background: 'linear-gradient(to right, var(--glow-primary), var(--glow-secondary), var(--glow-success), var(--glow-primary))',
              opacity: 0.3
            }}
          />

          <div className="grid grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                {/* Step Card */}
                <div 
                  className="rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                      style={{ 
                        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* Screenshot Image */}
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.imageAlt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    
                    {/* Icon overlay */}
                    <div 
                      className="absolute bottom-3 left-3 w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
                      style={{ 
                        background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                      }}
                    >
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-base font-heading font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </h3>
                    <div 
                      className="text-xs font-bold text-center mb-2"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {step.duration}
                    </div>
                    <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Timeline - Mobile */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative pl-12"
            >
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div 
                  className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b to-transparent"
                  style={{ 
                    background: `linear-gradient(to bottom, var(--border-default), transparent)`
                  }}
                />
              )}

              {/* Step Number */}
              <div className="absolute left-0 top-0">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                  style={{ 
                    background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                  }}
                >
                  {index + 1}
                </div>
              </div>

              {/* Card */}
              <div 
                className="rounded-xl p-6 shadow-lg backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                    }}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-heading font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </h3>
                    <div 
                      className="text-sm font-bold mb-2"
                      style={{ 
                        backgroundImage: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      {step.duration}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('howItWorks.cta')}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
            style={{ 
              background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
            }}
          >
            {t('howItWorks.ctaButton')}
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

