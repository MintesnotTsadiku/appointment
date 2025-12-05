# Tasks & Assistants Module API Endpoints

This document describes all API endpoints available for the Tasks and Assistants modules.

## Base URL

All endpoints use Frappe's standard API pattern:
- Direct access: `/api/method/{module_path}.{function_name}`
- Example: `/api/method/frappe_appointment.tasks.api.task_api.create_task`

## Authentication

All endpoints require authentication unless specified otherwise. Use Frappe's standard authentication headers:
- Cookie-based session authentication
- Or API key/token authentication

---

## Tasks Module API

### Task CRUD Operations

#### Create Task
- **Endpoint**: `frappe_appointment.tasks.api.task_api.create_task`
- **Method**: POST
- **Description**: Create a new task
- **Parameters**:
  ```json
  {
    "title": "string (required)",
    "description": "string (optional)",
    "status": "requested|assigned|in_progress|completed|cancelled (optional, default: requested)",
    "priority": "low|medium|high|urgent (optional, default: medium)",
    "deadline": "datetime string (optional)",
    "assignee": "VA Profile name (optional)",
    "client_profile": "Client Profile name (required)",
    "category": "Task Category name (optional)",
    "project": "Task Project name (optional)",
    "estimated_duration": "integer minutes (optional)",
    "is_daily_briefing": "0 or 1 (optional)",
    "dependencies": [
      {
        "depends_on_task": "Task name",
        "dependency_type": "finish_to_start|start_to_start|finish_to_finish|start_to_finish"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": { /* task object */ }
  }
  ```

#### Get Task
- **Endpoint**: `frappe_appointment.tasks.api.task_api.get_task`
- **Method**: GET
- **Description**: Get a single task by name
- **Parameters**:
  - `task_name`: Task name (required)
  - `fields`: Comma-separated list of fields to return (optional)
- **Response**:
  ```json
  {
    "success": true,
    "data": { /* task object */ }
  }
  ```

#### List Tasks
- **Endpoint**: `frappe_appointment.tasks.api.task_api.list_tasks`
- **Method**: GET
- **Description**: List tasks with filtering and pagination
- **Parameters**:
  - `filters`: JSON string with filters (optional)
  - `fields`: Comma-separated list of fields (optional)
  - `page_length`: Number of records per page (default: 20)
  - `page_start`: Starting record index (default: 0)
  - `order_by`: Sort order (default: "modified desc")
- **Response**:
  ```json
  {
    "success": true,
    "data": [ /* array of tasks */ ],
    "total": 100,
    "page_start": 0,
    "page_length": 20
  }
  ```

#### Update Task
- **Endpoint**: `frappe_appointment.tasks.api.task_api.update_task`
- **Method**: POST
- **Description**: Update an existing task
- **Parameters**:
  - `task_name`: Task name (required)
  - `data`: JSON object with fields to update
- **Response**:
  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "data": { /* updated task object */ }
  }
  ```

#### Delete Task
- **Endpoint**: `frappe_appointment.tasks.api.task_api.delete_task`
- **Method**: POST
- **Description**: Delete a task
- **Parameters**:
  - `task_name`: Task name (required)
- **Response**:
  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

### Task Workflow Operations

#### Update Task Status
- **Endpoint**: `frappe_appointment.tasks.api.task_api.update_task_status`
- **Method**: POST
- **Description**: Update task status with workflow validation
- **Parameters**:
  - `task_name`: Task name (required)
  - `status`: New status (required)
- **Response**: Updated task object

#### Assign Task
- **Endpoint**: `frappe_appointment.tasks.api.task_api.assign_task`
- **Method**: POST
- **Description**: Assign a task to a VA Profile
- **Parameters**:
  - `task_name`: Task name (required)
  - `assignee`: VA Profile name (required)
- **Response**: Updated task object

### Task Queries

#### Get Tasks by Client
- **Endpoint**: `frappe_appointment.tasks.api.task_api.get_tasks_by_client`
- **Method**: GET
- **Description**: Get all tasks for a specific client
- **Parameters**:
  - `client_profile`: Client Profile name (required)
  - `status`: Optional status filter
- **Response**: List of tasks

#### Get Tasks by Assignee
- **Endpoint**: `frappe_appointment.tasks.api.task_api.get_tasks_by_assignee`
- **Method**: GET
- **Description**: Get all tasks assigned to a VA
- **Parameters**:
  - `assignee`: VA Profile name (required)
  - `status`: Optional status filter
- **Response**: List of tasks

#### Get Daily Briefing Tasks
- **Endpoint**: `frappe_appointment.tasks.api.task_api.get_daily_briefing_tasks`
- **Method**: GET
- **Description**: Get tasks marked for daily briefing
- **Parameters**:
  - `client_profile`: Optional client profile filter
  - `date`: Optional date filter (default: today)
- **Response**: List of daily briefing tasks

#### Get Task Statistics
- **Endpoint**: `frappe_appointment.tasks.api.task_api.get_task_statistics`
- **Method**: GET
- **Description**: Get task statistics (counts by status)
- **Parameters**:
  - `client_profile`: Optional client profile filter
  - `assignee`: Optional assignee filter
- **Response**: Statistics object with counts by status

### Task Master Data API

#### Task Categories

##### Create Task Category
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.create_task_category`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string (optional)"
  }
  ```

##### List Task Categories
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.list_task_categories`
- **Method**: GET

