/**
 * API client functions for Tasks & Assistants modules
 * Uses API Gateway for obfuscated access
 */

import { gatewayGet, gatewayPost } from '@/lib/apiGateway';
import type {
  Task,
  TaskCategory,
  TaskTemplate,
  TaskProject,
  VAProfile,
  ClientProfile,
  AssistantClientAssignment,
  AssistantSkill,
  APIResponse,
  PaginatedResponse,
  TaskStatistics,
  AssignmentStatistics,
} from './types';

// =====================================================
// TASK APIs
// =====================================================

export const taskAPI = {
  create: (data: Partial<Task>): Promise<APIResponse<Task>> =>
    gatewayPost('appointment.tasks.api.task_api.create_task', data),

  get: (taskName: string, fields?: string): Promise<APIResponse<Task>> =>
    gatewayGet('appointment.tasks.api.task_api.get_task', {
      task_name: taskName,
      fields,
    }),

  list: (params?: {
    filters?: Record<string, any>;
    fields?: string;
    page_length?: number;
    page_start?: number;
    order_by?: string;
  }): Promise<PaginatedResponse<Task>> =>
    gatewayGet('appointment.tasks.api.task_api.list_tasks', params),

  update: (taskName: string, data: Partial<Task>): Promise<APIResponse<Task>> =>
    gatewayPost('appointment.tasks.api.task_api.update_task', {
      task_name: taskName,
      data,
    }),

  delete: (taskName: string): Promise<APIResponse<void>> =>
    gatewayPost('appointment.tasks.api.task_api.delete_task', {
      task_name: taskName,
    }),

  updateStatus: (taskName: string, status: Task['status']): Promise<APIResponse<Task>> =>
    gatewayPost('appointment.tasks.api.task_api.update_task_status', {
      task_name: taskName,
      status,
    }),

  assign: (taskName: string, assignee: string): Promise<APIResponse<Task>> =>
    gatewayPost('appointment.tasks.api.task_api.assign_task', {
      task_name: taskName,
      assignee,
    }),

  getByClient: (clientProfile: string, status?: string): Promise<APIResponse<Task[]>> =>
    gatewayGet('appointment.tasks.api.task_api.get_tasks_by_client', {
      client_profile: clientProfile,
      status,
    }),

  getByAssignee: (assignee: string, status?: string): Promise<APIResponse<Task[]>> =>
    gatewayGet('appointment.tasks.api.task_api.get_tasks_by_assignee', {
      assignee,
      status,
    }),

  getDailyBriefing: (clientProfile?: string, date?: string): Promise<APIResponse<Task[]>> =>
    gatewayGet('appointment.tasks.api.task_api.get_daily_briefing_tasks', {
      client_profile: clientProfile,
      date,
    }),

  getStatistics: (clientProfile?: string, assignee?: string): Promise<APIResponse<TaskStatistics>> =>
    gatewayGet('appointment.tasks.api.task_api.get_task_statistics', {
      client_profile: clientProfile,
      assignee,
    }),
};

// Task Master Data APIs
export const taskMasterDataAPI = {
  categories: {
    create: (data: { name: string; description?: string }): Promise<APIResponse<TaskCategory>> =>
      gatewayPost('appointment.tasks.api.task_master_data_api.create_task_category', data),

    list: (filters?: Record<string, any>): Promise<APIResponse<TaskCategory[]>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.list_task_categories', {
        filters,
      }),
  },

  templates: {
    create: (data: Partial<TaskTemplate>): Promise<APIResponse<TaskTemplate>> =>
      gatewayPost('appointment.tasks.api.task_master_data_api.create_task_template', data),

    get: (templateName: string): Promise<APIResponse<TaskTemplate>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.get_task_template', {
        template_name: templateName,
      }),

    list: (filters?: Record<string, any>): Promise<APIResponse<TaskTemplate[]>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.list_task_templates', {
        filters,
      }),

    createTasksFrom: (
      templateName: string,
      clientProfile: string,
      assignee?: string
    ): Promise<APIResponse<{ tasks: string[]; count: number }>> =>
      gatewayPost('appointment.tasks.api.task_master_data_api.create_tasks_from_template', {
        template_name: templateName,
        client_profile: clientProfile,
        assignee,
      }),
  },

  projects: {
    create: (data: Partial<TaskProject>): Promise<APIResponse<TaskProject>> =>
      gatewayPost('appointment.tasks.api.task_master_data_api.create_task_project', data),

    get: (projectName: string): Promise<APIResponse<TaskProject & { tasks: Task[]; tasks_count: number }>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.get_task_project', {
        project_name: projectName,
      }),

    list: (
      filters?: Record<string, any>,
      fields?: string
    ): Promise<APIResponse<TaskProject[]>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.list_task_projects', {
        filters,
        fields,
      }),

    getStatistics: (projectName: string): Promise<APIResponse<TaskStatistics>> =>
      gatewayGet('appointment.tasks.api.task_master_data_api.get_project_statistics', {
        project_name: projectName,
      }),
  },
};

// =====================================================
// ASSISTANT APIs
// =====================================================

