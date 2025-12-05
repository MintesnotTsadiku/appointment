# Frontend Pages Plan: Tasks & Assistants Modules

## Overview

This document outlines all frontend pages and components needed for the Tasks and Assistants modules. The frontend will be organized in a separate folder structure to match the backend module separation, while maintaining consistency with the existing design patterns.

## Folder Structure

```
frontend/src/
├── pages/
│   ├── tasks/                    # Tasks Module Pages
│   │   ├── index.tsx            # Tasks Dashboard/List
│   │   ├── [taskId]/
│   │   │   └── index.tsx        # Task Detail View
│   │   ├── create/
│   │   │   └── index.tsx        # Create Task
│   │   ├── edit/
│   │   │   └── [taskId].tsx     # Edit Task
│   │   ├── categories/
│   │   │   └── index.tsx        # Task Categories Management
│   │   ├── templates/
│   │   │   ├── index.tsx        # Task Templates List
│   │   │   ├── [templateId]/
│   │   │   │   └── index.tsx    # Template Detail/Edit
│   │   │   └── create/
│   │   │       └── index.tsx    # Create Template
│   │   ├── projects/
│   │   │   ├── index.tsx        # Task Projects List
│   │   │   ├── [projectId]/
│   │   │   │   └── index.tsx    # Project Detail View
│   │   │   └── create/
│   │   │       └── index.tsx    # Create Project
│   │   └── daily-briefing/
│   │       └── index.tsx        # Daily Briefing View
│   └── assistants/               # Assistants Module Pages
│       ├── index.tsx            # Assistants Dashboard
│       ├── va-profiles/
│       │   ├── index.tsx        # VA Profiles List
│       │   ├── [vaId]/
│       │   │   └── index.tsx    # VA Profile Detail
│       │   ├── create/
│       │   │   └── index.tsx    # Create VA Profile
│       │   └── edit/
│       │       └── [vaId].tsx   # Edit VA Profile
│       ├── client-profiles/
│       │   ├── index.tsx        # Client Profiles List
│       │   ├── [clientId]/
│       │   │   └── index.tsx    # Client Profile Detail
│       │   ├── create/
│       │   │   └── index.tsx    # Create Client Profile
│       │   └── edit/
│       │       └── [clientId].tsx # Edit Client Profile
│       ├── assignments/
│       │   ├── index.tsx        # Assignments List
│       │   ├── [assignmentId]/
│       │   │   └── index.tsx    # Assignment Detail
│       │   └── create/
│       │       └── index.tsx    # Create Assignment
│       └── skills/
│           └── index.tsx        # Assistant Skills Management
├── components/
│   ├── tasks/                    # Tasks Module Components
│   │   ├── TaskCard.tsx         # Task card component
│   │   ├── TaskList.tsx         # Task list with filters
│   │   ├── TaskForm.tsx         # Create/Edit task form
│   │   ├── TaskStatusBadge.tsx  # Status badge component
│   │   ├── TaskPriorityBadge.tsx # Priority badge component
│   │   ├── TaskDependencies.tsx # Dependencies management
│   │   ├── TaskFilters.tsx      # Filter panel
│   │   ├── TaskTimeline.tsx     # Task timeline view
│   │   ├── TaskBoard.tsx        # Kanban board view
│   │   ├── DailyBriefingCard.tsx # Daily briefing task card
│   │   ├── ProjectCard.tsx      # Project card
│   │   └── TemplateCard.tsx     # Template card
│   └── assistants/               # Assistants Module Components
│       ├── VAProfileCard.tsx    # VA profile card
│       ├── ClientProfileCard.tsx # Client profile card
│       ├── AssignmentCard.tsx   # Assignment card
│       ├── VAProfileForm.tsx    # VA profile form
│       ├── ClientProfileForm.tsx # Client profile form
│       ├── AssignmentForm.tsx   # Assignment form
│       ├── SkillsList.tsx       # Skills display/management
│       ├── LanguageList.tsx     # Languages display
│       └── AssignmentModelBadge.tsx # Assignment model badge
└── lib/
    └── tasks-assistants/         # Tasks & Assistants utilities
        ├── api.ts                # API client functions
        ├── types.ts              # TypeScript types
        └── utils.ts              # Utility functions
```

## Page Details

### Tasks Module Pages

