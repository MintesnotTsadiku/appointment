import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Link2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Label } from '@/components/label';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';

const CalendarSettings = () => {
  const navigate = useNavigate();
  const [calendarType, setCalendarType] = useState('builtin');

  return (
    <div
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/home')}
                className="p-1.5 lg:p-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)'
                }}
              >
                <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
              </motion.button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                  />
                  <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                      <Calendar className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    Calendar Settings
                    <span
                      className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                      style={{
                        background: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary-light)'
                      }}
                    >
                      PRO
                    </span>
                  </h1>
                  <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
                    Connect your calendar or use built-in scheduling
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Calendar Type Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Calendar Provider
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="calendar_type" style={{ color: 'var(--text-primary)' }}>Choose Calendar Type</Label>
                    <Select value={calendarType} onValueChange={setCalendarType}>
                      <SelectTrigger
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-default)'
                        }}
                      >
                        <SelectItem value="builtin" style={{ color: 'var(--text-primary)' }}>Built-in Calendar</SelectItem>
                        <SelectItem value="google" style={{ color: 'var(--text-primary)' }}>Google Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {calendarType === 'builtin' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--accent-success-light)',
                        borderColor: 'var(--accent-success-light)'
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="inline-flex p-2 rounded-lg bg-gradient-success">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium mb-1" style={{ color: 'var(--accent-success)' }}>
                            Built-in Calendar Active
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Your appointments are managed directly in the system. No external calendar connection needed.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {calendarType === 'google' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--accent-primary-light)',
                        borderColor: 'var(--accent-primary-light)'
                      }}
                    >
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium mb-2" style={{ color: 'var(--accent-primary)' }}>
                            Connect Google Calendar
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Sync your appointments with Google Calendar to avoid double bookings and manage your schedule in one place.
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-primary group-hover:opacity-90 transition-opacity" />
                          <Link2 className="relative z-10 w-4 h-4" />
                          <span className="relative z-10">Connect Google Calendar</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className="p-6 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary-light)'
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="inline-flex p-2 rounded-lg bg-gradient-primary">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Calendar Sync
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      When connected, your appointments will automatically sync with your Google Calendar. 
                      Changes made in either system will be reflected in both.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CalendarSettings;