export const assistantAPI = {
  vaProfile: {
    create: (data: Partial<VAProfile>): Promise<APIResponse<VAProfile>> =>
      gatewayPost('appointment.assistants.api.assistant_api.create_va_profile', data),

    get: (vaName: string, fields?: string): Promise<APIResponse<VAProfile>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_va_profile', {
        va_name: vaName,
        fields,
      }),

    list: (params?: {
      filters?: Record<string, any>;
      fields?: string;
      page_length?: number;
      page_start?: number;
      order_by?: string;
    }): Promise<PaginatedResponse<VAProfile>> =>
      gatewayGet('appointment.assistants.api.assistant_api.list_va_profiles', params),

    update: (vaName: string, data: Partial<VAProfile>): Promise<APIResponse<VAProfile>> =>
      gatewayPost('appointment.assistants.api.assistant_api.update_va_profile', {
        va_name: vaName,
        data,
      }),

    delete: (vaName: string): Promise<APIResponse<void>> =>
      gatewayPost('appointment.assistants.api.assistant_api.delete_va_profile', {
        va_name: vaName,
      }),
  },

  clientProfile: {
    create: (data: Partial<ClientProfile>): Promise<APIResponse<ClientProfile>> =>
      gatewayPost('appointment.assistants.api.assistant_api.create_client_profile', data),

    get: (clientName: string, fields?: string): Promise<APIResponse<ClientProfile>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_client_profile', {
        client_name: clientName,
        fields,
      }),

    list: (params?: {
      filters?: Record<string, any>;
      fields?: string;
      page_length?: number;
      page_start?: number;
      order_by?: string;
    }): Promise<PaginatedResponse<ClientProfile>> =>
      gatewayGet('appointment.assistants.api.assistant_api.list_client_profiles', params),

    update: (clientName: string, data: Partial<ClientProfile>): Promise<APIResponse<ClientProfile>> =>
      gatewayPost('appointment.assistants.api.assistant_api.update_client_profile', {
        client_name: clientName,
        data,
      }),

    delete: (clientName: string): Promise<APIResponse<void>> =>
      gatewayPost('appointment.assistants.api.assistant_api.delete_client_profile', {
        client_name: clientName,
      }),
  },

  assignment: {
    create: (data: Partial<AssistantClientAssignment>): Promise<APIResponse<AssistantClientAssignment>> =>
      gatewayPost('appointment.assistants.api.assistant_api.create_assignment', data),

    get: (assignmentName: string, fields?: string): Promise<APIResponse<AssistantClientAssignment>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_assignment', {
        assignment_name: assignmentName,
        fields,
      }),

    list: (params?: {
      filters?: Record<string, any>;
      fields?: string;
      page_length?: number;
      page_start?: number;
      order_by?: string;
    }): Promise<PaginatedResponse<AssistantClientAssignment>> =>
      gatewayGet('appointment.assistants.api.assistant_api.list_assignments', params),

    update: (
      assignmentName: string,
      data: Partial<AssistantClientAssignment>
    ): Promise<APIResponse<AssistantClientAssignment>> =>
      gatewayPost('appointment.assistants.api.assistant_api.update_assignment', {
        assignment_name: assignmentName,
        data,
      }),

    delete: (assignmentName: string): Promise<APIResponse<void>> =>
      gatewayPost('appointment.assistants.api.assistant_api.delete_assignment', {
        assignment_name: assignmentName,
      }),

    getClientsForVA: (vaProfile: string, status?: string): Promise<APIResponse<AssistantClientAssignment[]>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_clients_for_va', {
        va_profile: vaProfile,
        status,
      }),

    getVAsForClient: (
      clientProfile: string,
      status?: string
    ): Promise<APIResponse<AssistantClientAssignment[]>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_vas_for_client', {
        client_profile: clientProfile,
        status,
      }),

    getStatistics: (): Promise<APIResponse<AssignmentStatistics>> =>
      gatewayGet('appointment.assistants.api.assistant_api.get_assignment_statistics'),
  },
};

// Assistant Skills APIs
export const assistantSkillAPI = {
  create: (data: { name: string; description?: string; category?: string }): Promise<APIResponse<AssistantSkill>> =>
    gatewayPost('appointment.assistants.api.assistant_skill_api.create_assistant_skill', data),

  get: (skillName: string): Promise<APIResponse<AssistantSkill>> =>
    gatewayGet('appointment.assistants.api.assistant_skill_api.get_assistant_skill', {
      skill_name: skillName,
    }),

  list: (filters?: Record<string, any>, fields?: string): Promise<APIResponse<AssistantSkill[]>> =>
    gatewayGet('appointment.assistants.api.assistant_skill_api.list_assistant_skills', {
      filters,
      fields,
    }),

  update: (
    skillName: string,
    data: { description?: string; category?: string }
  ): Promise<APIResponse<AssistantSkill>> =>
    gatewayPost('appointment.assistants.api.assistant_skill_api.update_assistant_skill', {
      skill_name: skillName,
      data,
    }),

  delete: (skillName: string): Promise<APIResponse<void>> =>
    gatewayPost('appointment.assistants.api.assistant_skill_api.delete_assistant_skill', {
      skill_name: skillName,
    }),

  assignToVA: (
    vaProfile: string,
    skillName: string,
    proficiencyLevel?: string
  ): Promise<APIResponse<void>> =>
    gatewayPost('appointment.assistants.api.assistant_skill_api.assign_skill_to_va', {
      va_profile: vaProfile,
      skill_name: skillName,
      proficiency_level: proficiencyLevel || 'intermediate',
    }),

  removeFromVA: (vaProfile: string, skillName: string): Promise<APIResponse<void>> =>
    gatewayPost('appointment.assistants.api.assistant_skill_api.remove_skill_from_va', {
      va_profile: vaProfile,
      skill_name: skillName,
    }),

  getVASkills: (vaProfile: string): Promise<APIResponse<AssistantSkillAssignment[]>> =>
    gatewayGet('appointment.assistants.api.assistant_skill_api.get_va_skills', {
      va_profile: vaProfile,
    }),

  getVAsBySkill: (skillName: string, proficiencyLevel?: string): Promise<APIResponse<VAProfile[]>> =>
    gatewayGet('appointment.assistants.api.assistant_skill_api.get_vas_by_skill', {
      skill_name: skillName,
      proficiency_level: proficiencyLevel,
    }),
};


