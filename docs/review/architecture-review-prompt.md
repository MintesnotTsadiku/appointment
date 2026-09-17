# Product context and architecture-review prompt

Meet.et began as an extension of rtCamp's Frappe Appointment app. The goal was affordable, locally suitable scheduling for Ethiopian individuals and small/medium businesses: providers, organizations, locations, services, availability, public booking, rescheduling, reception and walk-ins, with English/Amharic support and Ethiopian time conventions. Local payments and SMS were planned. Later work expanded into virtual assistants and task management.

The broader ambition was one reusable Frappe backend that could support different service businesses through configuration and tailored user experiences. That ambition was explored in conversation; it should not be mistaken for implemented support for every industry.

## Copy-paste prompt

Evaluate this product's overall architecture and direction as if you were deciding how to build it fresh today. Inspect the actual code, data model, user journeys and tests; treat completion claims in older documentation as hypotheses.

Product goal: a configurable appointment and scheduling platform for individuals and SMBs, initially adapted to Ethiopia. It should handle providers, organizations, locations, services, availability, booking, rescheduling and reception/walk-ins. One shared Frappe backend should support several business types without duplicating the core. Payments, SMS, virtual assistants and task management are planned or partially developed extensions—not automatically essential to the first release.

Answer:
1. What is the product's strongest core, who should it serve first, and where has its direction become too broad?
2. If starting fresh, what would you KEEP, REMOVE, UPDATE or REBUILD—and why? Be specific about modules, DocTypes, integrations and UX.
3. What is the simplest coherent domain model and architecture? Assess overlapping booking records, organization isolation, permissions, concurrent booking safety, maintainability, and appropriate use of Frappe.
4. Should we improve the current app, selectively replace parts, or rewrite it? Compare costs, risks, reusable work and data migration; do not favor a rewrite just because it is cleaner on paper.
5. What should a narrow beta include, what should wait, and what evidence is required before inviting users?

Give a concise verdict, a Keep/Remove/Update/Rebuild table with code references, a proposed architecture, and a prioritized transition plan. Separate verified findings from assumptions and unresolved product decisions. Evaluate first; do not change code or start a rebuild.