#### Task Templates

##### Create Task Template
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.create_task_template`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string (optional)",
    "tasks": [
      {
        "title": "string",
        "description": "string",
        "priority": "string",
        "estimated_duration": "integer",
        "sequence": "integer"
      }
    ]
  }
  ```

##### Get Task Template
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.get_task_template`
- **Method**: GET

##### List Task Templates
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.list_task_templates`
- **Method**: GET

##### Create Tasks from Template
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.create_tasks_from_template`
- **Method**: POST
- **Description**: Create multiple tasks from a template for a client
- **Parameters**:
  - `template_name`: Task Template name (required)
  - `client_profile`: Client Profile name (required)
  - `assignee`: Optional VA Profile name

#### Task Projects

##### Create Task Project
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.create_task_project`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string (optional)",
    "client_profile": "string (required)",
    "start_date": "date string (optional)",
    "end_date": "date string (optional)",
    "status": "active|completed|cancelled (optional, default: active)"
  }
  ```

##### Get Task Project
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.get_task_project`
- **Method**: GET
- **Description**: Get project with all its tasks

##### List Task Projects
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.list_task_projects`
- **Method**: GET

##### Get Project Statistics
- **Endpoint**: `frappe_appointment.tasks.api.task_master_data_api.get_project_statistics`
- **Method**: GET
- **Description**: Get task counts by status for a project

---

## Assistants Module API

### VA Profile CRUD Operations

#### Create VA Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.create_va_profile`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "full_name": "string (required)",
    "email": "string (required)",
    "phone": "string (optional)",
    "status": "active|inactive (optional, default: active)",
    "timezone": "string (optional, default: UTC)",
    "languages": [
      {
        "language": "en|am|...",
        "proficiency": "basic|intermediate|fluent|native"
      }
    ]
  }
  ```

#### Get VA Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_va_profile`
- **Method**: GET

#### List VA Profiles
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.list_va_profiles`
- **Method**: GET

#### Update VA Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.update_va_profile`
- **Method**: POST

#### Delete VA Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.delete_va_profile`
- **Method**: POST

### Client Profile CRUD Operations

#### Create Client Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.create_client_profile`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "full_name": "string (required)",
    "email": "string (required)",
    "phone": "string (optional)",
    "status": "active|inactive (optional, default: active)",
    "timezone": "string (optional, default: UTC)"
  }
  ```

#### Get Client Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_client_profile`
- **Method**: GET

#### List Client Profiles
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.list_client_profiles`
- **Method**: GET

#### Update Client Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.update_client_profile`
- **Method**: POST

#### Delete Client Profile
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.delete_client_profile`
- **Method**: POST

### Assignment CRUD Operations

#### Create Assignment
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.create_assignment`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "va_profile": "VA Profile name (required)",
    "client_profile": "Client Profile name (required)",
    "assignment_model": "1:1|1:2|1:3 (required)",
    "start_date": "date string (optional)",
    "status": "active|inactive|ended (optional, default: active)"
  }
  ```

#### Get Assignment
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_assignment`
- **Method**: GET

#### List Assignments
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.list_assignments`
- **Method**: GET

#### Update Assignment
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.update_assignment`
- **Method**: POST

#### Delete Assignment
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.delete_assignment`
- **Method**: POST

### Assignment Queries

#### Get Clients for VA
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_clients_for_va`
- **Method**: GET
- **Description**: Get all clients assigned to a VA
- **Parameters**:
  - `va_profile`: VA Profile name (required)
  - `status`: Assignment status filter (default: "active")

#### Get VAs for Client
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_vas_for_client`
- **Method**: GET
- **Description**: Get all VAs assigned to a client
- **Parameters**:
  - `client_profile`: Client Profile name (required)
  - `status`: Assignment status filter (default: "active")

#### Get Assignment Statistics
- **Endpoint**: `frappe_appointment.assistants.api.assistant_api.get_assignment_statistics`
- **Method**: GET
- **Description**: Get assignment statistics (counts by model and status)

### Assistant Skills API

#### Assistant Skill CRUD Operations

##### Create Assistant Skill
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.create_assistant_skill`
- **Method**: POST
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string (optional)",
    "category": "string (optional)"
  }
  ```

##### Get Assistant Skill
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.get_assistant_skill`
- **Method**: GET

