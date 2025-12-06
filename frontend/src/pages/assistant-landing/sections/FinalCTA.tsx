import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Shield, 
  Clock, 
  Headphones,
  CheckCircle
} from 'lucide-react';

const FinalCTA = () => {
  const trustPoints = [
    { icon: Shield, text: 'SOC 2 Compliant' },
    { icon: Clock, text: '48-hour deployment' },
    { icon: Headphones, text: '24/7 support' },
    { icon: CheckCircle, text: '7-day free trial' },
  ];

  return (
    <section className="relative py-32 overflow-hidden ast-bg-void">
      {/* Background Elements */}
      <div className="absolute inset-0 ast-grid-bg opacity-30" />
      
      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[180px]"
        style={{ background: 'radial-gradient(circle, var(--ast-glow-cyber) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[180px]"
        style={{ background: 'radial-gradient(circle, var(--ast-glow-signal) 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
        {/* Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div 
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full ast-bg-elevated"
            style={{ border: '1px solid var(--ast-border-glow)' }}
          >
            <div className="ast-status-dot" />
            <span className="ast-font-display text-sm font-medium ast-text-cyber">
              3 VAs AVAILABLE NOW
            </span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="ast-font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl mb-6 ast-text-bright leading-[1.1]"
        >
          Ready to <span className="ast-gradient-text">Deploy</span>?
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="ast-font-body text-xl sm:text-2xl ast-text-dim mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Stop drowning in tasks. Start scaling with precision. 
          Your elite virtual assistant is standing by.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="ast-btn-glow flex items-center justify-center gap-3 px-10 py-5 rounded-xl ast-font-body font-semibold text-lg"
            style={{ 
              boxShadow: '0 0 60px -10px var(--ast-glow-cyber)'
            }}
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="ast-panel flex items-center justify-center gap-3 px-10 py-5 rounded-xl ast-font-body font-medium text-lg ast-text-bright transition-all"
            style={{ border: '1px solid var(--ast-border-subtle)' }}
          >
            <span>Talk to an Expert</span>
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {trustPoints.map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <point.icon className="w-4 h-4 ast-text-cyber" />
              <span className="ast-font-body text-sm ast-text-dim">{point.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Terminal-style bottom text */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg ast-bg-surface"
            style={{ border: '1px solid var(--ast-border-subtle)' }}
          >
            <span className="ast-text-cyber">{'>'}</span>
            <span className="ast-font-display text-sm ast-text-dim">
              init --deploy --now
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="ast-text-cyber"
            >
              █
            </motion.span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
