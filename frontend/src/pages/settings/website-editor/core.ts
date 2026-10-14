/**
 * Pure helpers of the website section editor. Their only import is the import-free `lib/phone.ts`, so
 * `tests/website-editor.test.mjs` runs them in Node.
 * The editor schema comes from `appointment/public_experience/section_editor.py`.
 */
import { normalizePhone } from "@/lib/phone";

export type Localized = Record<string, string>;
export type Content = Record<string, unknown>;
export type Meet = "in_person" | "online" | "phone";

export interface EditorField {
  key: string;
  kind: "text" | "long" | "plain" | "format" | "consent" | "strings";
  required: boolean;
  maxLength: number;
  maxItems?: number;
  options?: Meet[];
  pattern?: "phone" | "email";
}

export interface EditorList {
  key: string;
  fields: EditorField[];
  maxItems: number;
  add: boolean;
  label: string;
  image?: boolean;
  numbered?: string;
  inherit?: string[];
  defaults?: Content;
  facts?: string[];
  generatedId?: string;
}

export interface SectionSchema {
  fields: EditorField[];
  image?: boolean;
  list?: EditorList;
}

export interface Issue {
  path: string;
  code: "required" | "tooLong" | "tooMany" | "phone" | "email" | "altRequired" | "consent";
  limit?: number;
}

export const LOCALES = ["en", "am"] as const;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const OWNER_FILE_RE = /^\/files\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;

export function asRecord(value: unknown): Content {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Content : {};
}

