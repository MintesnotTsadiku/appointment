import { motion } from 'framer-motion';
import { Clock, Phone, Mail, MapPin, User, ArrowRight, Loader2 } from 'lucide-react';
import { WalkIn } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface WalkInCardProps {
  walkIn: WalkIn;
  onAssign: (walkInName: string) => void;
  isAssigning?: boolean;
}

export const WalkInCard = ({ walkIn, onAssign, isAssigning }: WalkInCardProps) => {
  const createdDate = walkIn.creation ? new Date(walkIn.creation) : new Date();
  const waitTime = formatDistanceToNow(createdDate, { addSuffix: false });
  
  return (
    <div data-qa="walkin-card" data-qa-walkin-name={walkIn.name} className="relative group">
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity" />
      
      <div className="relative bg-[#12121a] border border-white/10 rounded-xl p-4 transition-all hover:border-orange-500/30">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
              <User className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{walkIn.client_name}</h3>
              {walkIn.service_requested && (
                <p className="text-xs text-gray-500">{walkIn.service_requested}</p>
              )}
            </div>
          </div>
          
          {/* Wait time badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <Clock className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-medium text-orange-300">{waitTime}</span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 mb-3">
          {walkIn.client_phone && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Phone className="w-3 h-3" />
              <span>{walkIn.client_phone}</span>
            </div>
          )}
          {walkIn.client_email && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Mail className="w-3 h-3" />
              <span className="truncate">{walkIn.client_email}</span>
            </div>
          )}
          {walkIn.location_name && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{walkIn.location_name}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {walkIn.notes && (
          <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-400 italic">"{walkIn.notes}"</p>
          </div>
        )}

        {/* Assign Button */}
        <motion.button
          data-qa="walkin-assign"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAssign(walkIn.name)}
          disabled={isAssigning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
        >
          {isAssigning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Assigning...</span>
            </>
          ) : (
            <>
              <span>Assign to Slot</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all transform group-hover/btn:translate-x-1" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};
