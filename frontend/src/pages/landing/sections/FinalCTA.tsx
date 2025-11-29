import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2, Zap, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const FinalCTA = () => {
  const { t } = useTranslation();

  const trustItems = [
    { icon: CheckCircle2, text: t('finalCTA.trust1') },
    { icon: Zap, text: t('finalCTA.trust2') },
    { icon: Shield, text: t('finalCTA.trust3') },
  ];

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Premium Animated Background */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
        }}
      >
        {/* Premium Animated Shapes */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        />
        <motion.div
          animate={{
            scale: [1.3, 1, 1.3],
            rotate: [360, 180, 0],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -bottom-1/2 -right-1/4 w-[700px] h-[700px] rounded-full blur-[160px]"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      {/* Premium Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-full mb-10 backdrop-blur-xl border shadow-lg"
            style={{ 
              backgroundColor: 'color-mix(in srgb, white 20%, transparent)',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-sm font-semibold text-white">
              {t('finalCTA.badge')}
            </span>
          </motion.div>

          {/* Premium Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-heading font-extrabold text-white mb-8 leading-tight"
          >
            {t('finalCTA.headline')}
          </motion.h2>

          {/* Premium Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl sm:text-2xl lg:text-3xl text-white/90 mb-14 max-w-3xl mx-auto leading-relaxed font-light"
          >
            {t('finalCTA.subheadline')}
          </motion.p>

          {/* Premium CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.96 }}
              className="group relative bg-white shadow-2xl text-xl px-12 py-7 rounded-2xl font-bold flex items-center gap-3 overflow-hidden"
              style={{ 
                color: 'var(--accent-primary)',
                boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.4)'
              }}
            >
              <span className="relative z-10">{t('finalCTA.primaryButton')}</span>
              <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" />
              <motion.div
                className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                  opacity: 0
                }}
                whileHover={{ opacity: 0.1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>

          {/* Premium Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center items-center gap-8 sm:gap-12"
          >
            {trustItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.1, y: -4 }}
                className="flex items-center space-x-3 group"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, white 20%, transparent)',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/90 text-base sm:text-lg font-semibold">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
