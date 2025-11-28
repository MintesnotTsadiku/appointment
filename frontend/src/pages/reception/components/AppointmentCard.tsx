import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User, GripVertical, Edit } from 'lucide-react';
import { Appointment, TimeSlotInterval } from '../types';

interface AppointmentCardProps {
  appointment: Appointment;
  isDragging?: boolean;
  compact?: boolean;
  timeSlotInterval?: TimeSlotInterval;
  onEdit?: (appointment: Appointment) => void;
  onClick?: (appointment: Appointment) => void;
}

// Helper function to get status-specific CSS variable names
const getStatusVariables = (status: string) => {
  const statusMap: Record<string, { color: string; bg: string }> = {
    'Pending': { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' },
    'Confirmed': { color: 'var(--status-confirmed)', bg: 'var(--status-confirmed-bg)' },
    'Completed': { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)' },
    'Cancelled': { color: 'var(--status-cancelled)', bg: 'var(--status-confirmed-bg)' }, // Use same bg as confirmed for cancelled
    'No Show': { color: 'var(--status-no-show)', bg: 'var(--status-no-show-bg)' },
    'In Progress': { color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' },
  };
  
  return statusMap[status] || { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)' };
};

export const AppointmentCard = ({ appointment, isDragging, compact, timeSlotInterval = 30, onEdit, onClick }: AppointmentCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingState,
  } = useDraggable({
    id: appointment.name,
    data: { appointment },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const statusVars = getStatusVariables(appointment.status);
  const startTime = appointment.start_time?.substring(0, 5) || '00:00';
  const endTime = appointment.end_time?.substring(0, 5) || '00:00';

  // Determine what to show based on time slot interval
  // Smaller intervals (15m, 30m) = less space = minimal info
  // Larger intervals (45m, 60m) = more space = more info
  const showMinimalInfo = timeSlotInterval <= 30;
  const showMediumInfo = timeSlotInterval === 45;
  const showFullInfo = timeSlotInterval >= 60;

  // Track mouse down position to distinguish clicks from drags
  const mouseDownRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't track if clicking a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    mouseDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking edit button or currently dragging
    if ((e.target as HTMLElement).closest('button') || isDraggingState) {
      return;
    }

    // Check if this was a click (not a drag)
    if (mouseDownRef.current) {
      const { x, y, time } = mouseDownRef.current;
      const distance = Math.sqrt(
        Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2)
      );
      const timeDiff = Date.now() - time;

      // If mouse moved more than 5px or took more than 500ms, it was a drag
      if (distance > 5 || timeDiff > 500) {
        mouseDownRef.current = null;
        return;
      }

      mouseDownRef.current = null;
    }

    onClick?.(appointment);
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          background: `linear-gradient(135deg, ${statusVars.bg}, color-mix(in srgb, ${statusVars.bg} 85%, var(--bg-elevated)))`,
          borderColor: `color-mix(in srgb, ${statusVars.color} 50%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${statusVars.bg} 95%, var(--bg-elevated))`,
          padding: showMinimalInfo ? '6px' : '10px',
          paddingBottom: showMinimalInfo ? '6px' : '10px',
          boxSizing: 'border-box',
          height: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(8px)',
        }}
        {...attributes}
        className={`rounded-lg border transition-all hover:scale-[1.01] relative group overflow-hidden flex flex-col min-w-0 ${
          isDraggingState ? 'opacity-50 shadow-xl scale-105' : ''
        } ${onClick ? 'cursor-pointer' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Status dot and time - always show */}
        <div className="flex items-center gap-1 mb-0.5 flex-shrink-0">
          <div 
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusVars.color }}
          />
          {!showMinimalInfo && (
            <span 
              className="text-[9px] font-semibold leading-none"
              style={{ color: statusVars.color }}
            >
              {startTime}
            </span>
          )}
        </div>
        
        {/* Client name - always show, but adjust size */}
        <p 
          className={`font-medium leading-tight flex-1 min-w-0 ${
            showMinimalInfo ? 'text-[10px] min-h-[1.2em]' : 'text-[11px] min-h-[2.4em]'
          }`}
          style={{ 
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: showMinimalInfo ? 'block' : '-webkit-box',
            WebkitLineClamp: showMinimalInfo ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: '1.3'
          }}
        >
          {appointment.client_name}
        </p>
        
        {/* Service and provider - only show if space allows */}
        {!showMinimalInfo && (
          <div className={`mt-1 space-y-0.5 flex-shrink-0 min-h-0 min-w-0`}>
            {showMediumInfo || showFullInfo ? (
              <p 
                className="text-[9px] leading-snug min-w-0"
                style={{ 
                  color: 'var(--text-subtle)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: '1.3'
                }}
              >
                {appointment.service_name}
              </p>
            ) : null}
            {showFullInfo && appointment.provider_name && (
              <p 
                className="text-[8px] leading-tight min-w-0"
                style={{ 
                  color: 'var(--text-subtle)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {appointment.provider_name}
              </p>
            )}
          </div>
        )}
        {/* Drag handle and edit button */}
        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(appointment);
              }}
              className="p-0.5 rounded"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)'
              }}
            >
              <Edit className="w-2.5 h-2.5" />
            </button>
          )}
          <div
            {...listeners}
            className="p-0.5 rounded cursor-grab active:cursor-grabbing"
            style={{ 
              color: 'var(--text-subtle)'
            }}
            title="Drag to reschedule"
          >
            <GripVertical className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`rounded-xl border transition-all group hover:shadow-lg hover:shadow-black/20 overflow-hidden flex flex-col min-w-0 ${
        isDraggingState ? 'opacity-50 shadow-2xl scale-105' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
      style={{ 
        ...style,
        background: `linear-gradient(135deg, ${statusVars.bg}, color-mix(in srgb, ${statusVars.bg} 85%, var(--bg-elevated)))`,
        borderColor: `color-mix(in srgb, ${statusVars.color} 50%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${statusVars.bg} 95%, var(--bg-elevated))`,
        padding: showMinimalInfo ? '10px' : '14px',
        paddingBottom: showMinimalInfo ? '10px' : '14px',
        marginLeft: '50px',
        boxSizing: 'border-box',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(appointment);
            }}
            className="p-1.5 rounded-lg backdrop-blur-sm transition-all hover:scale-110"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)'
            }}
            title="Edit appointment"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
        <div
          {...listeners}
          className="p-1.5 rounded-lg backdrop-blur-sm cursor-grab active:cursor-grabbing"
          style={{ color: 'var(--text-subtle)' }}
          title="Drag to reschedule"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* For minimal info (15m/30m): Time at top, Name at bottom */}
      {showMinimalInfo ? (
        <>
          {/* Time at top */}
          <div 
            className="text-[9px] flex-shrink-0 min-w-0 mb-auto"
            style={{ 
              color: 'var(--text-subtle)',
              paddingBottom: '4px'
            }}
          >
            {startTime}
          </div>
          
          {/* Status dot */}
          <div className="flex items-center gap-1 mb-1 flex-shrink-0">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusVars.color }}
            />
          </div>
          
          {/* Client name at bottom */}
          <h4 
            className="font-semibold pr-12 flex-shrink-0 min-w-0 text-xs mt-auto"
            style={{ 
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.4'
            }}
          >
            {appointment.client_name}
          </h4>
        </>
      ) : (
        <>
          {/* Status indicator - show based on space */}
          {showFullInfo && (
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div 
                className="w-2 h-2 rounded-full shadow-lg flex-shrink-0"
                style={{ 
                  backgroundColor: statusVars.color,
                  boxShadow: `0 0 8px ${statusVars.color}`
                }} 
              />
              <span 
                className="text-xs font-medium"
                style={{ color: statusVars.color }}
              >
                {appointment.status}
              </span>
            </div>
          )}

          {/* Client name - always show */}
          <h4 
            className={`font-semibold pr-12 flex-shrink-0 min-w-0 ${
              showMediumInfo ? 'text-sm mb-2' : 'text-sm mb-2'
            }`}
            style={{ 
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.4'
            }}
          >
            {appointment.client_name}
          </h4>
          
          {/* Service - show if space allows */}
          {(showMediumInfo || showFullInfo) && (
            <p 
              className="text-xs mb-3 flex-shrink-0 min-w-0"
              style={{ 
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: showFullInfo ? 2 : 1,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                lineHeight: '1.4'
              }}
            >
              {appointment.service_name}
            </p>
          )}

          {/* Time & Provider - show based on space */}
          {showFullInfo ? (
            <div 
              className="flex items-center gap-3 text-xs mt-auto flex-shrink-0 min-w-0"
              style={{ 
                color: 'var(--text-subtle)',
                borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent)',
                paddingTop: '8px',
                paddingBottom: '0px',
                marginTop: 'auto'
              }}
            >
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="whitespace-nowrap">{startTime} - {endTime}</span>
              </div>
              {appointment.provider_name && (
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span 
                    className="truncate min-w-0"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {appointment.provider_name}
                  </span>
                </div>
              )}
            </div>
          ) : showMediumInfo ? (
            <div 
              className="flex items-center gap-2 text-[10px] mt-auto flex-shrink-0 min-w-0"
              style={{ 
                color: 'var(--text-subtle)',
                paddingTop: '4px'
              }}
            >
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{startTime} - {endTime}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