#### 1. Tasks Dashboard (`/tasks`)
- **Purpose**: Main landing page for tasks module
- **Features**:
  - Task statistics cards (total, by status, by priority)
  - Recent tasks list
  - Quick filters (my tasks, assigned to me, by client, by project)
  - View toggle (list/board/timeline)
  - Search functionality
  - Quick actions (create task, create from template)
- **Components Used**:
  - TaskCard
  - TaskList or TaskBoard
  - TaskFilters
  - Statistics cards

#### 2. Task Detail (`/tasks/[taskId]`)
- **Purpose**: View detailed information about a task
- **Features**:
  - Task title, description, status, priority
  - Assigned VA and client information
  - Deadline and duration
  - Dependencies list
  - Activity log/comments
  - Actions (edit, delete, change status, reassign)
  - Related tasks (same project, same client)
- **Components Used**:
  - TaskStatusBadge
  - TaskPriorityBadge
  - TaskDependencies
  - TaskTimeline (if applicable)

#### 3. Create Task (`/tasks/create`)
- **Purpose**: Create a new task
- **Features**:
  - Task form with all fields
  - Client profile selection
  - VA assignment (optional)
  - Category and project selection
  - Deadline picker
  - Dependencies selector
  - Template selection (create from template)
  - Daily briefing toggle
- **Components Used**:
  - TaskForm

#### 4. Edit Task (`/tasks/edit/[taskId]`)
- **Purpose**: Edit an existing task
- **Features**:
  - Same as create but pre-filled
  - Status change history
  - Cannot edit certain fields based on status
- **Components Used**:
  - TaskForm

#### 5. Task Categories (`/tasks/categories`)
- **Purpose**: Manage task categories
- **Features**:
  - List of categories
  - Create/edit/delete categories
  - Category usage statistics
- **Components Used**:
  - Simple CRUD components

#### 6. Task Templates (`/tasks/templates`)
- **Purpose**: Manage task templates
- **Features**:
  - List of templates
  - Template detail (shows all tasks in template)
  - Create/edit/delete templates
  - Create tasks from template
  - Template usage statistics
- **Components Used**:
  - TemplateCard
  - TaskList (for template tasks)

#### 7. Task Projects (`/tasks/projects`)
- **Purpose**: Manage task projects
- **Features**:
  - List of projects
  - Project detail with all tasks
  - Project statistics (progress, tasks by status)
  - Create/edit/delete projects
  - Filter tasks within project
- **Components Used**:
  - ProjectCard
  - TaskList
  - Statistics components

#### 8. Daily Briefing (`/tasks/daily-briefing`)
- **Purpose**: View tasks marked for daily briefing
- **Features**:
  - Filter by client or date
  - Group by client or priority
  - Quick status updates
  - Task cards with key information
- **Components Used**:
  - DailyBriefingCard
  - TaskFilters

### Assistants Module Pages

#### 1. Assistants Dashboard (`/assistants`)
- **Purpose**: Main landing page for assistants module
- **Features**:
  - Statistics cards (total VAs, total clients, active assignments)
  - Recent assignments
  - Quick access to VAs and clients
  - Assignment model distribution
- **Components Used**:
  - VAProfileCard
  - ClientProfileCard
  - AssignmentCard

#### 2. VA Profiles List (`/assistants/va-profiles`)
- **Purpose**: List and manage VA profiles
- **Features**:
  - List of all VA profiles
  - Filter by status, skills
  - Search functionality
  - Quick view cards
  - Create/edit/delete actions
- **Components Used**:
  - VAProfileCard

#### 3. VA Profile Detail (`/assistants/va-profiles/[vaId]`)
- **Purpose**: View detailed VA profile information
- **Features**:
  - Personal information
  - Skills list with proficiency levels
  - Languages spoken
  - Assigned clients
  - Task statistics (assigned tasks, completion rate)
  - Activity log
  - Actions (edit, assign skills, assign clients)
- **Components Used**:
  - SkillsList
  - LanguageList
  - AssignmentCard (for client assignments)

#### 4. Create/Edit VA Profile (`/assistants/va-profiles/create`, `/assistants/va-profiles/edit/[vaId]`)
- **Purpose**: Create or edit a VA profile
- **Features**:
  - Personal information form
  - Skills selection with proficiency levels
  - Languages selection
  - Status management
