/**
 * TypeScript types for Tasks & Assistants modules
 */

// Task Types
export interface Task {
  name: string;
  title: string;
  description?: string;
  status: 'Requested' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline?: string;
  assignee?: string;
  client_profile: string;
  category?: string;
  project?: string;
  related_event?: string;
  estimated_duration?: number;
  actual_duration?: number;
  is_daily_briefing?: boolean;
  dependencies?: TaskDependency[];
  modified?: string;
  creation?: string;
}

export interface TaskDependency {
  name?: string;
  depends_on_task: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface TaskCategory {
  name: string;
  description?: string;
}

export interface TaskTemplate {
  name: string;
  description?: string;
  tasks?: TaskTemplateTask[];
}

export interface TaskTemplateTask {
  name?: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimated_duration?: number;
  sequence?: number;
}

export interface TaskProject {
  name: string;
  description?: string;
  client_profile: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'completed' | 'cancelled';
}

// Assistant Types
export interface VAProfile {
  name: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  
  // Professional Identity
  headline?: string;
  bio?: string;
  education?: string;
  work_style?: 'remote_only' | 'hybrid' | 'flexible';
  response_time?: 'immediate' | 'within_1_hour' | 'within_4_hours' | 'within_24_hours';
  
  // Tier & Capacity
  assistant_tier?: 'junior' | 'standard' | 'senior';
  max_clients?: number;
  current_clients?: number;
  
  // Ratings & Performance
  rating?: number;
  total_reviews?: number;
  tasks_completed?: number;
  success_rate?: number;
  years_experience?: number;
  
  // Availability
  availability_status?: 'available' | 'limited' | 'booked';
  available_hours_per_week?: number;
  working_hours_start?: string;
  working_hours_end?: string;
  
  // Pricing
  hourly_rate?: number;
  
  // Location
  timezone?: string;
  
  // Badges
  featured?: boolean;
  verified?: boolean;
  
  // Child Tables
  languages?: VALanguage[];
  skills?: AssistantSkillAssignment[];
  specializations?: VASpecialization[];
  certifications?: VACertification[];
  tools?: VATool[];
  
  // Images
  avatar_url?: string;
  image_url?: string;
  profile_image?: string;
  
  // Metadata
  modified?: string;
  creation?: string;
}

export interface VALanguage {
  name?: string;
  language: string;
  proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
}

export interface VASpecialization {
  name?: string;
  specialization: string;
  years_in_industry?: number;
}

export interface VACertification {
  name?: string;
  certification_name: string;
  issuing_organization?: string;
  date_obtained?: string;
  expiry_date?: string;
}

export interface VATool {
  name?: string;
  tool_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_using?: number;
}

export interface ClientProfile {
  name: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  timezone?: string;
  modified?: string;
  creation?: string;
}

export interface AssistantClientAssignment {
  name: string;
  va_profile: string;
  client_profile: string;
  assignment_model: '1:1' | '1:2' | '1:3';
  start_date?: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'ended';
  modified?: string;
  creation?: string;
}

export interface AssistantSkill {
  name: string;
  description?: string;
  category?: string;
}

export interface AssistantSkillAssignment {
  name?: string;
  skill: string;
  proficiency_level: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page_start: number;
  page_length: number;
}

export interface TaskStatistics {
  'Requested': number;
  'Assigned': number;
  'In Progress': number;
  'Completed': number;
  'Cancelled': number;
  total: number;
}

export interface AssignmentStatistics {
  by_model: {
    '1:1': number;
    '1:2': number;
    '1:3': number;
  };
  by_status: {
    active: number;
    inactive: number;
    ended: number;
  };
  total: number;
}



