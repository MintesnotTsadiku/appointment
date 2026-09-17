# Daily Briefing Pattern: Integration Guide

> **Expert's Daily Briefing pattern integrated into our full task management system**

**Date**: 2025-01-25  
**Source**: Expert's delegation plan  
**Integration**: Into our marketplace architecture

---

## 🎯 What is Daily Briefing?

**Expert's Pattern**: A sidebar component that shows today's todos alongside the calendar, making it easy for clients (CEOs) to see what needs to be done today.

**Key Characteristics**:
- Calendar-integrated (shown next to appointments)
- Today-focused (shows tasks with deadline = today)
- Priority-sorted (urgent → high → medium → low)
- Compact view (optimized for sidebar)
- Quick actions (complete, defer, view details)

---

## 🏗️ Integration into Our Task System

### **Task Doctype Enhancement**

**New Fields Added**:
```json
{
  "is_daily_briefing": "Check",          // NEW: Show in Daily Briefing sidebar
  "related_event": "Link: Appointment"    // NEW: Link to calendar event (for context)
}
```

**Purpose**:
- `is_daily_briefing`: Flag to mark tasks that should appear in Daily Briefing
- `related_event`: Link tasks to specific appointments (e.g., "Review Q3 report before investor meeting")

---

## 📱 Frontend Implementation

### **Daily Briefing Component**

**Location**: `frontend/src/components/tasks/DailyBriefing.tsx`

**Props**:
```typescript
interface DailyBriefingProps {
  clientProfile?: string;        // Optional: Filter by client
  date?: Date;                   // Default: Today
  showCompleted?: boolean;       // Default: false
  maxItems?: number;             // Default: 10
}
```

**Features**:
- Fetches tasks where:
  - `is_daily_briefing = 1`
  - `deadline` = today (or date prop)
  - `status` != "completed" (unless showCompleted = true)
- Sorted by priority (urgent → high → medium → low)
- Compact card view
- Quick actions: Complete, Defer, View Details
- Visual indicators for overdue tasks
- Shows related appointment if linked

**Component Structure**:
```typescript
const DailyBriefing = ({ clientProfile, date = new Date(), showCompleted = false }) => {
  const { data: tasks } = useDailyBriefingTasks(clientProfile, date);
  
  return (
    <div className="daily-briefing-sidebar">
      <div className="daily-briefing-header">
        <h3>Daily Briefing</h3>
        <span className="date">{formatDate(date)}</span>
      </div>
      
      <div className="daily-briefing-list">
        {tasks.map(task => (
          <DailyBriefingCard 
            key={task.name} 
            task={task}
            onComplete={() => updateTaskStatus(task.name, 'completed')}
            onDefer={() => deferTask(task.name)}
          />
        ))}
      </div>
      
      <button onClick={() => openTaskCreate({ is_daily_briefing: 1 })}>
        + Add Task
      </button>
    </div>
  );
};
```

---

### **Daily Briefing Card Component**

**Location**: `frontend/src/components/tasks/DailyBriefingCard.tsx`

**Features**:
- Compact design (optimized for sidebar)
- Priority indicator (color-coded)
- Due time display (if specified)
- Related appointment link (if linked)
- Quick action buttons
- Overdue indicator

**Layout**:
```
┌─────────────────────────────────┐
│ 🔴 [Urgent] Review Q3 Report    │
│    Due: 2:00 PM                 │
│    Related: Investor Meeting    │
│    [✓] [→] [⋮]                  │
└─────────────────────────────────┘
```

---

## 🔗 Integration Points

### **1. Calendar View Integration**

