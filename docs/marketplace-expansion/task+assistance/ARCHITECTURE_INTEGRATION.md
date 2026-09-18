# Virtual Assistant Platform: Architecture Integration

> **Technical architecture, module structure, dependencies, and landing page strategy**

**Date**: 2025-01-25  
**Status**: Architecture Definition  
**Related**: Business Model, Implementation Plan

---

## 🏗️ Module Architecture Overview

### **Modular Approach**

Each business expansion is implemented as a **separate module** that:
- ✅ Shares common utilities from existing modules (scheduler, payments, channels)
- ✅ Can be developed and deployed independently
- ✅ Extends base models (Provider, Service, Appointment) without breaking changes
- ✅ Has its own dedicated landing page
- ✅ Can be enabled/disabled via configuration

### **Module Structure**

```
appointment/
├── scheduler/              # Existing: Core scheduling (Provider, Location, Service, Appointment)
├── payments/               # Existing: Payment processing
├── channels/               # Existing: Communication (SMS, email, notifications)
├── tasks/                  # NEW: Task management module
└── assistants/             # NEW: Virtual assistant marketplace platform
```

---

## 📦 Module Definitions

### **1. Tasks Module**

**Module Name**: `tasks`  
**Location**: `appointment/tasks/`  
**Purpose**: Standalone task management reusable by assistants module or independently

**Structure**:
```
tasks/
├── __init__.py
├── doctype/
│   ├── task/                    # Core task entity
│   ├── task_template/           # Reusable task templates
│   ├── task_category/           # Task categorization
│   └── task_project/            # Task grouping (optional)
├── api/
│   ├── task_api.py              # CRUD operations for tasks
│   └── task_search.py           # Search and filtering
├── helpers/
│   ├── task_engine.py           # Task processing, dependencies, status transitions
│   ├── task_prioritization.py   # Priority calculation and sorting
│   └── task_workflow.py         # Workflow management
└── utils/
    └── task_validators.py       # Validation utilities
```

**Core Doctypes**:

1. **Task**
   - Fields: `title`, `description`, `status`, `priority`, `deadline`, `assignee`, `project`, `client_profile`, `category`
   - Status workflow: `requested` → `assigned` → `in_progress` → `completed` → `cancelled`
   - Links to: Virtual Assistant (via assignee), Client Profile, Task Project

2. **Task Template**
   - Fields: `template_name`, `category`, `default_title`, `default_description`, `estimated_duration`, `steps` (child table)
   - Purpose: Reusable task definitions for common workflows

3. **Task Category**
   - Fields: `category_name`, `description`, `icon`, `color`
   - Examples: Admin, Research, Scheduling, Project Management, Email Management

4. **Task Project**
   - Fields: `project_name`, `client_profile`, `description`, `deadline`, `status`
   - Purpose: Group related tasks together

**Integration Points**:
- Can be used standalone or by assistants module
- Tasks can be assigned to Virtual Assistants
- Tasks link to Client Profiles (from assistants module)

---

### **2. Assistants Module**

**Module Name**: `assistants`  
**Location**: `appointment/assistants/`  
**Purpose**: Virtual assistant marketplace platform  
**Dependencies**: Tasks module (uses tasks for task management)

**Structure**:
```
assistants/
├── __init__.py
├── doctype/
│   ├── virtual_assistant/           # Extends Provider
│   ├── client_profile/              # US professional client information
│   ├── assistant_client_assignment/ # Links assistant to 1-3 clients
│   ├── assistant_skill/             # Skills and certifications
│   ├── workload_distribution/       # Tracks task distribution across clients
│   └── assistant_performance/       # Metrics and ratings
├── api/
│   ├── assistant_api.py             # Assistant CRUD, matching
│   ├── assignment_api.py            # Client-assistant assignments
│   ├── workload_api.py              # Workload balancing (1:1, 1:2, 1:3)
│   └── dashboard_api.py             # Multi-client dashboard for assistants
├── helpers/
│   ├── matching_engine.py           # Client-assistant matching algorithm
│   ├── workload_balancer.py         # Manage 1-3 client assignments
│   ├── ai_augmentation.py           # AI tools integration layer
│   └── performance_tracker.py       # Performance metrics and analytics
└── ai_tools/
    ├── email_draft_generator.py     # AI email drafting
    ├── research_assistant.py        # AI-powered research
    ├── calendar_optimizer.py        # AI calendar optimization
    └── document_processor.py        # AI document processing
```

**Core Doctypes**:

1. **Virtual Assistant**
   - Extends: `Provider` (from scheduler module)
   - Additional Fields:
     - `max_clients` (Int): Maximum clients this assistant can handle (1, 2, or 3)
     - `current_clients` (Int): Current number of assigned clients (calculated)
     - `assistant_tier` (Select): Junior, Standard, Senior
     - `timezone` (Data): Assistant's timezone
     - `languages` (Table): Languages spoken
     - `ai_tools_enabled` (Check): Whether AI tools are enabled
     - `skills` (Table): Link to Assistant Skill
     - `hourly_rate` (Currency): For hourly billing (optional)

