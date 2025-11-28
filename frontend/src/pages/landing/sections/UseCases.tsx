import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  Scissors,
  Briefcase,
  Video,
  GraduationCap,
  Building2,
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
      color: 'from-red-500 to-pink-500',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
      imageAlt: 'Healthcare appointment scheduling'
    },
    {
      icon: Scissors,
      title: t('useCases.case2Title'),
      subtitle: t('useCases.case2Subtitle'),
      description: t('useCases.case2Description'),
      example: t('useCases.case2Example'),
      color: 'from-purple-500 to-indigo-500',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop',
      imageAlt: 'Beauty salon booking system'
    },
    {
      icon: Briefcase,
      title: t('useCases.case3Title'),
      subtitle: t('useCases.case3Subtitle'),
      description: t('useCases.case3Description'),
      example: t('useCases.case3Example'),
      color: 'from-blue-500 to-cyan-500',
      image: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=400&fit=crop',
      imageAlt: 'Professional consulting scheduling'
    },
    {
      icon: Video,
      title: t('useCases.case4Title'),
      subtitle: t('useCases.case4Subtitle'),
      description: t('useCases.case4Description'),
      example: t('useCases.case4Example'),
      color: 'from-pink-500 to-rose-500',
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop',
      imageAlt: 'Content creator meet and greet booking'
    },
    {
      icon: GraduationCap,
      title: t('useCases.case5Title'),
      subtitle: t('useCases.case5Subtitle'),
      description: t('useCases.case5Description'),
      example: t('useCases.case5Example'),
      color: 'from-green-500 to-emerald-500',
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop',
      imageAlt: 'Educational institution scheduling'
    },
    {
      icon: Building2,
      title: t('useCases.case6Title'),
      subtitle: t('useCases.case6Subtitle'),
      description: t('useCases.case6Description'),
      example: t('useCases.case6Example'),
      color: 'from-amber-500 to-orange-500',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
      imageAlt: 'Professional services booking'
    },
  ];

  return (
    <section id="use-cases" className="py-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('useCases.title')}
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {t('useCases.subtitle')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Tab List */}
          <div className="space-y-3">
            {useCases.map((useCase, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveCase(index)}
                whileHover={{ x: 8 }}
                className="w-full text-left p-6 rounded-xl transition-all duration-300 backdrop-blur-sm"
                style={{ 
                  backgroundColor: activeCase === index ? 'var(--bg-elevated)' : 'var(--border-subtle)',
                  border: activeCase === index ? '2px solid var(--accent-primary)' : '2px solid var(--border-default)'
                }}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <useCase.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {useCase.title}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {useCase.subtitle}
                    </p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ 
                      backgroundColor: activeCase === index ? 'var(--accent-primary)' : 'var(--border-default)',
                      transform: activeCase === index ? 'scale(1)' : 'scale(0.75)'
                    }}
                  />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Content Display */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                {/* Screenshot Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={useCases[activeCase].image}
                    alt={useCases[activeCase].imageAlt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Icon overlay */}
                  <div
                    className={`absolute top-4 left-4 w-14 h-14 rounded-xl bg-gradient-to-br ${useCases[activeCase].color} flex items-center justify-center shadow-lg`}
                  >
                    {(() => {
                      const Icon = useCases[activeCase].icon;
                      return <Icon className="w-7 h-7 text-white" />;
                    })()}
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  <h3 className="text-2xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {useCases[activeCase].title}
                  </h3>
                  <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {useCases[activeCase].description}
                  </p>

                  {/* Example */}
                  <div 
                    className="p-4 rounded-xl backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                      {t('useCases.exampleLabel')}
                    </p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {useCases[activeCase].example}
                    </p>
                  </div>

                  {/* Stats/Benefits */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div 
                      className="text-center p-4 rounded-xl backdrop-blur-sm"
                      style={{ 
                        backgroundColor: 'var(--accent-primary-light)'
                      }}
                    >
                      <div 
                        className="text-2xl font-bold"
                        style={{ 
                          backgroundImage: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        40%
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {t('useCases.benefitTime')}
                      </div>
                    </div>
                    <div 
                      className="text-center p-4 rounded-xl backdrop-blur-sm"
                      style={{ 
                        backgroundColor: 'var(--accent-success-light)'
                      }}
                    >
                      <div 
                        className="text-2xl font-bold"
                        style={{ 
                          backgroundImage: 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        3x
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {t('useCases.benefitBookings')}
                      </div>
                    </div>
                  </div>
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

