import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  UserSearch, 
  Handshake, 
  Rocket,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Initial Briefing',
      description: 'Tell us about your workflow, tasks, and preferences. We analyze your needs to find the perfect match.',
      icon: MessageSquare,
      details: ['15-minute discovery call', 'Task analysis', 'Requirements gathering'],
    },
    {
      number: '02',
      title: 'VA Matching',
      description: 'Our algorithm matches you with vetted VAs based on skills, timezone, and work style compatibility.',
      icon: UserSearch,
      details: ['AI-powered matching', 'Skill verification', 'Culture fit assessment'],
    },
    {
      number: '03',
      title: 'Onboarding',
      description: 'Your VA gets trained on your specific tools, processes, and communication preferences.',
      icon: Handshake,
      details: ['Tool setup', 'Process documentation', 'Trial task period'],
    },
    {
      number: '04',
      title: 'Go Live',
      description: 'Start delegating immediately. Your VA seamlessly integrates into your daily operations.',
      icon: Rocket,
      details: ['Daily standups', 'Progress tracking', 'Continuous optimization'],
    },
  ];

  return (
    <section className="relative py-32 overflow-hidden ast-bg-void">
      {/* Background Elements */}
      <div className="absolute inset-0 ast-grid-bg opacity-30" />
      
      {/* Gradient Accent */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] opacity-20"
        style={{ background: 'radial-gradient(circle, var(--ast-glow-cyber) 0%, transparent 70%)' }}
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
              Process Flow
            </span>
          </div>
          
          <h2 className="ast-font-display font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 ast-text-bright">
            Deploy in <span className="ast-gradient-text">4 Steps</span>
          </h2>
          
          <p className="ast-font-body text-xl ast-text-dim max-w-2xl mx-auto">
            From first contact to full integration in under 48 hours. 
            Our streamlined process gets you operational fast.
          </p>
        </motion.div>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Vertical Line (Desktop) */}
          <div 
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px"
            style={{ 
              background: 'linear-gradient(to bottom, transparent, var(--ast-border-glow) 10%, var(--ast-border-glow) 90%, transparent)'
            }}
          />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center ${
                  index % 2 === 0 ? '' : 'lg:direction-rtl'
                }`}
              >
                {/* Content Side */}
                <div className={`${index % 2 === 0 ? 'lg:text-right lg:pr-16' : 'lg:order-2 lg:pl-16'}`}>
                  <div className={`${index % 2 === 0 ? 'lg:ml-auto' : ''} max-w-md`}>
                    {/* Step Number */}
                    <div 
                      className="inline-block ast-font-display text-6xl font-bold mb-4"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--ast-accent-cyber) 0%, transparent 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        opacity: 0.5
                      }}
                    >
                      {step.number}
                    </div>
                    
                    {/* Title */}
                    <h3 className="ast-font-display font-bold text-2xl sm:text-3xl ast-text-bright mb-4">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="ast-font-body text-lg ast-text-dim mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Detail Points */}
                    <div className={`flex flex-wrap gap-3 ${index % 2 === 0 ? 'lg:justify-end' : ''}`}>
                      {step.details.map((detail, dIndex) => (
                        <div 
                          key={dIndex}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full ast-bg-elevated"
                          style={{ border: '1px solid var(--ast-border-subtle)' }}
                        >
                          <CheckCircle2 className="w-3 h-3 ast-text-cyber" />
                          <span className="ast-font-body text-xs ast-text-dim">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Icon Side */}
                <div className={`hidden lg:flex ${index % 2 === 0 ? 'lg:order-2 lg:pl-16' : 'lg:pr-16'} justify-center`}>
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="relative"
                  >
                    {/* Glow */}
                    <div 
                      className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
                      style={{ background: 'var(--ast-glow-cyber)' }}
                    />
                    
                    {/* Icon Container */}
                    <div 
                      className="relative ast-panel p-8 rounded-3xl"
                      style={{ 
                        background: 'linear-gradient(135deg, var(--ast-bg-elevated) 0%, var(--ast-bg-panel) 100%)'
                      }}
                    >
                      <step.icon className="w-16 h-16 ast-text-cyber" />
                    </div>
                  </motion.div>
                </div>

                {/* Timeline Node (Center) */}
                <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="relative"
                  >
                    <div 
                      className="w-12 h-12 rounded-full ast-bg-elevated flex items-center justify-center"
                      style={{ 
                        border: '2px solid var(--ast-accent-cyber)',
                        boxShadow: '0 0 20px var(--ast-glow-cyber)'
                      }}
                    >
                      <step.icon className="w-5 h-5 ast-text-cyber" />
                    </div>
                  </motion.div>
                </div>

                {/* Arrow to next step */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="py-4"
                    >
                      <ArrowDown className="w-5 h-5 ast-text-muted" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <p className="ast-font-body text-lg ast-text-dim mb-6">
            Average time from first contact to deployment: <span className="ast-text-cyber font-semibold">48 hours</span>
          </p>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="ast-btn-glow px-8 py-4 rounded-xl ast-font-body font-semibold text-lg"
          >
            Start Your Briefing
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
