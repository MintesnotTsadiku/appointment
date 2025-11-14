import { motion } from 'framer-motion';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const Footer = () => {
  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '#integrations' },
      { label: 'Mobile App', href: '#mobile', badge: 'Coming Soon' },
      { label: 'Changelog', href: '#changelog' },
    ],
    resources: [
      { label: 'Help Center', href: '#help' },
      { label: 'Documentation', href: '#docs' },
      { label: 'API Reference', href: '#api' },
      { label: 'Blog', href: '#blog' },
      { label: 'Customer Stories', href: '#stories' },
      { label: 'Community', href: '#community' },
    ],
    company: [
      { label: 'About Us', href: '#about' },
      { label: 'Careers', href: '#careers', badge: "We're hiring!" },
      { label: 'Contact Us', href: '#contact' },
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Data Processing Agreement', href: '#dpa' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: '#facebook', label: 'Facebook' },
    { icon: Twitter, href: '#twitter', label: 'Twitter' },
    { icon: Instagram, href: '#instagram', label: 'Instagram' },
    { icon: Linkedin, href: '#linkedin', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-gray-900 dark:bg-black text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">ET</span>
              </div>
              <span className="font-heading font-bold text-xl text-white">
                Meet.et
              </span>
            </div>
            <p className="text-gray-400 mb-6 max-w-sm">
              Turn your time into revenue. Ethiopia's leading scheduling and payment platform for professionals.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4 mb-6">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 bg-gray-800 hover:bg-gradient-hero rounded-lg flex items-center justify-center transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-brand-indigo-light mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Email</p>
                  <a
                    href="mailto:support@ethiopianscheduler.com"
                    className="text-sm text-gray-400 hover:text-brand-indigo-light transition-colors"
                  >
                    support@ethiopianscheduler.com
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-brand-indigo-light mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Phone</p>
                  <a
                    href="tel:+251111234567"
                    className="text-sm text-gray-400 hover:text-brand-indigo-light transition-colors"
                  >
                    +251 11 123 4567
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-brand-indigo-light mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Location</p>
                  <p className="text-sm text-gray-400">
                    Addis Ababa, Ethiopia
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mon-Fri, 8AM-6PM EAT
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-brand-indigo-light transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-xs px-2 py-0.5 bg-brand-emerald/20 text-brand-emerald rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-brand-indigo-light transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-brand-indigo-light transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-xs px-2 py-0.5 bg-brand-gold/20 text-brand-gold rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Meet.et. All rights reserved.
            </p>

            {/* Compliance Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>99.9% Uptime</span>
              </div>
              <span className="hidden md:inline">•</span>
              <span>Data Protection Act Compliant</span>
              <span className="hidden md:inline">•</span>
              <span>Bank-Grade Encryption</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">
              Supported Payment Methods
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {['TeleBirr', 'Chapa', 'M-PESA', 'Stripe', 'PayPal'].map((method) => (
                <div
                  key={method}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-xs text-gray-400 font-medium"
                >
                  {method}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