**Location**: `frontend/src/pages/calendar/index.tsx`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│                   Calendar View                      │
├──────────────────┬──────────────────────────────────┤
│   Calendar       │   Daily Briefing (Sidebar)      │
│   Grid           │   Today's Todos:                 │
│                  │   - Task 1                       │
│   [Appointments] │   - Task 2                       │
│                  │   - Task 3                       │
│                  │                                  │
│                  │   [+ Add Task]                   │
└──────────────────┴──────────────────────────────────┘
```

**Implementation**:
```typescript
const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  return (
    <div className="calendar-layout">
      <div className="calendar-main">
        <Calendar 
          appointments={appointments}
          onDateSelect={setSelectedDate}
        />
      </div>
      <div className="calendar-sidebar">
        <DailyBriefing 
          date={selectedDate}
          clientProfile={currentClientProfile}
        />
      </div>
    </div>
  );
};
```

---

### **2. Client Dashboard Integration**

**Location**: `frontend/src/pages/assistance/client-dashboard.tsx`

**Layout**: Same as calendar view - Daily Briefing sidebar next to main content

---

### **3. Assistant Dashboard Integration**

**Location**: `frontend/src/pages/assistance/dashboard.tsx`

**For Multi-Client View**:
- Option 1: Show Daily Briefing for selected client
- Option 2: Unified view showing all clients' Daily Briefing (grouped by client)

**Unified View Example**:
```
┌─────────────────────────────────────┐
│ Daily Briefing - All Clients        │
├─────────────────────────────────────┤
│ 👤 John Doe (Client 1)              │
│   - Task 1 (Urgent)                 │
│   - Task 2 (High)                   │
├─────────────────────────────────────┤
│ 👤 Jane Smith (Client 2)            │
│   - Task 3 (Medium)                 │
│   - Task 4 (Low)                    │
└─────────────────────────────────────┘
```

---

## 🔌 API Integration

### **Daily Briefing API Endpoint**

**Location**: `appointment/tasks/api/task_api.py`

```python
@frappe.whitelist()
def get_daily_briefing(client_profile=None, date=None):
    """
    Get tasks for Daily Briefing.
    
    Args:
        client_profile: Filter by client (optional)
        date: Date to get tasks for (default: today)
    
    Returns:
        List of tasks with is_daily_briefing=1 and deadline=date
    """
    if not date:
        date = frappe.utils.today()
    
    filters = {
        "is_daily_briefing": 1,
        "deadline": ["<=", date],
        "status": ["!=", "completed"]
    }
    
    if client_profile:
        filters["client_profile"] = client_profile
    
    tasks = frappe.get_all(
        "Task",
        filters=filters,
        fields=["name", "title", "priority", "deadline", "status", "related_event"],
        order_by="priority desc, deadline asc"
    )
    
    # Enrich with related appointment info
    for task in tasks:
        if task.related_event:
            appointment = frappe.db.get_value(
                "Appointment",
                task.related_event,
                ["appointment_id", "start_time", "subject"],
                as_dict=True
            )
            task.related_appointment = appointment
    
    return tasks
```

---

## 🎨 UX Patterns

### **Task Creation with Daily Briefing Option**

When creating a task:
- Checkbox: "Add to Daily Briefing"
- If checked, sets `is_daily_briefing = 1`
- Suggests deadline = today (can be changed)

### **Task Detail View**

When viewing task details:
- Show "In Daily Briefing" badge if `is_daily_briefing = 1`
- Option to add/remove from Daily Briefing
- Link to related appointment (if exists)

### **Quick Actions from Daily Briefing**

- **Complete**: Updates status to "completed"
- **Defer**: Moves deadline to tomorrow (or next day)
- **View Details**: Opens full task detail modal
- **Link Appointment**: Link task to existing appointment
- **Edit**: Quick edit modal

---

## 📊 Daily Briefing vs Full Task List

### **Daily Briefing** (Expert's Pattern)
- **Purpose**: Today's focus, quick visibility
- **Scope**: Today's tasks only
- **View**: Sidebar, compact
- **Actions**: Quick (complete, defer)
- **Integration**: Calendar-integrated

### **Full Task List** (Our Robust System)
- **Purpose**: Comprehensive task management
- **Scope**: All tasks (past, present, future)
- **View**: Full dashboard, detailed
- **Actions**: Full CRUD (create, read, update, delete)
- **Features**: Projects, templates, categories, dependencies

**Relationship**: Daily Briefing is a **view/filter** of the full task system, not a separate system.

---

## ✅ Benefits of This Integration

1. ✅ **Best of Both Worlds**: Robust task management + intuitive UX
2. ✅ **Calendar Integration**: Tasks visible alongside appointments
3. ✅ **Focus**: Today's priorities clearly visible
4. ✅ **Flexibility**: Can use full task management or Daily Briefing view
5. ✅ **Scalability**: Full task system supports future growth

---

## 🔄 Migration Path

**Phase 1**: Implement Daily Briefing as simple filter
- Add `is_daily_briefing` field
- Create Daily Briefing component
- Show in calendar sidebar

**Phase 2**: Enhance with calendar integration
- Add `related_event` field
- Link tasks to appointments
- Show related appointments in Daily Briefing

**Phase 3**: Advanced features
- Defer functionality
- Bulk actions
- Custom Daily Briefing views

---

**Status**: ✅ Pattern Integrated  
**Next**: Implement in Phase 1 (Tasks Module Foundation)

---

**Document Last Updated**: 2025-01-25  
**Related**: ASSISTANTS_IMPLEMENTATION_PLAN.md, REVISED_IMPLEMENTATION_PLAN.md