- **Components Used**:
  - VAProfileForm

#### 5. Client Profiles List (`/assistants/client-profiles`)
- **Purpose**: List and manage client profiles
- **Features**:
  - List of all client profiles
  - Filter by status, assigned VA
  - Search functionality
  - Quick view cards
  - Create/edit/delete actions
- **Components Used**:
  - ClientProfileCard

#### 6. Client Profile Detail (`/assistants/client-profiles/[clientId]`)
- **Purpose**: View detailed client profile information
- **Features**:
  - Personal information
  - Assigned VAs (with assignment models)
  - Task statistics
  - Task list for this client
  - Activity log
  - Actions (edit, assign VAs, view tasks)
- **Components Used**:
  - AssignmentCard
  - TaskCard
  - TaskList

#### 7. Create/Edit Client Profile (`/assistants/client-profiles/create`, `/assistants/client-profiles/edit/[clientId]`)
- **Purpose**: Create or edit a client profile
- **Features**:
  - Personal information form
  - Status management
- **Components Used**:
  - ClientProfileForm

#### 8. Assignments List (`/assistants/assignments`)
- **Purpose**: View and manage all assignments
- **Features**:
  - List of all assignments
  - Filter by VA, client, assignment model, status
  - Group by VA or client
  - Assignment statistics
  - Create/edit/delete actions
- **Components Used**:
  - AssignmentCard
  - AssignmentModelBadge

#### 9. Assignment Detail (`/assistants/assignments/[assignmentId]`)
- **Purpose**: View assignment details
- **Features**:
  - VA and client information
  - Assignment model
  - Start/end dates
  - Status
  - Related tasks
  - Actions (edit, end assignment)
- **Components Used**:
  - AssignmentCard

#### 10. Create Assignment (`/assistants/assignments/create`)
- **Purpose**: Create a new assignment
- **Features**:
  - VA selection
  - Client selection
  - Assignment model selection (1:1, 1:2, 1:3)
  - Start date picker
  - Status selection
- **Components Used**:
  - AssignmentForm

#### 11. Assistant Skills (`/assistants/skills`)
- **Purpose**: Manage assistant skills master data
- **Features**:
  - List of all skills
  - Create/edit/delete skills
  - Skill categories
  - Usage statistics (which VAs have which skills)
- **Components Used**:
  - Simple CRUD components

## Routing Configuration

Routes to be added to `frontend/src/route.tsx`:

