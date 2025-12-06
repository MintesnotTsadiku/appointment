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
const normalizeStatus = (status?: string): Task['status'] => {
  if (!status) return 'Requested';
  switch (status.toLowerCase()) {
    case 'requested':
      return 'Requested';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
    case 'in progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
    case 'canceled':
      return 'Cancelled';
    default:
      return status as Task['status'];
  }
};

export const getStatusColor = (status: Task['status']): string => {
  const normalized = normalizeStatus(status);
  const colors: Record<Task['status'], string> = {
    'Requested': 'bg-gray-500',
    'Assigned': 'bg-blue-500',
    'In Progress': 'bg-yellow-500',
    'Completed': 'bg-green-500',
    'Cancelled': 'bg-red-500',
  };
  return colors[normalized] || 'bg-gray-500';
};

/**
 * Get priority color
 */
const normalizePriority = (priority?: string): Task['priority'] => {
  if (!priority) return 'Medium';
  switch (priority.toLowerCase()) {
    case 'low':
      return 'Low';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
    case 'urgent':
      return 'Urgent';
    default:
      return priority as Task['priority'];
  }
};

export const getPriorityColor = (priority: Task['priority']): string => {
  const normalized = normalizePriority(priority);
  const colors: Record<Task['priority'], string> = {
    'Low': 'bg-green-500',
    'Medium': 'bg-yellow-500',
    'High': 'bg-orange-500',
    'Urgent': 'bg-red-500',
  };
  return colors[normalized] || 'bg-gray-500';
};

/**
 * Get status label
 */
export const getStatusLabel = (status: Task['status']): string => {
  const normalized = normalizeStatus(status);
  const labels: Record<Task['status'], string> = {
    'Requested': 'Requested',
    'Assigned': 'Assigned',
    'In Progress': 'In Progress',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
  };
  return labels[normalized] || normalized;
};

/**
 * Get priority label
 */
export const getPriorityLabel = (priority: Task['priority']): string => {
  const normalized = normalizePriority(priority);
  const labels: Record<Task['priority'], string> = {
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Urgent': 'Urgent',
  };
  return labels[normalized] || normalized;
};

/**
 * Check if task is overdue
 */
export const isOverdue = (task: Task): boolean => {
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline);
  const now = new Date();
  const status = normalizeStatus(task.status);
  return deadline < now && status !== 'Completed' && status !== 'Cancelled';
};

/**
 * Calculate task progress percentage
 */
export const calculateProgress = (task: Task): number => {
  const status = normalizeStatus(task.status);
  const statusProgress: Record<Task['status'], number> = {
    'Requested': 0,
    'Assigned': 25,
    'In Progress': 50,
    'Completed': 100,
    'Cancelled': 0,
  };
  return statusProgress[status] || 0;
};


