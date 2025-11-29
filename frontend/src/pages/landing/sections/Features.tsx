import { motion } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Smartphone,
  Users,
  UserCircle,
  BarChart3,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Calendar,
      title: t('features.feature1Title'),
      description: t('features.feature1Description'),
      image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600&fit=crop',
      imageAlt: 'Smart scheduling calendar interface',
      points: [1, 2, 3]
    },
    {
      icon: CreditCard,
      title: t('features.feature2Title'),
      description: t('features.feature2Description'),
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
      imageAlt: 'Payment integration with TeleBirr and Chapa',
      points: [1, 2, 3]
    },
    {
      icon: Smartphone,
      title: t('features.feature3Title'),
      description: t('features.feature3Description'),
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop',
      imageAlt: 'Multi-channel booking via SMS and WhatsApp',
      points: [1, 2, 3]
    },
    {
      icon: Users,
      title: t('features.feature4Title'),
      description: t('features.feature4Description'),
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
      imageAlt: 'Team and multi-location management',
      points: [1, 2, 3]
    },
    {
      icon: UserCircle,
      title: t('features.feature5Title'),
      description: t('features.feature5Description'),
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop',
      imageAlt: 'Customer relationship management',
      points: [1, 2, 3]
    },
    {
      icon: BarChart3,
      title: t('features.feature6Title'),
      description: t('features.feature6Description'),
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
      imageAlt: 'Analytics and reporting dashboard',
      points: [1, 2, 3]
    },
  ];

  return (
    <section id="features" className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full blur-[140px] opacity-15"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{ rotate: -360, x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 left-0 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
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
              Powerful Features
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('features.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Premium Features Showcase - Alternating Layout */}
        <div className="space-y-32">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 80 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className={`grid lg:grid-cols-2 gap-16 lg:gap-20 items-center ${
                  !isEven ? 'lg:grid-flow-dense' : ''
                }`}
              >
                {/* Premium Text Content */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className={!isEven ? 'lg:col-start-2 lg:row-start-1' : ''}
                >
                  {/* Premium Icon Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      delay: index * 0.1 + 0.3,
                      type: 'spring',
                      stiffness: 200,
                      damping: 15
                    }}
                    className="mb-8"
                  >
                    <div 
                      className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                        boxShadow: '0 15px 40px -10px var(--accent-primary)'
                      }}
                    >
                      <feature.icon className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>

                  {/* Premium Content */}
                  <h3 
                    className="text-4xl sm:text-5xl font-heading font-extrabold mb-6 leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {feature.title}
                  </h3>
                  <p 
                    className="text-xl sm:text-2xl mb-10 leading-relaxed font-light"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {feature.description}
                  </p>

                  {/* Premium Feature Highlights */}
                  <ul className="space-y-4 mb-8">
                    {feature.points.map((item) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.4 + item * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <div 
                          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 transition-transform group-hover:scale-110"
                          style={{ 
                            background: 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))',
                            boxShadow: '0 5px 20px -5px var(--accent-success)'
                          }}
                        >
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <span 
                          className="text-lg sm:text-xl pt-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {t(`features.feature${index + 1}Point${item}`)}
                        </span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Premium CTA Link */}
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-xl border cursor-pointer group"
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
                </motion.div>

                {/* Premium Visual Showcase */}
                <motion.div
                  initial={{ opacity: 0, x: isEven ? 60 : -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className={isEven ? '' : 'lg:col-start-1 lg:row-start-1'}
                >
                  <div className="relative">
                    {/* Premium Product Container */}
                    <motion.div
                      whileHover={{ scale: 1.02, y: -5 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="relative rounded-3xl overflow-hidden shadow-2xl border backdrop-blur-sm"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-default)',
                        boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      {/* Animated Gradient Background */}
                      <motion.div
                        animate={{ 
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{ 
                          duration: 10, 
                          repeat: Infinity, 
                          repeatType: 'reverse',
                          ease: 'linear'
                        }}
                        className="absolute inset-0 opacity-10"
                        style={{ 
                          background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to), var(--gradient-success-from))',
                          backgroundSize: '200% 200%'
                        }}
                      />

                      {/* Premium Product Image */}
                      <div className="relative">
                        <motion.img
                          src={feature.image}
                          alt={feature.imageAlt}
                          className="w-full h-[500px] object-cover"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                      </div>

                      {/* Premium Floating Elements */}
                      <motion.div
                        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute top-6 right-6 w-16 h-16 rounded-2xl backdrop-blur-xl border opacity-80"
                        style={{ 
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
                          borderColor: 'var(--border-default)',
                          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                      <motion.div
                        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: 1,
                        }}
                        className="absolute bottom-6 left-6 w-20 h-20 rounded-2xl backdrop-blur-xl border opacity-80"
                        style={{ 
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
                          borderColor: 'var(--border-default)',
                          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                    </motion.div>

                    {/* Premium Decorative Glow */}
                    <div 
                      className="absolute -z-10 -inset-8 rounded-3xl blur-3xl opacity-30"
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
