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
      image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=400&fit=crop',
      imageAlt: 'Smart scheduling calendar interface'
    },
    {
      icon: CreditCard,
      title: t('features.feature2Title'),
      description: t('features.feature2Description'),
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop',
      imageAlt: 'Payment integration with TeleBirr and Chapa'
    },
    {
      icon: Smartphone,
      title: t('features.feature3Title'),
      description: t('features.feature3Description'),
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop',
      imageAlt: 'Multi-channel booking via SMS and WhatsApp'
    },
    {
      icon: Users,
      title: t('features.feature4Title'),
      description: t('features.feature4Description'),
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
      imageAlt: 'Team and multi-location management'
    },
    {
      icon: UserCircle,
      title: t('features.feature5Title'),
      description: t('features.feature5Description'),
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=400&fit=crop',
      imageAlt: 'Customer relationship management'
    },
    {
      icon: BarChart3,
      title: t('features.feature6Title'),
      description: t('features.feature6Description'),
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
      imageAlt: 'Analytics and reporting dashboard'
    },
  ];

  return (
    <section id="features" className="py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
            {t('features.title')}
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
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
                  <div 
                    className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                    }}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
                    {feature.description}
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <li key={item} className="flex items-start space-x-3">
                        <div 
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                          style={{ 
                            background: 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))'
                          }}
                        >
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
                        <span style={{ color: 'var(--text-primary)' }}>
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
                    <div 
                      className="relative rounded-2xl shadow-2xl p-8 backdrop-blur-sm overflow-hidden"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)'
                      }}
                    >
                      {/* Animated background */}
                      <div 
                        className="absolute inset-0 opacity-5"
                        style={{ 
                          background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                        }}
                      />

                      {/* Real Product Screenshot */}
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.3 }}
                          className="relative overflow-hidden rounded-xl"
                        >
                          <img
                            src={feature.image}
                            alt={feature.imageAlt}
                            className="w-full h-64 object-cover"
                            loading="lazy"
                          />
                          {/* Overlay gradient for better text contrast */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </motion.div>
                      </div>

                      {/* Floating elements */}
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute top-4 right-4 w-12 h-12 rounded-full opacity-20"
                        style={{ backgroundColor: 'var(--glow-primary)' }}
                      />
                      <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: 0.5,
                        }}
                        className="absolute bottom-4 left-4 w-16 h-16 rounded-full opacity-20"
                        style={{ backgroundColor: 'var(--glow-success)' }}
                      />
                    </div>

                    {/* Decorative elements */}
                    <div 
                      className="absolute -z-10 -inset-4 rounded-3xl blur-2xl"
                      style={{ backgroundColor: 'var(--glow-primary)' }}
                    />
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

