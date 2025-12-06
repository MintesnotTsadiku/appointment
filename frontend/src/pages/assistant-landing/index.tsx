import { motion } from 'framer-motion';
import Navigation from '@/components/layout/Navigation';
import Hero from './sections/Hero';
import Services from './sections/Services';
import HowItWorks from './sections/HowItWorks';
import Pricing from './sections/Pricing';
import FinalCTA from './sections/FinalCTA';

// Import the theme CSS
import './assistant-theme.css';

/**
 * Assistant Landing Page
 * 
 * A distinctive "Command Center" themed landing page for the
 * Virtual Assistant business case. Separate from the appointment
 * scheduling landing page.
 * 
 * Theme colors integrate with Landing Page Settings backend for
 * dynamic updates via the CMS.
 */
const AssistantLanding = () => {
  return (
    <div className="min-h-screen ast-font-body">
      {/* Ambient Background - Fixed */}
      <div className="fixed inset-0 ast-bg-void pointer-events-none">
        {/* Subtle scan line effect covers everything */}
        <div className="absolute inset-0 ast-scanline opacity-20" />
      </div>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <Navigation />
        <Hero />
        <Services />
        <HowItWorks />
        <Pricing />
        <FinalCTA />
        
        {/* Footer */}
        <footer className="relative ast-bg-surface py-16 border-t" style={{ borderColor: 'var(--ast-border-subtle)' }}>
          <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="ast-status-dot" />
                  <span className="ast-font-display text-lg font-bold ast-text-bright">
                    VA Command
                  </span>
                </div>
                <p className="ast-font-body ast-text-dim max-w-sm leading-relaxed">
                  Elite virtual assistants on standby. Deploy precision support for your business operations.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="ast-font-display font-semibold ast-text-bright mb-4">
                  Platform
                </h4>
                <ul className="space-y-2">
                  {['Features', 'Pricing', 'FAQ', 'Contact'].map((link) => (
                    <li key={link}>
                      <a 
                        href="#" 
                        className="ast-font-body ast-text-dim hover:ast-text-cyber transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="ast-font-display font-semibold ast-text-bright mb-4">
                  Company
                </h4>
                <ul className="space-y-2">
                  {['About', 'Careers', 'Blog', 'Legal'].map((link) => (
                    <li key={link}>
                      <a 
                        href="#" 
                        className="ast-font-body ast-text-dim hover:ast-text-cyber transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div 
              className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderTop: '1px solid var(--ast-border-subtle)' }}
            >
              <p className="ast-font-body text-sm ast-text-muted">
                © {new Date().getFullYear()} VA Command. All rights reserved.
              </p>
              <div className="flex items-center gap-1 ast-font-display text-xs ast-text-muted">
                <span className="ast-text-cyber">{'>'}</span>
                <span>SYSTEM STATUS: </span>
                <span className="ast-text-cyber">OPERATIONAL</span>
              </div>
            </div>
          </div>
        </footer>
      </motion.main>
    </div>
  );
};

export default AssistantLanding;