2. **Client Profile**
   - Fields:
     - `client_name` (Data)
     - `email` (Data)
     - `phone` (Data)
     - `industry` (Select)
     - `company` (Data)
     - `timezone` (Data)
     - `preferred_communication_style` (Select)
     - `preferred_assistant_tier` (Select)
     - `subscription_tier` (Select): Economy, Standard, Premium
     - `subscription_status` (Select): Active, Paused, Cancelled

3. **Assistant Client Assignment**
   - Fields:
     - `virtual_assistant` (Link): Link to Virtual Assistant
     - `client_profile` (Link): Link to Client Profile
     - `assignment_type` (Select): `dedicated` (1:1), `shared_2` (1:2), `shared_3` (1:3)
     - `start_date` (Date)
     - `status` (Select): Active, Paused, Ended
     - `priority` (Select): Primary, Secondary (for shared assistants)

4. **Assistant Skill**
   - Fields:
     - `skill_name` (Data)
     - `category` (Select): Industry Expertise, Tool Proficiency, Language, Certification
     - `proficiency_level` (Select): Beginner, Intermediate, Advanced, Expert
     - `verified` (Check)

5. **Workload Distribution**
   - Fields:
     - `virtual_assistant` (Link)
     - `date` (Date)
     - `client_1_tasks` (Int): Tasks completed for client 1
     - `client_2_tasks` (Int): Tasks completed for client 2
     - `client_3_tasks` (Int): Tasks completed for client 3
     - `total_tasks` (Int): Total tasks across all clients
   - Purpose: Track and balance workload across clients

6. **Assistant Performance**
   - Fields:
     - `virtual_assistant` (Link)
     - `client_profile` (Link)
     - `rating` (Float): 1-5 rating
     - `tasks_completed` (Int)
     - `average_completion_time` (Float): Hours
     - `on_time_completion_rate` (Percent)
     - `client_satisfaction_score` (Float)
   - Purpose: Track performance metrics per client

**Integration Points**:
- Extends Provider from scheduler module (reuses base Provider model)
- Uses Tasks module for task management
- Uses Scheduler availability logic for workload balancing
- Uses Payments module for subscription billing and assistant payroll
- Uses Channels module for communication (messaging, notifications)

---

## 🔗 Module Dependencies

### **Dependency Graph**

```
scheduler (existing)
    ↑
    ├── resources (extends Service/Appointment) [future]
    ├── tasks (standalone, reusable)
    │       ↑
    │       └── assistants (uses tasks, extends Provider)
    │
payments (existing) ← assistants, resources
channels (existing) ← assistants, resources
```

### **Shared Components**

#### **From Scheduler Module**:
- **Provider Doctype**: Base model for Virtual Assistant (assistants extends Provider)
- **Availability Logic**: Reused for workload balancing
- **Location Doctype**: Used for assistant/client locations (if needed)
- **Service Doctype**: Could extend for assistant service offerings

#### **From Payments Module**:
- **PaymentIntent Doctype**: For client subscription payments
- **Payment Processing**: Client subscription billing
- **Assistant Payroll**: Assistant compensation processing
- **Refund Handling**: Client subscription cancellations

#### **From Channels Module**:
- **Notification Doctype**: Client/assistant notifications
- **Messaging**: Real-time communication between clients and assistants
- **Email Templates**: Automated email communications
- **SMS Integration**: Optional SMS notifications

---

## 🌐 Landing Page Architecture

### **Multi-Module Landing Page Strategy**

Each major marketplace module has its own dedicated landing page, allowing:
- ✅ Focused user experience per module
- ✅ SEO optimization per module
- ✅ Independent marketing campaigns
- ✅ Module-specific branding and messaging
- ✅ Flexible site configuration (single-module vs multi-module)

### **Landing Page Routes**

| Route | Purpose | Target Audience |
|-------|---------|----------------|
| `/` | Hub page | All users (routes to modules) |
| `/scheduler` | Appointment booking | Service providers, clients needing appointments |
| `/assistance` | Virtual assistant platform | US professionals, virtual assistants |
| `/logistics` | Resource booking | Resource owners, renters |
| `/resources` | Alternative logistics route | Same as logistics |

### **Hub Page (`/`)**

**Purpose**: Main entry point that shows all available modules

**Features**:
- Module cards showing each available marketplace
- Brief description of each module
- "Learn More" buttons routing to module-specific landing pages
- Hero section explaining platform vision
- Navigation to module landing pages

**Logic**:
- If only one module enabled → Redirect to that module's landing page
- If multiple modules → Show hub with all modules
- Configurable via Website Settings

### **Module Landing Pages**

#### **`/scheduler` - Appointment Booking**
- Current landing page (moved from `/`)
- Target: Service providers, appointment seekers
- Features: Provider search, service booking, calendar integration

#### **`/assistance` - Virtual Assistant Platform**
- Target: US professionals, virtual assistants
- Features:
  - Client signup flow
  - Assistant application flow
  - Pricing tiers
  - Success stories/testimonials
  - How it works section

#### **`/logistics` - Resource Booking**
- Target: Resource owners, renters
- Features: Resource search, booking flow, availability calendar

