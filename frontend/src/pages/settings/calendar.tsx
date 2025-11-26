import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Link2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Calendar Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Connect your calendar or use built-in scheduling
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Calendar Type Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Calendar Provider
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar_type">Choose Calendar Type</Label>
                <Select value={calendarType} onValueChange={setCalendarType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">Built-in Calendar</SelectItem>
                    <SelectItem value="google">Google Calendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {calendarType === 'builtin' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Built-in Calendar Active
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Your appointments are managed directly in the system. No external calendar connection needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {calendarType === 'google' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Connect Google Calendar
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Sync your appointments with Google Calendar to avoid double bookings and manage your schedule in one place.
                      </p>
                    </div>
                    <Button className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Connect Google Calendar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                  Calendar Sync
                </h3>
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  When connected, your appointments will automatically sync with your Google Calendar. 
                  Changes made in either system will be reflected in both.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CalendarSettings;

