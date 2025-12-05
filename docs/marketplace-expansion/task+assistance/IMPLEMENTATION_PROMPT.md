# Implementation Prompt for Assistants/Tasks Module

> **Copy and paste this prompt to another agent to begin implementation**

---

## Implementation Request

Hi! I need you to implement the Assistants and Tasks modules according to the plan in @docs/marketplace-expansion/task+assistance/REVISED_IMPLEMENTATION_PLAN.md

**Important Implementation Order:**

1. **Phase 1 Priority: Backend Doctypes First**
   - Complete all doctype definitions (Tasks module and Assistants module)
   - Implement all backend logic, controllers, and APIs
   - **DO NOT** start frontend implementation yet

2. **Configuration Settings Enhancement**
   - Add a new tab in the existing `Configuration Settings` doctype for "Assistants & Tasks Demo Data"
   - This should be separate from the current demo data generation tab (keep existing functionality intact)
   - New tab should allow generating demo data for:
     - Tasks module (Tasks, Task Categories, Task Templates, Task Projects)
     - Assistants module (Virtual Assistants, Client Profiles, Assistant Client Assignments, Assistant Skills, etc.)
   - Follow the same pattern as existing demo data generation

3. **Desk Testing Before Frontend**
   - After doctypes are complete and demo data generation is working:
   - Generate demo data using the new Configuration Settings tab
   - Test all functionality in Frappe Desk (create, read, update, delete operations)
   - Verify all relationships, validations, and business logic work correctly
   - **Only after desk testing is successful**, proceed with frontend implementation

4. **Frontend Implementation**
   - Start frontend work only after backend is fully tested in Desk
   - Follow the frontend implementation plan in the REVISED_IMPLEMENTATION_PLAN.md

**Key Requirements:**
- Use our **Marketplace Architecture** (not delegation-based)
- Implement **full-featured task management** (not simplified)
- Include **Daily Briefing pattern** (add `is_daily_briefing` field to Task doctype)
- Support **1:1, 1:2, 1:3** client-assistant assignment models
- Follow the 16-week plan structure, but focus on backend first

**Start with:**
- Phase 1, Week 1: Tasks Module doctypes
- Phase 2, Week 4: Assistants Module doctypes
- Configuration Settings enhancement
- Demo data generation and desk testing

Let me know when the doctypes and demo data are ready for desk testing!




