import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  Clock, 
  Users,
  Terminal,
  Activity
} from 'lucide-react';

const Hero = () => {
  // Stats displayed in the hero terminal
  const terminalStats = [
    { label: 'Active VAs', value: '150+', icon: Users },
    { label: 'Tasks Completed', value: '25,000+', icon: Activity },
    { label: 'Uptime', value: '99.9%', icon: Shield },
  ];

  // Staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden ast-bg-void">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 ast-grid-bg" />
      
      {/* Scan Line Effect */}
      <div className="absolute inset-0 ast-scanline pointer-events-none" />
      
      {/* Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[150px]"
        style={{ background: 'radial-gradient(circle, var(--ast-glow-cyber) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px]"
        style={{ background: 'radial-gradient(circle, var(--ast-glow-signal) 0%, transparent 70%)' }}
      />

      {/* Content Container */}
      <div className="relative z-10 max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-12 py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Status Badge */}
            <motion.div variants={itemVariants} className="mb-8">
              <div 
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full ast-bg-elevated"
                style={{ border: '1px solid var(--ast-border-glow)' }}
              >
                <div className="ast-status-dot" />
                <span className="ast-font-display text-sm font-medium ast-text-cyber">
                  SYSTEM ONLINE
                </span>
                <span className="ast-text-muted">|</span>
                <span className="ast-font-body text-sm ast-text-dim">
                  Virtual Assistant Command
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="ast-font-display font-bold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl mb-6 leading-[1.05] tracking-tight"
            >
              <span className="ast-text-bright block">Your Personal</span>
              <span className="ast-gradient-text block">Command Center</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="ast-font-body text-xl sm:text-2xl mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed ast-text-dim"
            >
              Elite virtual assistants on standby. Delegate tasks, reclaim your time, 
              and scale your operations with precision.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="ast-btn-glow flex items-center justify-center gap-3 px-8 py-4 rounded-xl ast-font-body font-semibold text-lg"
              >
                <Terminal className="w-5 h-5" />
                <span>Deploy Your VA</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="ast-panel flex items-center justify-center gap-3 px-8 py-4 rounded-xl ast-font-body font-medium text-lg ast-text-bright transition-all"
                style={{ border: '1px solid var(--ast-border-subtle)' }}
              >
                <Clock className="w-5 h-5 ast-text-cyber" />
                <span>Book a Briefing</span>
              </motion.button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6"
            >
              {[
                { icon: Zap, text: 'Same-day deployment' },
                { icon: Shield, text: 'Enterprise security' },
                { icon: Users, text: 'Dedicated support' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 ast-text-dim">
                  <item.icon className="w-4 h-4 ast-text-cyber" />
                  <span className="ast-font-body text-sm">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column - Terminal Display */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Main Terminal Panel */}
            <div 
              className="ast-panel p-1 rounded-2xl"
              style={{ 
                boxShadow: '0 0 80px -20px var(--ast-glow-cyber), 0 25px 50px -12px rgba(0,0,0,0.5)'
              }}
            >
              {/* Terminal Header */}
              <div 
                className="flex items-center gap-3 px-4 py-3 rounded-t-xl"
                style={{ background: 'linear-gradient(135deg, var(--ast-bg-panel) 0%, var(--ast-bg-elevated) 100%)' }}
              >
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="ast-font-display text-xs ast-text-muted">
                  va-command-center.exe
                </span>
              </div>

              {/* Terminal Content */}
              <div 
                className="p-6 rounded-b-xl ast-bg-surface"
                style={{ minHeight: '400px' }}
              >
                {/* Boot Sequence */}
                <div className="space-y-3 mb-8">
                  {[
                    { text: 'Initializing VA Command Center...', delay: 0 },
                    { text: 'Loading assistant profiles...', delay: 0.2 },
                    { text: 'Connecting to task network...', delay: 0.4 },
                    { text: 'System ready.', delay: 0.6, highlight: true },
                  ].map((line, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + line.delay, duration: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      <span className="ast-text-cyber">{'>'}</span>
                      <span 
                        className={`ast-font-display text-sm ${
                          line.highlight ? 'ast-text-cyber' : 'ast-text-dim'
                        }`}
                      >
                        {line.text}
                      </span>
                      {line.highlight && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="ast-text-cyber"
                        >
                          █
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {terminalStats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.4 + index * 0.15 }}
                      className="ast-panel p-4 text-center"
                    >
                      <stat.icon className="w-5 h-5 ast-text-cyber mx-auto mb-2" />
                      <div className="ast-stat-number text-2xl mb-1">
                        {stat.value}
                      </div>
                      <div className="ast-font-body text-xs ast-text-muted uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Active Indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="mt-6 p-4 rounded-xl flex items-center justify-between"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(0,255,208,0.1) 0%, transparent 100%)',
                    border: '1px solid var(--ast-border-glow)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="ast-status-dot" />
                    <span className="ast-font-body text-sm ast-text-bright">
                      3 VAs available for immediate deployment
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 ast-text-cyber" />
                </motion.div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-8 -right-8 hidden xl:block"
            >
              <div 
                className="ast-panel p-4 rounded-xl"
                style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg ast-bg-panel flex items-center justify-center">
                    <Zap className="w-5 h-5 ast-text-cyber" />
                  </div>
                  <div>
                    <div className="ast-font-body text-sm font-medium ast-text-bright">
                      Task Completed
                    </div>
                    <div className="ast-font-body text-xs ast-text-muted">
                      Just now
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="ast-font-body text-xs ast-text-muted uppercase tracking-wider">
            Scroll to explore
          </span>
          <div 
            className="w-5 h-8 rounded-full flex justify-center pt-2"
            style={{ border: '2px solid var(--ast-border-subtle)' }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1 h-1 rounded-full"
              style={{ background: 'var(--ast-accent-cyber)' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
