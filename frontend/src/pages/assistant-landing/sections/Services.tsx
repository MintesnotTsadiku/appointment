import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Users, 
  UsersRound,
  Clock,
  Shield,
  Headphones,
  ArrowRight
} from 'lucide-react';

const Services = () => {
  const serviceTiers = [
    {
      model: '1:1',
      name: 'Dedicated',
      tagline: 'One VA. Full focus.',
      description: 'Your personal assistant, exclusively assigned to your tasks. Maximum attention, zero sharing.',
      features: [
        'Full-time dedicated assistant',
        'Priority response times',
        'Direct communication channel',
        'Custom workflow setup',
        'Weekly performance reviews',
      ],
      icon: UserCheck,
      highlight: false,
    },
    {
      model: '1:2',
      name: 'Shared Duo',
      tagline: 'Balanced efficiency.',
      description: 'One skilled VA supporting two clients. The optimal balance of cost and attention.',
      features: [
        'Part-time dedicated support',
        '4-hour response guarantee',
        'Shared task scheduler',
        'Standard workflow setup',
        'Bi-weekly check-ins',
      ],
      icon: Users,
      highlight: true,
      badge: 'MOST POPULAR',
    },
    {
      model: '1:3',
      name: 'Shared Team',
      tagline: 'Cost-effective scale.',
      description: 'One VA expertly managing three clients. Perfect for lighter, recurring tasks.',
      features: [
        'Flexible support hours',
        '8-hour response guarantee',
        'Efficient batched tasks',
        'Basic workflow setup',
        'Monthly reviews',
      ],
      icon: UsersRound,
      highlight: false,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    },
  };

  return (
    <section className="relative py-32 overflow-hidden ast-bg-surface">
      {/* Background Elements */}
      <div className="absolute inset-0 ast-grid-bg opacity-50" />
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--ast-border-glow), transparent)' }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full ast-bg-elevated mb-6"
               style={{ border: '1px solid var(--ast-border-subtle)' }}>
            <span className="ast-font-display text-xs font-medium ast-text-cyber uppercase tracking-wider">
              Assignment Models
            </span>
          </div>
          
          <h2 className="ast-font-display font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 ast-text-bright">
            Choose Your <span className="ast-gradient-text">Configuration</span>
          </h2>
          
          <p className="ast-font-body text-xl ast-text-dim max-w-2xl mx-auto">
            Scale your support exactly as you need. From dedicated 1:1 attention 
            to efficient shared models.
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid lg:grid-cols-3 gap-8"
        >
          {serviceTiers.map((tier) => (
            <motion.div
              key={tier.model}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="relative group"
            >
              {/* Highlight Glow for Popular */}
              {tier.highlight && (
                <div 
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--ast-glow-cyber) 0%, transparent 50%)',
                    filter: 'blur(20px)'
                  }}
                />
              )}

              {/* Badge - Moved outside to avoid overflow clipping */}
              {tier.badge && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full ast-font-display text-xs font-bold z-20"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--ast-accent-cyber) 0%, #00ccaa 100%)',
                    color: 'var(--ast-bg-void)'
                  }}
                >
                  {tier.badge}
                </div>
              )}

              {/* Card */}
              <div 
                className={`relative h-full ast-panel p-8 rounded-2xl ${
                  tier.highlight ? 'ring-2 ring-[var(--ast-accent-cyber)]' : ''
                }`}
                style={{ 
                  background: tier.highlight 
                    ? 'linear-gradient(135deg, var(--ast-bg-elevated) 0%, var(--ast-bg-panel) 100%)'
                    : 'var(--ast-bg-elevated)'
                }}
              >


                {/* Model Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div 
                    className="px-3 py-1.5 rounded-lg ast-font-display text-sm font-bold"
                    style={{ 
                      background: 'rgba(0, 255, 208, 0.1)',
                      color: 'var(--ast-accent-cyber)'
                    }}
                  >
                    {tier.model}
                  </div>
                  <tier.icon className="w-6 h-6 ast-text-dim" />
                </div>

                {/* Title */}
                <h3 className="ast-font-display font-bold text-2xl ast-text-bright mb-2">
                  {tier.name}
                </h3>
                <p className="ast-font-body text-sm ast-text-cyber mb-4">
                  {tier.tagline}
                </p>

                {/* Description */}
                <p className="ast-font-body ast-text-dim mb-8 leading-relaxed">
                  {tier.description}
                </p>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
                        style={{ background: 'rgba(0, 255, 208, 0.15)' }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ast-accent-cyber)' }} />
                      </div>
                      <span className="ast-font-body text-sm ast-text-dim">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl ast-font-body font-medium transition-all ${
                    tier.highlight 
                      ? 'ast-btn-glow' 
                      : 'ast-bg-panel ast-text-bright hover:ast-text-cyber'
                  }`}
                  style={!tier.highlight ? { border: '1px solid var(--ast-border-subtle)' } : {}}
                >
                  <span>{tier.highlight ? 'Get Started' : 'Learn More'}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { icon: Clock, value: '<2hrs', label: 'Avg Response Time' },
            { icon: Shield, value: '99.9%', label: 'Task Completion' },
            { icon: Headphones, value: '24/7', label: 'Support Available' },
            { icon: Users, value: '150+', label: 'Active VAs' },
          ].map((stat) => (
            <div 
              key={stat.label}
              className="ast-panel p-6 text-center"
            >
              <stat.icon className="w-5 h-5 ast-text-cyber mx-auto mb-3" />
              <div className="ast-stat-number text-2xl mb-1">{stat.value}</div>
              <div className="ast-font-body text-xs ast-text-muted uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
