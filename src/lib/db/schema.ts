import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  numeric,
  date,
  json,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { DEFAULT_WS_ROLE_PERMISSIONS } from "@/lib/constants/workspacePermissions";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "member"]);
export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "in_review",
  "stopped",
  "completed",
  "archived",
]);
export const changelogActionEnum = pgEnum("changelog_action", [
  "created", "updated", "deleted", "status_changed", "assigned", "unassigned", "uploaded", "noted",
  "product_created", "product_updated", "product_archived",
]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive", "prospect"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "cancelled"]);
export const currencyEnum = pgEnum("currency", ["CRC", "USD"]);

// ─── Users (replaces Supabase auth.users + profiles) ─────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("member").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── NextAuth tables ──────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Buckets ──────────────────────────────────────────────────────────────────

export const buckets = pgTable("buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").default("#6B5FE4").notNull(),
  position: integer("position").default(0).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Entornos (workspaces, estilo ClickUp) ───────────────────────────────────
// Contenedor top-level aislado. Una persona puede pertenecer a varios sin que
// se crucen. Membresía con rol (owner/admin/member) y matriz de permisos
// configurable (role_permissions jsonb): owner ⇒ todo; admin/member ⇒ matriz.

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").default("#6B5FE4").notNull(),
  rolePermissions: json("role_permissions")
    .$type<{ admin: string[]; member: string[] }>()
    .default(DEFAULT_WS_ROLE_PERMISSIONS)
    .notNull(),
  teamAgreements: text("team_agreements"),
  breakEvenMargin: numeric("break_even_margin", { precision: 5, scale: 4 })
    .default("0.45")
    .notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
  })
);

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  bucketId: uuid("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("active").notNull(),
  color: text("color"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  dueDate: date("due_date"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
  })
);

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: uuid("parent_task_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  blobUrl: text("blob_url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notes ────────────────────────────────────────────────────────────────────

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: json("content"),
  contentText: text("content_text"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Changelog ────────────────────────────────────────────────────────────────

export const changelog = pgTable("changelog", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: changelogActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  oldValue: json("old_value"),
  newValue: json("new_value"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CRM ──────────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  status: clientStatusEnum("status").default("active").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientAccounts = pgTable("client_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  bankName: text("bank_name"),
  accountNumber: text("account_number").notNull(),
  accountType: text("account_type"),
  currency: currencyEnum("currency").default("CRC").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default("CRC").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  invoiceUrl: text("invoice_url"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientProjects = pgTable("client_projects", {
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  projectMembers: many(projectMembers),
  tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  bucket: one(buckets, { fields: [projects.bucketId], references: [buckets.id] }),
  members: many(projectMembers),
  tasks: many(tasks),
  notes: many(notes),
  documents: many(documents),
  changelog: many(changelog),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  projects: many(projects),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  accounts: many(clientAccounts),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  client: one(clients, { fields: [payments.clientId], references: [clients.id] }),
  project: one(projects, { fields: [payments.projectId], references: [projects.id] }),
}));

// ─── Etiquetas de tareas (tracker) ────────────────────────────────────────────

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    color: varchar("color", { length: 7 }).default("#6E83FF").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    projectNameUnq: uniqueIndex("tags_project_name_unq").on(
      t.projectId,
      t.name
    ),
  })
);

export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.tagId] }),
  })
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  project: one(projects, {
    fields: [tags.projectId],
    references: [projects.id],
  }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}));

// ─── ERP por entorno (estructura del Excel) ──────────────────────────────────
// Catálogo · Cotizador · Ventas · Gastos · Equipo. Todo scoped por workspace.
// numeric(12,2) viaja como string; total/ganancia/%margen se derivan en lectura.

export const erpExpenseKindEnum = pgEnum("erp_expense_kind", [
  "investment",
  "fixed",
]);

export const erpProducts = pgTable(
  "erp_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    materialsCost: numeric("materials_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    laborCost: numeric("labor_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    price: numeric("price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({ wsIdx: index("erp_products_ws_idx").on(t.workspaceId) })
);

export const erpQuotes = pgTable(
  "erp_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    customerName: text("customer_name"),
    ivaRate: numeric("iva_rate", { precision: 5, scale: 4 })
      .default("0.13")
      .notNull(),
    status: text("status").default("draft").notNull(),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({ wsIdx: index("erp_quotes_ws_idx").on(t.workspaceId) })
);

export const erpQuoteItems = pgTable(
  "erp_quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => erpQuotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    qty: numeric("qty", { precision: 12, scale: 2 }).default("1").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => ({ quoteIdx: index("erp_quote_items_quote_idx").on(t.quoteId) })
);

export const erpSales = pgTable(
  "erp_sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    saleDate: date("sale_date").notNull(),
    description: text("description").notNull(),
    clientName: text("client_name"),
    category: text("category"),
    qty: numeric("qty", { precision: 12, scale: 2 }).default("1").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    wsDateIdx: index("erp_sales_ws_date_idx").on(t.workspaceId, t.saleDate),
  })
);

export const erpExpenses = pgTable(
  "erp_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: erpExpenseKindEnum("kind").notNull(),
    concept: text("concept").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    category: text("category"),
    priority: text("priority"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    wsKindIdx: index("erp_expenses_ws_kind_idx").on(t.workspaceId, t.kind),
  })
);

export const erpTeam = pgTable(
  "erp_team",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    responsibilities: text("responsibilities"),
    compensation: text("compensation"),
    status: text("status").default("active").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ wsIdx: index("erp_team_ws_idx").on(t.workspaceId) })
);

export const erpQuotesRelations = relations(erpQuotes, ({ many }) => ({
  items: many(erpQuoteItems),
}));

export const erpQuoteItemsRelations = relations(erpQuoteItems, ({ one }) => ({
  quote: one(erpQuotes, {
    fields: [erpQuoteItems.quoteId],
    references: [erpQuotes.id],
  }),
}));
