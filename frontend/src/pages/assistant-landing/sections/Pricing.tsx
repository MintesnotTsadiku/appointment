import { motion } from 'framer-motion';
import { 
  Check, 
  X,
  Zap,
  Star
} from 'lucide-react';
import { useState } from 'react';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Starter',
      model: '1:3',
      description: 'Perfect for light, recurring tasks and email management.',
      monthlyPrice: 299,
      yearlyPrice: 249,
      features: [
        { text: '20 hours/month', included: true },
        { text: 'Shared VA (1:3 model)', included: true },
        { text: 'Email & chat support', included: true },
        { text: 'Basic task management', included: true },
        { text: 'Priority support', included: false },
        { text: 'Custom integrations', included: false },
      ],
      highlight: false,
    },
    {
      name: 'Professional',
      model: '1:2',
      description: 'Ideal balance of cost and attention for growing businesses.',
      monthlyPrice: 599,
      yearlyPrice: 499,
      features: [
        { text: '40 hours/month', included: true },
        { text: 'Shared VA (1:2 model)', included: true },
        { text: 'Email, chat & video support', included: true },
        { text: 'Advanced task workflows', included: true },
        { text: 'Priority support', included: true },
        { text: 'Custom integrations', included: false },
      ],
      highlight: true,
      badge: 'RECOMMENDED',
    },
    {
      name: 'Enterprise',
      model: '1:1',
      description: 'Dedicated VA with full focus on your business operations.',
      monthlyPrice: 1299,
      yearlyPrice: 1099,
      features: [
        { text: 'Full-time (160 hrs/month)', included: true },
        { text: 'Dedicated VA (1:1 model)', included: true },
        { text: 'Direct phone line', included: true },
        { text: 'Custom workflow automation', included: true },
        { text: 'Priority 24/7 support', included: true },
        { text: 'Custom integrations', included: true },
      ],
      highlight: false,
    },
  ];

  return (
    <section className="relative py-32 overflow-hidden ast-bg-surface">
      {/* Background */}
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
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full ast-bg-elevated mb-6"
               style={{ border: '1px solid var(--ast-border-subtle)' }}>
            <span className="ast-font-display text-xs font-medium ast-text-cyber uppercase tracking-wider">
              Pricing
            </span>
          </div>
          
          <h2 className="ast-font-display font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 ast-text-bright">
            Simple, <span className="ast-gradient-text">Transparent</span> Rates
          </h2>
          
          <p className="ast-font-body text-xl ast-text-dim max-w-2xl mx-auto mb-10">
            No hidden fees. No surprises. Just elite virtual assistance at predictable pricing.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-full ast-bg-elevated"
               style={{ border: '1px solid var(--ast-border-subtle)' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full ast-font-body font-medium text-sm transition-all ${
                billingCycle === 'monthly' 
                  ? 'ast-text-bright' 
                  : 'ast-text-muted hover:ast-text-dim'
              }`}
              style={billingCycle === 'monthly' ? { 
                background: 'linear-gradient(135deg, var(--ast-accent-cyber) 0%, #00ccaa 100%)',
                color: 'var(--ast-bg-void)'
              } : {}}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full ast-font-body font-medium text-sm transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' 
                  ? 'ast-text-bright' 
                  : 'ast-text-muted hover:ast-text-dim'
              }`}
              style={billingCycle === 'yearly' ? { 
                background: 'linear-gradient(135deg, var(--ast-accent-cyber) 0%, #00ccaa 100%)',
                color: 'var(--ast-bg-void)'
              } : {}}
            >
              Yearly
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ 
                  background: 'rgba(255, 61, 113, 0.2)',
                  color: 'var(--ast-accent-signal)'
                }}
              >
                -17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="relative group"
            >
              {/* Highlight Glow */}
              {plan.highlight && (
                <div 
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--ast-glow-cyber) 0%, transparent 50%)',
                    filter: 'blur(20px)'
                  }}
                />
              )}

              {/* Badge - Moved outside to avoid overflow clipping */}
              {plan.badge && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full ast-font-display text-xs font-bold flex items-center gap-1.5 z-20"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--ast-accent-cyber) 0%, #00ccaa 100%)',
                    color: 'var(--ast-bg-void)'
                  }}
                >
                  <Star className="w-3 h-3" />
                  {plan.badge}
                </div>
              )}

              {/* Card */}
              <div 
                className={`relative h-full ast-panel p-8 rounded-2xl flex flex-col ${
                  plan.highlight ? 'ring-2 ring-[var(--ast-accent-cyber)]' : ''
                }`}
                style={{ 
                  background: plan.highlight 
                    ? 'linear-gradient(135deg, var(--ast-bg-elevated) 0%, var(--ast-bg-panel) 100%)'
                    : 'var(--ast-bg-elevated)'
                }}
              >


                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="ast-font-display font-bold text-xl ast-text-bright">
                      {plan.name}
                    </h3>
                    <span 
                      className="px-2 py-1 rounded ast-font-display text-xs font-bold"
                      style={{ 
                        background: 'rgba(0, 255, 208, 0.1)',
                        color: 'var(--ast-accent-cyber)'
                      }}
                    >
                      {plan.model}
                    </span>
                  </div>
                  <p className="ast-font-body text-sm ast-text-dim">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="ast-stat-number text-5xl">
                      ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="ast-font-body ast-text-muted">/month</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="ast-font-body text-sm ast-text-cyber mt-1">
                      <Zap className="w-3 h-3 inline mr-1" />
                      Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 ast-text-cyber flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 ast-text-muted flex-shrink-0" />
                      )}
                      <span className={`ast-font-body text-sm ${
                        feature.included ? 'ast-text-dim' : 'ast-text-muted'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-xl ast-font-body font-semibold transition-all ${
                    plan.highlight ? 'ast-btn-glow' : 'ast-bg-panel ast-text-bright'
                  }`}
                  style={!plan.highlight ? { border: '1px solid var(--ast-border-subtle)' } : {}}
                >
                  Get Started
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center ast-font-body ast-text-muted mt-12"
        >
          All plans include a 7-day trial period. No credit card required to start.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
