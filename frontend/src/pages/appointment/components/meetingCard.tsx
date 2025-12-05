/**
 * External dependencies
 */
import { Clock, Video } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Internal dependencies
 */
import { Button } from "@/components/button";
import Typography from "@/components/typography";
import { useAppContext } from "@/context/app";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import { convertMinutesToTimeFormat } from "@/lib/utils";

interface MeetingCardProps {
  title: string;
  duration: number;
  onClick: VoidFunction;
}

const MeetingCard = ({ title, duration, onClick }: MeetingCardProps) => {
  const { userInfo } = useAppContext();
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300"
      style={{ 
        backgroundColor: 'var(--border-subtle)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
        style={{
          background: 'linear-gradient(to right, var(--gradient-primary-from), var(--gradient-primary-to))'
        }}
      />
      
      <div className="relative p-5 space-y-4">
        {/* Header with gradient icon */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Tooltip>
              <TooltipTrigger>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              </TooltipTrigger>
              <TooltipContent>{title}</TooltipContent>
            </Tooltip>
            
            <div className="flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
              <div className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <Typography className="text-sm">
                  {convertMinutesToTimeFormat(duration, true)}
                </Typography>
              </div>
              <span className="mx-1">•</span>
              <div className="inline-flex items-center gap-1">
                <Video className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <Typography className="text-sm">
                  {userInfo.meetingProvider}
                </Typography>
              </div>
            </div>
          </div>
          
          {/* Gradient icon badge */}
          <div className="inline-flex p-2.5 rounded-xl bg-gradient-primary">
            <Clock className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {/* Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full bg-gradient-primary hover:opacity-90 rounded-xl text-white font-medium transition-all duration-300"
        >
          Schedule Meeting
        </Button>
      </div>
    </motion.div>
  );
};

export default MeetingCard;
