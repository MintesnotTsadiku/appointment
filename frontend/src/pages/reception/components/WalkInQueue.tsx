import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { WalkInCard } from './WalkInCard';
import { WalkIn } from '../types';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';

interface WalkInQueueProps {
  locationName: string | null;
  onAssignWalkIn: (walkInName: string) => void;
  onCreateWalkIn: () => void;
  refreshToken?: number;
}

export const WalkInQueue = ({ locationName, onAssignWalkIn, onCreateWalkIn, refreshToken = 0 }: WalkInQueueProps) => {
  const [assigningWalkIn, setAssigningWalkIn] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: walkInsData, isLoading, mutate: refreshWalkIns } = useFrappeGetCall<{ 
    message: { walk_ins: WalkIn[]; count: number } 
  }>(
    'appointment.scheduler.api.desk.get_walk_ins',
    locationName ? { location_name: locationName } : undefined,
    `walk-ins-${locationName || 'all'}`,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    }
  );

  const { call: assignWalkIn } = useFrappePostCall('appointment.scheduler.api.desk.assign_walk_in_to_slot');

  const walkIns = walkInsData?.message?.walk_ins || [];

  useEffect(() => {
    if (refreshToken > 0) {
      refreshWalkIns();
    }
  }, [refreshToken, refreshWalkIns]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWalkIns();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAssign = async (walkInName: string) => {
    setAssigningWalkIn(walkInName);
    try {
      const walkIn = walkIns.find(w => w.name === walkInName);
      if (!walkIn) {
        toast.error('Walk-in not found');
        return;
      }

      if (!walkIn.location) {
        toast.error('Walk-in needs a location');
        return;
      }

      const providerName = walkIn.provider_preferred || '';
      
      if (!providerName) {
        toast.error('Please select a provider');
        return;
      }

      const result = await assignWalkIn({
        walk_in_name: walkInName,
        provider_name: providerName,
        location_name: walkIn.location,
      });

      if (result?.message?.success) {
        toast.success('Walk-in assigned!', {
          description: 'Appointment created successfully',
        });
        refreshWalkIns();
        onAssignWalkIn(walkInName);
      } else {
        toast.error('Assignment failed', {
          description: result?.message?.error,
        });
      }
    } catch (error: any) {
      toast.error('Assignment failed', {
        description: error?.message,
      });
    } finally {
      setAssigningWalkIn(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg blur opacity-50" />
              <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-2 rounded-lg">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Walk-In Queue</h2>
              <p className="text-xs text-gray-500">
                {walkIns.length} waiting
              </p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Add Walk-In Button */}
        <motion.button
          data-qa="reception-add-walkin"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateWalkIn}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/30 rounded-xl text-sm font-medium text-orange-300 transition-all group"
        >
          <Plus className="w-4 h-4" />
          <span>Add Walk-In</span>
          <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading queue...</p>
          </div>
        ) : walkIns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No walk-ins waiting</p>
            <p className="text-gray-600 text-xs mt-1">Add one to get started</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {walkIns.map((walkIn, index) => (
              <motion.div
                key={walkIn.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <WalkInCard
                  walkIn={walkIn}
                  onAssign={handleAssign}
                  isAssigning={assigningWalkIn === walkIn.name}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Queue Status Bar */}
      {walkIns.length > 0 && (
        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Auto-refresh: 30s</span>
            <div className="flex items-center gap-1 text-orange-400">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
