import { motion } from 'framer-motion';
import { Clock, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const ValueProposition = () => {
  const { t } = useTranslation();

  const values = [
    {
      icon: Clock,
      title: t('valueProposition.value1Title'),
      description: t('valueProposition.value1Description'),
      metric: t('valueProposition.value1Metric'),
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop',
      imageAlt: 'Calendar scheduling automation',
      gradient: 'primary'
    },
    {
      icon: DollarSign,
      title: t('valueProposition.value2Title'),
      description: t('valueProposition.value2Description'),
      metric: t('valueProposition.value2Metric'),
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
      imageAlt: 'Local payment methods integration',
      gradient: 'success'
    },
    {
      icon: TrendingUp,
      title: t('valueProposition.value3Title'),
      description: t('valueProposition.value3Description'),
      metric: t('valueProposition.value3Metric'),
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
      imageAlt: 'Business growth analytics',
      gradient: 'secondary'
    },
  ];

  return (
    <section className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Section Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{ rotate: -360, scale: [1.2, 1, 1.2] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] opacity-20"
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
              Why Choose Us
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('valueProposition.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('valueProposition.subtitle')}
          </p>
        </motion.div>

        {/* Premium Value Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="relative group"
            >
              {/* Premium Card */}
              <div 
                className="relative h-full rounded-3xl overflow-hidden backdrop-blur-xl border transition-all duration-500"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'var(--border-default)',
                  boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Hover Gradient Overlay */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: value.gradient === 'primary'
                      ? 'linear-gradient(135deg, var(--gradient-primary-from) 0%, transparent 70%)'
                      : value.gradient === 'success'
                      ? 'linear-gradient(135deg, var(--gradient-success-from) 0%, transparent 70%)'
                      : 'linear-gradient(135deg, var(--gradient-secondary-from) 0%, transparent 70%)',
                  }}
                />

                {/* Premium Image Section */}
                <div className="relative h-64 overflow-hidden">
                  <motion.img
                    src={value.image}
                    alt={value.imageAlt}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Premium Icon Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      delay: 0.3 + index * 0.15,
                      type: 'spring',
                      stiffness: 200,
                      damping: 15
                    }}
                    className="absolute top-6 left-6"
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
                      style={{ 
                        background: value.gradient === 'primary'
                          ? 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                          : value.gradient === 'success'
                          ? 'linear-gradient(135deg, var(--gradient-success-from), var(--gradient-success-to))'
                          : 'linear-gradient(135deg, var(--gradient-secondary-from), var(--gradient-secondary-to))',
                        boxShadow: '0 10px 30px -10px var(--accent-primary)'
                      }}
                    >
                      <value.icon className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>
                </div>

                {/* Premium Content */}
                <div className="relative p-8">
                  <h3 
                    className="text-2xl sm:text-3xl font-heading font-bold mb-4"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {value.title}
                  </h3>
                  <p 
                    className="text-base sm:text-lg mb-6 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {value.description}
                  </p>

                  {/* Premium Metric Badge */}
                  <div className="flex items-center justify-between">
                    <div 
                      className="px-5 py-2.5 rounded-xl font-bold text-sm backdrop-blur-sm border"
                      style={{ 
                        backgroundColor: value.gradient === 'primary'
                          ? 'var(--accent-primary-light)'
                          : value.gradient === 'success'
                          ? 'var(--accent-success-light)'
                          : 'var(--accent-secondary-light)',
                        borderColor: value.gradient === 'primary'
                          ? 'var(--accent-primary)'
                          : value.gradient === 'success'
                          ? 'var(--accent-success)'
                          : 'var(--accent-secondary)',
                        color: value.gradient === 'primary'
                          ? 'var(--accent-primary)'
                          : value.gradient === 'success'
                          ? 'var(--accent-success)'
                          : 'var(--accent-secondary)'
                      }}
                    >
                      {value.metric}
                    </div>
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="p-2 rounded-lg backdrop-blur-sm border cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-default)'
                      }}
                    >
                      <ArrowRight 
                        className="w-5 h-5"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
