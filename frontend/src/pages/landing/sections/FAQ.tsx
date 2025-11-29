import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const FAQ = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: t('faq.question1'),
      answer: t('faq.answer1'),
    },
    {
      question: t('faq.question2'),
      answer: t('faq.answer2'),
    },
    {
      question: t('faq.question3'),
      answer: t('faq.answer3'),
    },
    {
      question: t('faq.question4'),
      answer: t('faq.answer4'),
    },
    {
      question: t('faq.question5'),
      answer: t('faq.answer5'),
    },
    {
      question: t('faq.question6'),
      answer: t('faq.answer6'),
    },
    {
      question: t('faq.question7'),
      answer: t('faq.answer7'),
    },
    {
      question: t('faq.question8'),
      answer: t('faq.answer8'),
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-32 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.08, 0.12, 0.08]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <motion.div
          animate={{ 
            scale: [1.3, 1, 1.3],
            opacity: [0.08, 0.12, 0.08]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Premium Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-6"
          >
            <span 
              className="px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-xl border inline-flex items-center gap-2"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                borderColor: 'var(--border-default)',
                color: 'var(--accent-primary)'
              }}
            >
              <HelpCircle className="w-4 h-4" />
              FAQ
            </span>
          </motion.div>
          <h2 
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('faq.title')}
          </h2>
          <p 
            className="text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('faq.subtitle')}
          </p>
        </motion.div>

        {/* Premium FAQ List */}
        <div className="space-y-4 mb-16">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl overflow-hidden shadow-xl border backdrop-blur-xl transition-all duration-300"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                borderColor: openIndex === index ? 'var(--accent-primary)' : 'var(--border-default)',
                boxShadow: openIndex === index 
                  ? '0 20px 60px -20px var(--accent-primary), 0 0 0 1px var(--accent-primary)'
                  : '0 10px 40px -15px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Premium Question Button */}
              <motion.button
                onClick={() => toggleFAQ(index)}
                whileHover={{ x: 4 }}
                className="w-full px-8 py-6 flex items-center justify-between text-left transition-all"
                style={{ 
                  backgroundColor: openIndex === index 
                    ? 'color-mix(in srgb, var(--accent-primary) 5%, transparent)'
                    : 'transparent'
                }}
              >
                <span 
                  className="text-lg sm:text-xl font-heading font-bold pr-8 leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{ 
                      backgroundColor: openIndex === index 
                        ? 'var(--accent-primary-light)'
                        : 'var(--bg-secondary)',
                      color: openIndex === index 
                        ? 'var(--accent-primary)'
                        : 'var(--text-muted)'
                    }}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </motion.div>
              </motion.button>

              {/* Premium Answer */}
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div 
                      className="px-8 pb-6 pt-2"
                      style={{ 
                        borderTop: '1px solid var(--border-subtle)'
                      }}
                    >
                      <p 
                        className="text-base sm:text-lg leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Premium Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="relative p-10 rounded-3xl backdrop-blur-xl border shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
            boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-20"
              style={{ backgroundColor: 'var(--glow-primary)' }}
            />
          </div>

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-block mb-6"
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))'
                }}
              >
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h3 
              className="text-2xl sm:text-3xl font-heading font-bold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('faq.stillHaveQuestions')}
            </h3>
            <p 
              className="text-lg mb-8 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('faq.contactPrompt')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-10 py-5 rounded-xl font-semibold text-lg overflow-hidden shadow-2xl"
              style={{ 
                background: 'linear-gradient(135deg, var(--gradient-primary-from), var(--gradient-primary-to))',
                color: 'white',
                boxShadow: '0 15px 50px -15px var(--accent-primary)'
              }}
            >
              <span className="relative z-10">{t('faq.contactButton')}</span>
              <motion.div
                className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(135deg, var(--gradient-primary-to), var(--gradient-primary-from))'
                }}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