export function asRecords(value: unknown): Content[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

/** The text of one locale. */
export function readLocale(value: unknown, locale: string): string {
  const text = asRecord(value)[locale];
  return typeof text === "string" ? text : "";
}

/**
 * Set one locale and keep every other one. An empty value stays as "" so the server clears that locale
 * on purpose; a locale that is left out keeps its stored text.
 */
export function setLocale(value: unknown, locale: string, text: string): Localized {
  const current: Localized = {};
  for (const [key, entry] of Object.entries(asRecord(value))) if (typeof entry === "string") current[key] = entry;
  return { ...current, [locale]: text };
}

/** Move one item from `from` to `to`; out-of-range moves return the list unchanged. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function removeItem<T>(items: T[], index: number): T[] {
  return index < 0 || index >= items.length ? items : items.filter((_, current) => current !== index);
}

export function replaceItem<T>(items: T[], index: number, item: T): T[] {
  return items.map((current, position) => position === index ? item : current);
}

/** Steps carry their number; keep it equal to the position after a move, add or remove. */
export function renumber(items: Content[], key?: string): Content[] {
  return key ? items.map((item, index) => ({ ...item, [key]: index + 1 })) : items;
}

/** A new, empty record for a list, with the keys the schema needs that the owner does not type. */
export function newItem(list: EditorList, items: Content[], seed: string): Content {
  const item: Content = { ...(list.defaults || {}) };
  const last = items[items.length - 1];
  for (const key of list.inherit || []) if (last && last[key] !== undefined) item[key] = last[key];
  if (list.generatedId) item.id = `${list.generatedId}-${seed}`.slice(0, 64);
  if (list.numbered) item[list.numbered] = items.length + 1;
  return item;
}

/** How a session meets from its name, in either language (the templates' fallback). */
export function meetFromName(name: unknown): Meet {
  const text = `${readLocale(name, "en")} ${readLocale(name, "am")}`.toLowerCase();
  if (/online|video|ኦንላይን|ቪዲዮ/.test(text)) return "online";
  if (/phone|call|ስልክ|ጥሪ/.test(text)) return "phone";
  return "in_person";
}

/** The format the website shows: the owner's choice, else the location's, else the name's. */
export function shownMeet(item: Content, derived: Record<string, string> | undefined, place = false): { meet: Meet; source: "owner" | "location" | "name" } {
  const own = item.format;
  if (own === "in_person" || own === "online" || own === "phone") return { meet: own, source: "owner" };
  const fromLocation = derived?.[String(item.id || "")];
  if (fromLocation === "in_person" || fromLocation === "online" || fromLocation === "phone") {
    return { meet: place && fromLocation === "phone" ? "online" : fromLocation, source: "location" };
  }
  return { meet: place ? "in_person" : meetFromName(item.name), source: "name" };
}

export function isOwnerUpload(value: unknown): boolean {
  return typeof value === "string" && OWNER_FILE_RE.test(value) && !value.includes("..");
}

/** Check one section like the server does, so the owner sees translated messages before saving. */
export function validateSection(schema: SectionSchema, content: Content): Issue[] {
  const issues = validateFields(schema.fields, content, "");
  if (schema.image) issues.push(...validateImage(content, ""));
  if (schema.list) {
    const items = asRecords(content[schema.list.key]);
    if (items.length > schema.list.maxItems) issues.push({ path: schema.list.key, code: "tooMany", limit: schema.list.maxItems });
    items.forEach((item, index) => {
      const prefix = `${schema.list!.key}.${index}.`;
      issues.push(...validateFields(schema.list!.fields, item, prefix));
      if (schema.list!.image) issues.push(...validateImage(item, prefix));
    });
  }
  return issues;
}

function validateFields(fields: EditorField[], content: Content, prefix: string): Issue[] {
  const issues: Issue[] = [];
  for (const field of fields) {
    const path = prefix + field.key;
    const value = content[field.key];
    if (field.kind === "text" || field.kind === "long") issues.push(...validateLocalized(value, path, field));
    if (field.kind === "strings") {
      const lines = Array.isArray(value) ? value : [];
      if (field.maxItems && lines.length > field.maxItems) issues.push({ path, code: "tooMany", limit: field.maxItems });
      lines.forEach((line, index) => issues.push(...validateLocalized(line, `${path}.${index}`, { ...field, required: true })));
    }
    if (field.kind === "plain" && typeof value === "string" && value.trim()) {
      if (value.length > field.maxLength) issues.push({ path, code: "tooLong", limit: field.maxLength });
      else if (field.pattern === "phone" && !normalizePhone(value)) issues.push({ path, code: "phone" });
      else if (field.pattern === "email" && !EMAIL_RE.test(value.trim())) issues.push({ path, code: "email" });
    }
    if (field.kind === "consent" && value !== true) issues.push({ path, code: "consent" });
  }
  return issues;
}

function validateLocalized(value: unknown, path: string, field: EditorField): Issue[] {
  const issues: Issue[] = [];
  if (field.required && !readLocale(value, "en").trim()) issues.push({ path: `${path}.en`, code: "required" });
  for (const locale of LOCALES) {
    if (readLocale(value, locale).length > field.maxLength) issues.push({ path: `${path}.${locale}`, code: "tooLong", limit: field.maxLength });
  }
  return issues;
}

function validateImage(content: Content, prefix: string): Issue[] {
  if (!isOwnerUpload(content.image) || readLocale(content.imageAlt, "en").trim()) return [];
  return [{ path: `${prefix}imageAlt.en`, code: "altRequired" }];
}

/**
 * Prepare a section for saving: drop empty optional text (the server removes it too) and empty lines.
 * Localized values keep "" for a cleared locale, so the server knows the owner cleared it.
 */
export function cleanContent(content: Content): Content {
  const result: Content = {};
  for (const [key, value] of Object.entries(content)) {
    if (Array.isArray(value)) result[key] = value.filter((entry) => !isBlankLocalized(entry)).map((entry) => isPlainObject(entry) ? cleanContent(entry as Content) : entry);
    else if (isPlainObject(value) && !isLocalizedObject(value)) result[key] = cleanContent(value as Content);
    else if (typeof value === "string" && !value.trim() && key !== "id") continue;
    else result[key] = value;
  }
  return result;
}

function isPlainObject(value: unknown): boolean {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isLocalizedObject(value: unknown): boolean {
  const keys = Object.keys(asRecord(value));
  return keys.length > 0 && keys.every((key) => key === "en" || key === "am");
}

function isBlankLocalized(value: unknown): boolean {
  return isLocalizedObject(value) && Object.values(asRecord(value)).every((text) => typeof text !== "string" || !text.trim());
}

const ACTION_KEYS = new Set(["action", "primaryAction", "secondaryAction", "directionsAction"]);

/**
 * The live preview: the last server snapshot with the owner's unsaved text and images on top.
 * Actions keep their server-projected links (the draft has only intents), matched by item id or position.
 */
export function previewSections<S extends { type: string; content: Content }>(snapshot: S[], draft: { type: string; content: Content }[], derived?: { services?: Record<string, string>; places?: Record<string, string> }): S[] {
  return snapshot.map((section) => {
    const edited = draft.find((row) => row.type === section.type);
    if (!edited) return section;
    const content = overlay(section.content, edited.content);
    const formats = section.type === "services" ? derived?.services : section.type === "locations" ? derived?.places : undefined;
    if (formats && Array.isArray(content.items)) {
      content.items = asRecords(content.items).map((item) => item.format ? item : { ...item, format: shownMeet(item, formats, section.type === "locations").meet });
    }
    return { ...section, content };
  });
}

function overlay(projected: Content, edited: Content): Content {
  const result: Content = {};
  for (const [key, value] of Object.entries(edited)) {
    if (ACTION_KEYS.has(key)) { if (projected[key] !== undefined) result[key] = projected[key]; continue; }
    if (Array.isArray(value)) {
      const before = asRecords(projected[key]);
      result[key] = value.map((entry, index) => {
        if (!isPlainObject(entry) || isLocalizedObject(entry)) return entry;
        const item = entry as Content;
        const match = item.id !== undefined ? before.find((row) => row.id === item.id) : before[index];
        return overlay(match || {}, item);
      });
    } else result[key] = value;
  }
  return result;
}

/** A focal point in percent, clamped and rounded, from a click inside an image box. */
export function focusFromPoint(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  return { x: clamp(width ? (x / width) * 100 : 50), y: clamp(height ? (y / height) * 100 : 50) };
}

/** A starting alt text for a new photo: the section or item title, in each language. */
export function suggestAlt(title: unknown): Localized {
  const result: Localized = {};
  for (const locale of LOCALES) {
    const text = readLocale(title, locale).trim();
    if (text) result[locale] = text;
  }
  return result;
}

/** Client-side size and type check that mirrors the server's media limits. */
export function checkUpload(file: { size: number; type: string }, limits: { maxBytes: number; types: string[] }): "tooLarge" | "type" | null {
  if (!limits.types.includes(file.type)) return "type";
  if (file.size > limits.maxBytes) return "tooLarge";
  return null;
}
