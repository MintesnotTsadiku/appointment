import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Task } from '@/lib/tasks-assistants/types';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TimeSlotInterval } from '../types';
import { format, parseISO } from 'date-fns';
import { isOverdue } from '@/lib/tasks-assistants/utils';

interface TaskCalendarCardProps {
  task: Task;
  compact?: boolean;
  timeSlotInterval?: TimeSlotInterval;
  onClick?: (task: Task) => void;
}

const getPriorityColor = (priority: Task['priority'], isOverdue: boolean) => {
  if (isOverdue) {
    return { color: 'var(--status-cancelled)', bg: 'var(--status-cancelled-bg)' };
  }
  
  const priorityMap: Record<Task['priority'], { color: string; bg: string }> = {
    low: { color: 'var(--accent-success)', bg: 'var(--accent-success-light)' },
    medium: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-light)' },
    high: { color: 'var(--accent-secondary)', bg: 'var(--accent-secondary-light)' },
    urgent: { color: 'var(--status-cancelled)', bg: 'var(--status-cancelled-bg)' },
  };
  
  return priorityMap[priority] || priorityMap.medium;
};

export const TaskCalendarCard = ({ task, compact, timeSlotInterval = 30, onClick }: TaskCalendarCardProps) => {
  const overdue = isOverdue(task);
  const isUrgent = task.priority === 'urgent';
  const isCompleted = task.status === 'completed';
  
  const priorityVars = getPriorityColor(task.priority, overdue);
  
  // Extract time from deadline
  let deadlineTime = '';
  if (task.deadline) {
    try {
      const deadlineDate = parseISO(task.deadline);
      deadlineTime = format(deadlineDate, 'HH:mm');
    } catch (e) {
      deadlineTime = '';
    }
  }

  // Determine what to show based on time slot interval
  const showMinimalInfo = timeSlotInterval <= 30;
  const showMediumInfo = timeSlotInterval === 45;
  const showFullInfo = timeSlotInterval >= 60;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(task);
  };

  if (compact) {
    return (
      <div
        className={`rounded-lg border transition-all hover:scale-[1.01] relative group overflow-hidden flex flex-col min-w-0 ${
          onClick ? 'cursor-pointer' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${priorityVars.bg}, color-mix(in srgb, ${priorityVars.bg} 85%, var(--bg-elevated)))`,
          borderColor: `color-mix(in srgb, ${priorityVars.color} 50%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${priorityVars.bg} 95%, var(--bg-elevated))`,
          padding: showMinimalInfo ? '6px' : '10px',
          paddingBottom: showMinimalInfo ? '6px' : '10px',
          boxSizing: 'border-box',
          height: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(8px)',
        }}
        onClick={handleClick}
      >
        {/* Priority dot and time */}
        <div className="flex items-center gap-1 mb-0.5 flex-shrink-0">
          <div 
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: priorityVars.color }}
          />
          {!showMinimalInfo && deadlineTime && (
            <span 
              className="text-[9px] font-semibold leading-none"
              style={{ color: priorityVars.color }}
            >
              {deadlineTime}
            </span>
          )}
        </div>
        
        {/* Task title */}
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
          {task.title}
        </p>
        
        {/* Status - only show if space allows */}
        {!showMinimalInfo && (
          <div className="mt-1 flex-shrink-0 min-h-0 min-w-0">
            {showMediumInfo || showFullInfo ? (
              <div className="flex items-center gap-1">
                <TaskStatusBadge status={task.status} className="text-[8px] px-1.5 py-0.5" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border transition-all group hover:shadow-lg hover:shadow-black/20 overflow-hidden flex flex-col min-w-0 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{ 
        background: `linear-gradient(135deg, ${priorityVars.bg}, color-mix(in srgb, ${priorityVars.bg} 85%, var(--bg-elevated)))`,
        borderColor: `color-mix(in srgb, ${priorityVars.color} 50%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${priorityVars.bg} 95%, var(--bg-elevated))`,
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
      onClick={handleClick}
    >
      {/* For minimal info (15m/30m): Time at top, Title at bottom */}
      {showMinimalInfo ? (
        <>
          {/* Time at top */}
          {deadlineTime && (
            <div 
              className="text-[9px] flex-shrink-0 min-w-0 mb-auto"
              style={{ 
                color: 'var(--text-subtle)',
                paddingBottom: '4px'
              }}
            >
              {deadlineTime}
            </div>
          )}
          
          {/* Priority dot */}
          <div className="flex items-center gap-1 mb-1 flex-shrink-0">
            {overdue && (
              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" style={{ color: priorityVars.color }} />
            )}
            {!overdue && (
              <div 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: priorityVars.color }}
              />
            )}
          </div>
          
          {/* Task title at bottom */}
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
            {task.title}
          </h4>
        </>
      ) : (
        <>
          {/* Priority indicator */}
          {showFullInfo && (
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              {overdue && (
                <>
                  <AlertTriangle 
                    className="w-3 h-3 flex-shrink-0" 
                    style={{ 
                      color: priorityVars.color,
                      filter: `drop-shadow(0 0 4px ${priorityVars.color})`
                    }} 
                  />
                  <span 
                    className="text-xs font-medium"
                    style={{ color: priorityVars.color }}
                  >
                    Overdue
                  </span>
                </>
              )}
              {!overdue && (
                <div 
                  className="w-2 h-2 rounded-full shadow-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: priorityVars.color,
                    boxShadow: `0 0 8px ${priorityVars.color}`
                  }} 
                />
              )}
            </div>
          )}

          {/* Task title - always show */}
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
            {task.title}
          </h4>
          
          {/* Status and Priority - show if space allows */}
          {(showMediumInfo || showFullInfo) && (
            <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
              <TaskStatusBadge status={task.status} className="text-[10px] px-2 py-0.5" />
              {showFullInfo && (
                <TaskPriorityBadge priority={task.priority} className="text-[10px] px-2 py-0.5" />
              )}
            </div>
          )}

          {/* Time - show based on space */}
          {showFullInfo && deadlineTime && (
            <div 
              className="flex items-center gap-2 text-xs mt-auto flex-shrink-0 min-w-0"
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
                <span className="whitespace-nowrap">{deadlineTime}</span>
              </div>
            </div>
          )}
          
          {showMediumInfo && deadlineTime && (
            <div 
              className="flex items-center gap-2 text-[10px] mt-auto flex-shrink-0 min-w-0"
              style={{ 
                color: 'var(--text-subtle)',
                paddingTop: '4px'
              }}
            >
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{deadlineTime}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};


