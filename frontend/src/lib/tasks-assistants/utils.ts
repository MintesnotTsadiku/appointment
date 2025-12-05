/**
 * Utility functions for Tasks & Assistants modules
 */

import type { Task } from './types';

/**
 * Format date for display
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format datetime for display
 */
export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format duration (minutes) to readable string
 */
export const formatDuration = (minutes?: number): string => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Get status color for task status
 */
export const getStatusColor = (status: Task['status']): string => {
  const colors: Record<Task['status'], string> = {
    requested: 'bg-gray-500',
    assigned: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: Task['priority']): string => {
  const colors: Record<Task['priority'], string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };
  return colors[priority] || 'bg-gray-500';
};

/**
 * Get status label
 */
export const getStatusLabel = (status: Task['status']): string => {
  const labels: Record<Task['status'], string> = {
    requested: 'Requested',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

/**
 * Get priority label
 */
export const getPriorityLabel = (priority: Task['priority']): string => {
  const labels: Record<Task['priority'], string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority] || priority;
};

/**
 * Check if task is overdue
 */
export const isOverdue = (task: Task): boolean => {
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline);
  const now = new Date();
  return deadline < now && task.status !== 'completed' && task.status !== 'cancelled';
};

/**
 * Calculate task progress percentage
 */
export const calculateProgress = (task: Task): number => {
  const statusProgress: Record<Task['status'], number> = {
    requested: 0,
    assigned: 25,
    in_progress: 50,
    completed: 100,
    cancelled: 0,
  };
  return statusProgress[task.status] || 0;
};