##### List Assistant Skills
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.list_assistant_skills`
- **Method**: GET

##### Update Assistant Skill
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.update_assistant_skill`
- **Method**: POST

##### Delete Assistant Skill
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.delete_assistant_skill`
- **Method**: POST

#### VA Skill Assignment Operations

##### Assign Skill to VA
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.assign_skill_to_va`
- **Method**: POST
- **Parameters**:
  - `va_profile`: VA Profile name (required)
  - `skill_name`: Assistant Skill name (required)
  - `proficiency_level`: basic|intermediate|advanced|expert (optional, default: intermediate)

##### Remove Skill from VA
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.remove_skill_from_va`
- **Method**: POST

##### Get VA Skills
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.get_va_skills`
- **Method**: GET
- **Description**: Get all skills assigned to a VA Profile

##### Get VAs by Skill
- **Endpoint**: `frappe_appointment.assistants.api.assistant_skill_api.get_vas_by_skill`
- **Method**: GET
- **Description**: Get all VAs that have a specific skill
- **Parameters**:
  - `skill_name`: Assistant Skill name (required)
  - `proficiency_level`: Optional proficiency level filter

---

## Usage Examples

### Example: Create a Task

```python
import requests

url = "http://localhost:8000/api/method/frappe_appointment.tasks.api.task_api.create_task"
data = {
    "title": "Review monthly reports",
    "description": "Review and analyze monthly performance reports",
    "client_profile": "CLIENT-00001",
    "priority": "high",
    "estimated_duration": 60,
    "deadline": "2024-12-31 17:00:00"
}

response = requests.post(url, json=data, cookies=session_cookies)
result = response.json()
```

### Example: Get Tasks for a Client

```python
url = "http://localhost:8000/api/method/frappe_appointment.tasks.api.task_api.get_tasks_by_client"
params = {
    "client_profile": "CLIENT-00001",
    "status": "in_progress"
}

response = requests.get(url, params=params, cookies=session_cookies)
result = response.json()
```

### Example: Create VA Profile

```python
url = "http://localhost:8000/api/method/frappe_appointment.assistants.api.assistant_api.create_va_profile"
data = {
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "status": "active",
    "languages": [
        {"language": "en", "proficiency": "fluent"},
        {"language": "am", "proficiency": "native"}
    ]
}

response = requests.post(url, json=data, cookies=session_cookies)
result = response.json()
```

### Example: Create Assignment

```python
url = "http://localhost:8000/api/method/frappe_appointment.assistants.api.assistant_api.create_assignment"
data = {
    "va_profile": "VA-00001",
    "client_profile": "CLIENT-00001",
    "assignment_model": "1:1",
    "status": "active"
}

response = requests.post(url, json=data, cookies=session_cookies)
result = response.json()
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
    "success": false,
    "error": "Error message description"
}
```

Common error scenarios:
- **Validation Errors**: Required fields missing, invalid data types, invalid enum values
- **Not Found Errors**: Referenced records (tasks, profiles, etc.) don't exist
- **Permission Errors**: User doesn't have access to the resource
- **Business Logic Errors**: Invalid state transitions, constraint violations

---

## Notes

1. **Date/Time Format**: Use ISO 8601 format or Frappe's standard datetime format: `YYYY-MM-DD HH:MM:SS`

2. **Pagination**: List endpoints support pagination. Use `page_start` and `page_length` parameters.

3. **Filtering**: Filter parameters accept JSON strings or can be passed as query parameters depending on the endpoint.

4. **Relationships**: When creating records with relationships (e.g., task with assignee), ensure the referenced records exist first.

5. **Status Values**: 
   - Task status: `requested`, `assigned`, `in_progress`, `completed`, `cancelled`
   - Priority: `low`, `medium`, `high`, `urgent`
   - Assignment model: `1:1`, `1:2`, `1:3`
   - Profile status: `active`, `inactive`

6. **Daily Briefing**: Tasks with `is_daily_briefing = 1` are included in daily briefing queries. Use `get_daily_briefing_tasks` to retrieve them.

---

## Future Enhancements

- Add API Gateway action codes for obfuscated access (see `docs/API_GATEWAY.md`)
- Add bulk operations endpoints
- Add search/filtering with advanced query syntax
- Add webhook support for task status changes
- Add activity logging API endpoints


