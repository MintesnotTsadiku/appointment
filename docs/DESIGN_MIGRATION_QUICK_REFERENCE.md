# Design Migration - Quick Reference

**Copy this list to track progress and share with team members.**

---

## 📋 Pages to Migrate (Priority Order)

### ✅ Priority 1: Core User Pages
1. `/home` → `frontend/src/pages/home/index.tsx`
2. `/calendar` → `frontend/src/pages/calendar/index.tsx`
3. `/analytics` → `frontend/src/pages/analytics/index.tsx`

### ⏳ Priority 2: Settings Pages
4. `/settings/team` → `frontend/src/pages/settings/team.tsx`
5. `/settings/profile` → `frontend/src/pages/settings/profile/index.tsx`
6. `/settings/availability` → `frontend/src/pages/settings/availability.tsx`
7. `/settings/services` → `frontend/src/pages/settings/services/index.tsx`
8. `/settings/location` → `frontend/src/pages/settings/location/index.tsx`
9. `/settings/calendar` → `frontend/src/pages/settings/calendar/index.tsx`
10. `/settings/manage` → `frontend/src/pages/settings/manage/index.tsx`

### 📝 Priority 3: Admin & Special Pages
11. `/admin/dashboard` → `frontend/src/pages/admin/dashboard/index.tsx`
12. `/settings/services/:serviceId` → `frontend/src/pages/settings/edit-service/index.tsx`

---

## 🎨 Reference Design

**Source**: `/reception` route  
**Files**: `frontend/src/pages/reception/`

---

## 📚 Documentation

- **Full Prompt**: `docs/DESIGN_MIGRATION_PROMPT.md` (copy this to AI agent)
- **Design System Guide**: `docs/DESIGN_SYSTEM_MIGRATION.md` (detailed specs)
- **Quick Reference**: This file

---

## ✅ Migration Checklist (Per Page)

- [ ] Read current page implementation
- [ ] Read Reception Console reference
- [ ] Apply dark mode background with ambient glows
- [ ] Create/update header component
- [ ] Replace hardcoded colors with CSS variables
- [ ] Add Framer Motion animations
- [ ] Update stat cards with gradient icons
- [ ] Apply glass-morphism effects
- [ ] Test functionality preserved
- [ ] Test responsive design
- [ ] Verify theme colors work

---

**Status**: Ready for migration  
**Last Updated**: 2025-11-28