### **Website Settings Integration**

**New Setting**: "Default Module Landing Page"

**Doctype**: Website Settings (or new Landing Page Settings)

**Fields**:
- `default_module_landing_page` (Select): `/`, `/scheduler`, `/assistance`, `/logistics`
- `enable_hub_page` (Check): Show hub page at `/` or redirect to default
- `enabled_modules` (Table): List of enabled modules for hub page

**Behavior**:
- If `default_module_landing_page` set → Redirect `/` to that route
- If `enable_hub_page` = 1 → Show hub page at `/` with all enabled modules
- Allows configuration without code changes

### **Frontend Structure**

```
frontend/src/pages/
├── index.tsx                    # Hub page (/)
├── scheduler/
│   └── landing.tsx              # /scheduler landing page
├── assistance/
│   ├── landing.tsx              # /assistance landing page
│   ├── client-signup.tsx        # Client signup flow
│   └── assistant-apply.tsx      # Assistant application flow
└── logistics/
    └── landing.tsx              # /logistics landing page
```

### **Routing Configuration**

```typescript
// React Router configuration
const routes = [
  {
    path: '/',
    component: HubPage,  // Shows all modules or redirects
  },
  {
    path: '/scheduler',
    component: SchedulerLanding,
  },
  {
    path: '/assistance',
    component: AssistanceLanding,
  },
  {
    path: '/logistics',
    component: LogisticsLanding,
  },
];
```

---

## 🔄 Data Model Integration

### **How Tasks Integrate with Assistants**

**Task → Virtual Assistant Link**:
- Task has `assignee` field (Link to Virtual Assistant)
- Task can be assigned to assistant
- Task status updates trigger notifications to assistant

**Task → Client Profile Link**:
- Task has `client_profile` field (Link to Client Profile)
- All tasks for a client are linked via client_profile
- Client can view all their tasks

**Task → Project Link**:
- Task can belong to Task Project
- Projects group related tasks
- Useful for client onboarding, recurring workflows

### **How Assistants Extend Provider**

**Virtual Assistant extends Provider**:
- Inherits: `provider_name`, `email`, `phone`, `user`, `location`, `is_active`
- Adds: `max_clients`, `assistant_tier`, `ai_tools_enabled`, `skills`
- Reuses: Availability logic from Provider for workload balancing

**Benefits**:
- ✅ Leverage existing Provider infrastructure
- ✅ Reuse authentication (via `user` field)
- ✅ Reuse location/organization management
- ✅ Minimal schema changes

### **How Assistants Use Tasks**

**Task Assignment Flow**:
1. Client creates task (via Client Profile)
2. Task assigned to Virtual Assistant (via matching or manual assignment)
3. Assistant views task in multi-client dashboard
4. Assistant completes task
5. Client receives notification
6. Performance metrics updated

**Workload Balancing**:
- Workload Distribution tracks tasks per client
- Workload Balancer ensures fair distribution
- Prevents assistant overload across clients

---

## 🛠️ Shared Marketplace Utilities

### **Common Functionality**

All marketplace modules can use:

1. **Availability Management** (from scheduler)
   - Opening hours
   - Time-off management
   - Availability calculation

2. **Payment Processing** (from payments)
   - Subscription billing
   - Payment processing
   - Refund handling

3. **Communication** (from channels)
   - Real-time messaging
   - Email notifications
   - SMS notifications

4. **Policy Engine** (from scheduler)
   - Cancellation policies
   - Refund policies
   - Service level agreements

### **Module-Specific Extensions**

Each module can extend shared utilities:
- Assistants: Extends Provider → Virtual Assistant
- Resources: Extends Service → Resource Service
- Tasks: Standalone but integrates with all modules

---

## 📋 Implementation Checklist

### **Module Creation**

- [ ] Create `tasks` module directory structure
- [ ] Create `assistants` module directory structure
- [ ] Add modules to `modules.txt`
- [ ] Create `__init__.py` files
- [ ] Run migrations

### **Landing Pages**

- [ ] Move current landing page from `/` to `/scheduler`
- [ ] Create hub page component at `/`
- [ ] Create `/assistance` landing page
- [ ] Create `/logistics` landing page
- [ ] Update routing configuration
- [ ] Add website settings for default module

### **Integration**

- [ ] Extend Provider → Virtual Assistant
- [ ] Create Client Profile doctype
- [ ] Integrate Tasks module with Assistants
- [ ] Connect Payments for subscriptions
- [ ] Connect Channels for communication

---

## 🎯 Success Criteria

- [ ] Modules can be developed independently
- [ ] No breaking changes to existing scheduler module
- [ ] Landing pages route correctly
- [ ] Website settings control default landing page
- [ ] Shared utilities work across modules
- [ ] Module dependencies are clear and documented

---

**Status**: ✅ Architecture Defined  
**Next**: Implementation Planning

---

**Document Last Updated**: 2025-01-25  
**Related Documents**:
- `VIRTUAL_ASSISTANT_PLATFORM_BUSINESS_MODEL.md` - Business model
- `ASSISTANTS_IMPLEMENTATION_PLAN.md` - Implementation roadmap




