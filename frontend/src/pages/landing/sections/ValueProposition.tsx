import { motion } from 'framer-motion';
import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fadeInUp, staggerContainer } from '@/lib/animations';

const ValueProposition = () => {
  const { t } = useTranslation();

  const values = [
    {
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
      title: t('valueProposition.value1Title'),
      description: t('valueProposition.value1Description'),
      metric: t('valueProposition.value1Metric'),
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=250&fit=crop',
      imageAlt: 'Calendar scheduling automation'
    },
    {
      icon: DollarSign,
      color: 'from-emerald-500 to-green-500',
      title: t('valueProposition.value2Title'),
      description: t('valueProposition.value2Description'),
      metric: t('valueProposition.value2Metric'),
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=250&fit=crop',
      imageAlt: 'Local payment methods integration'
    },
    {
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      title: t('valueProposition.value3Title'),
      description: t('valueProposition.value3Description'),
      metric: t('valueProposition.value3Metric'),
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
      imageAlt: 'Business growth analytics'
    },
  ];

  return (
    <section className="py-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
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
            {t('valueProposition.title')}
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            {t('valueProposition.subtitle')}
          </p>
        </motion.div>

        {/* Value Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {values.map((value, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="relative group"
            >
              {/* Card */}
              <div 
                className="relative rounded-2xl backdrop-blur-sm hover:shadow-2xl transition-all duration-300 overflow-hidden group"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                {/* Background gradient on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ 
                    background: index === 0 
                      ? 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                      : index === 1
                      ? 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))'
                      : 'linear-gradient(to right, var(--gradient-secondary-from), var(--gradient-secondary-to))'
                  }}
                />

                {/* Screenshot Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={value.image}
                    alt={value.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Icon overlay */}
                  <div 
                    className="absolute top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ 
                      background: index === 0 
                        ? 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
                        : index === 1
                        ? 'linear-gradient(to right, var(--gradient-success-from), var(--gradient-success-to))'
                        : 'linear-gradient(to right, var(--gradient-secondary-from), var(--gradient-secondary-to))'
                    }}
                  >
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="relative p-6">
                  <h3 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {value.title}
                  </h3>
                  <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {value.description}
                  </p>

                  {/* Metric */}
                  <div 
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full"
                    style={{ 
                      backgroundColor: index === 0 
                        ? 'var(--accent-primary-light)'
                        : index === 1
                        ? 'var(--accent-success-light)'
                        : 'var(--accent-secondary-light)'
                    }}
                  >
                    <span 
                      className="text-xs font-bold"
                      style={{ 
                        color: index === 0 
                          ? 'var(--accent-primary)'
                          : index === 1
                          ? 'var(--accent-success)'
                          : 'var(--accent-secondary)'
                      }}
                    >
                      {value.metric}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;

