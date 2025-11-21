# ⚡ Quick Start - Test V2 Now!

## 🎯 Test in 3 Simple Steps

### **Step 1: Find Your URL**

Get any working booking URL from your system:
```
Example: http://localhost:5173/schedule/org/clinic/consultation
```

### **Step 2: Add /v2 Prefix**

Change `/schedule` to `/v2/schedule`:
```
Old: http://localhost:5173/schedule/org/clinic/consultation
New: http://localhost:5173/v2/schedule/org/clinic/consultation
                         ↑↑↑↑
                      Add this!
```

### **Step 3: Test & Compare**

Open both URLs side-by-side:
- **Old UI** at `/schedule/...`
- **New UI** at `/v2/schedule/...`

---

## ✅ What to Check

**Functionality**:
- [ ] Page loads
- [ ] Select service/duration
- [ ] Pick date
- [ ] Choose time slot
- [ ] Fill form
- [ ] Submit booking
- [ ] See confirmation

**API (Network Tab)**:
- [ ] Same endpoints called
- [ ] Same parameters sent
- [ ] Same responses received

**Result**:
- [ ] Booking saved in backend
- [ ] Meeting link created
- [ ] Calendar invite sent

---

## 🎨 What's Different

**UI Only** - Everything else is identical!

```
┌─────────────────────┐    ┌─────────────────────┐
│     Old UI          │    │     New UI          │
├─────────────────────┤    ├─────────────────────┤
│ • Basic calendar    │ →  │ • Beautiful design  │
│ • Simple list       │ →  │ • Grouped slots     │
│ • Standard form     │ →  │ • Smooth animations │
│ • Basic mobile      │ →  │ • Mobile-first      │
└─────────────────────┘    └─────────────────────┘
         ↓                          ↓
    Same API ←───────────→ Same API
    Same Data ←──────────→ Same Data
```

---

## 🔄 When Ready to Swap

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend/src/pages

# Backup
cp -r appointment appointment-backup
cp -r organization-appointment organization-appointment-backup

# Swap
rm -rf appointment organization-appointment
mv appointment-v2 appointment
mv organization-appointment-v2 organization-appointment

# Done! Now /schedule/... uses new UI
```

---

## 📖 Need More Info?

- **Migration Guide**: [SAFE_MIGRATION_COMPLETE.md](./SAFE_MIGRATION_COMPLETE.md)
- **Detailed Steps**: [DROP_IN_REPLACEMENT_GUIDE.md](./DROP_IN_REPLACEMENT_GUIDE.md)
- **API Verification**: [API_COMPATIBILITY_MATRIX.md](./API_COMPATIBILITY_MATRIX.md)
- **Full Summary**: [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)

---

## 🚀 Current Status

```
✅ Beautiful new UI ready
✅ Same API integration
✅ Zero backend changes
✅ Test routes available
➡️  Just add /v2 to test!
```

---

**Test now at**: `/v2/schedule/...` URLs! 🎉