```typescript
// Tasks Module Routes
const TasksDashboard = lazy(() => import("@/pages/tasks"));
const TaskDetail = lazy(() => import("@/pages/tasks/[taskId]"));
const CreateTask = lazy(() => import("@/pages/tasks/create"));
const EditTask = lazy(() => import("@/pages/tasks/edit/[taskId]"));
const TaskCategories = lazy(() => import("@/pages/tasks/categories"));
const TaskTemplates = lazy(() => import("@/pages/tasks/templates"));
const TaskTemplateDetail = lazy(() => import("@/pages/tasks/templates/[templateId]"));
const CreateTemplate = lazy(() => import("@/pages/tasks/templates/create"));
const TaskProjects = lazy(() => import("@/pages/tasks/projects"));
const TaskProjectDetail = lazy(() => import("@/pages/tasks/projects/[projectId]"));
const CreateProject = lazy(() => import("@/pages/tasks/projects/create"));
const DailyBriefing = lazy(() => import("@/pages/tasks/daily-briefing"));

// Assistants Module Routes
const AssistantsDashboard = lazy(() => import("@/pages/assistants"));
const VAProfiles = lazy(() => import("@/pages/assistants/va-profiles"));
const VAProfileDetail = lazy(() => import("@/pages/assistants/va-profiles/[vaId]"));
const CreateVAProfile = lazy(() => import("@/pages/assistants/va-profiles/create"));
const EditVAProfile = lazy(() => import("@/pages/assistants/va-profiles/edit/[vaId]"));
const ClientProfiles = lazy(() => import("@/pages/assistants/client-profiles"));
const ClientProfileDetail = lazy(() => import("@/pages/assistants/client-profiles/[clientId]"));
const CreateClientProfile = lazy(() => import("@/pages/assistants/client-profiles/create"));
const EditClientProfile = lazy(() => import("@/pages/assistants/client-profiles/edit/[clientId]"));
const Assignments = lazy(() => import("@/pages/assistants/assignments"));
const AssignmentDetail = lazy(() => import("@/pages/assistants/assignments/[assignmentId]"));
const CreateAssignment = lazy(() => import("@/pages/assistants/assignments/create"));
const AssistantSkills = lazy(() => import("@/pages/assistants/skills"));

// Routes
<Route path="/tasks" element={<TasksDashboard />} />
<Route path="/tasks/create" element={<CreateTask />} />
<Route path="/tasks/edit/:taskId" element={<EditTask />} />
<Route path="/tasks/:taskId" element={<TaskDetail />} />
<Route path="/tasks/categories" element={<TaskCategories />} />
<Route path="/tasks/templates" element={<TaskTemplates />} />
<Route path="/tasks/templates/create" element={<CreateTemplate />} />
<Route path="/tasks/templates/:templateId" element={<TaskTemplateDetail />} />
<Route path="/tasks/projects" element={<TaskProjects />} />
<Route path="/tasks/projects/create" element={<CreateProject />} />
<Route path="/tasks/projects/:projectId" element={<TaskProjectDetail />} />
<Route path="/tasks/daily-briefing" element={<DailyBriefing />} />

<Route path="/assistants" element={<AssistantsDashboard />} />
<Route path="/assistants/va-profiles" element={<VAProfiles />} />
<Route path="/assistants/va-profiles/create" element={<CreateVAProfile />} />
<Route path="/assistants/va-profiles/edit/:vaId" element={<EditVAProfile />} />
<Route path="/assistants/va-profiles/:vaId" element={<VAProfileDetail />} />
<Route path="/assistants/client-profiles" element={<ClientProfiles />} />
<Route path="/assistants/client-profiles/create" element={<CreateClientProfile />} />
<Route path="/assistants/client-profiles/edit/:clientId" element={<EditClientProfile />} />
<Route path="/assistants/client-profiles/:clientId" element={<ClientProfileDetail />} />
<Route path="/assistants/assignments" element={<Assignments />} />
<Route path="/assistants/assignments/create" element={<CreateAssignment />} />
<Route path="/assistants/assignments/:assignmentId" element={<AssignmentDetail />} />
<Route path="/assistants/skills" element={<AssistantSkills />} />
```

## Design Consistency

All pages should follow existing design patterns:

1. **Layout**: Use existing layout components (`@/components/layout`)
2. **Components**: Reuse existing UI components (Button, Card, Input, Select, etc.)
3. **Styling**: Match existing color schemes, typography, and spacing
4. **Icons**: Use Lucide React icons (already in use)
5. **Forms**: Use existing form patterns and validation
6. **Loading States**: Use existing Spinner and Skeleton components
7. **Error Handling**: Use existing error fallback components
8. **Responsive Design**: Match existing responsive breakpoints

## API Integration

All API calls should use the API Gateway pattern:

```typescript
import { gatewayGet, gatewayPost } from '@/lib/apiGateway';

// Example: Fetch tasks
const tasks = await gatewayGet('frappe_appointment.tasks.api.task_api.list_tasks', {
  filters: { status: 'in_progress' },
  page_length: 20
});

// Example: Create task
const newTask = await gatewayPost('frappe_appointment.tasks.api.task_api.create_task', {
  title: 'Task Title',
  client_profile: 'CLIENT-00001',
  // ...
});
```

## Implementation Priority

### Phase 1: Core Functionality
1. Tasks Dashboard
2. Task Detail
3. Create/Edit Task
4. VA Profiles List
5. Client Profiles List
6. Create/Edit VA Profile
7. Create/Edit Client Profile

### Phase 2: Relationships & Management
8. Assignments List
9. Create Assignment
10. Task Projects
11. Task Templates

### Phase 3: Advanced Features
12. Daily Briefing
13. Skills Management
14. Task Categories
15. Task Board View
16. Task Timeline View

## Notes

- All pages should have proper loading and error states
- Implement proper TypeScript types for all data structures
- Use React Query or similar for data fetching and caching
- Implement proper form validation
- Add proper accessibility attributes
- Implement keyboard navigation where appropriate
- Add proper SEO meta tags where applicable
- Ensure all pages are mobile-responsive


