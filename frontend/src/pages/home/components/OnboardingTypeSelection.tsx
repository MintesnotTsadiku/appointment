import React from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/button';

interface OnboardingTypeSelectionProps {
  onSelect: (type: 'individual' | 'organization') => void;
}

export const OnboardingTypeSelection: React.FC<OnboardingTypeSelectionProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-slate-900 dark:text-white mb-4"
          >
            Welcome to Ethiopian Scheduler
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
          >
            Let's get you set up. First, tell us how you'll be using the platform.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Individual Provider Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 group p-6">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Individual Provider</h3>
                <p className="text-base text-slate-600 dark:text-slate-400">
                  I'm a solo practitioner managing my own appointments
                </p>
              </div>
              
              <div className="space-y-4 mt-6">
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Personal booking page with custom URL</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Manage your own calendar and availability</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Direct client bookings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Optional: Invite assistants to help manage</span>
                  </li>
                </ul>
                
                <Button
                  onClick={() => onSelect('individual')}
                  className="w-full mt-6"
                >
                  Continue as Individual
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Organization Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 group p-6">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Organization</h3>
                <p className="text-base text-slate-600 dark:text-slate-400">
                  I'm managing a business with multiple providers
                </p>
              </div>
              
              <div className="space-y-4 mt-6">
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Centralized business booking page</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Add and manage multiple providers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Smart provider assignment (customer preference or round-robin)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Aggregate analytics and reporting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 mr-2 flex-shrink-0" />
                    <span>Front desk and manager roles</span>
                  </li>
                </ul>
                
                <Button
                  onClick={() => onSelect('organization')}
                  className="w-full mt-6"
                >
                  Continue as Organization
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don't worry, you can always change this later or add organizations to your account
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

