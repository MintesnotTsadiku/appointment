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
    },
    {
      icon: DollarSign,
      color: 'from-emerald-500 to-green-500',
      title: t('valueProposition.value2Title'),
      description: t('valueProposition.value2Description'),
      metric: t('valueProposition.value2Metric'),
    },
    {
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      title: t('valueProposition.value3Title'),
      description: t('valueProposition.value3Description'),
      metric: t('valueProposition.value3Metric'),
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            {t('valueProposition.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
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
              <div className="relative p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                {/* Icon */}
                <div className={`relative w-16 h-16 mb-6 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center`}>
                  <value.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {value.description}
                  </p>

                  {/* Metric */}
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r ${value.color} bg-opacity-10 rounded-full`}>
                    <span className={`text-sm font-bold bg-gradient-to-r ${value.color} bg-clip-text text-transparent`}>
                      {value.metric}
                    </span>
                  </div>
                </div>

                {/* Decorative element */}
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;

