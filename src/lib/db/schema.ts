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
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { DEFAULT_WS_ROLE_PERMISSIONS } from "@/lib/constants/workspacePermissions";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "member"]);
// Tier de producto por entorno (modelo híbrido: interno = premium, tenants
// vendidos = basic con upsell). Default premium → nada se oculta hoy.
export const workspaceTierEnum = pgEnum("workspace_tier", ["basic", "premium"]);
// workspace_role enum eliminado: workspace_members.role ahora es text para
// soportar roles custom definidos por entorno en workspaces.role_permissions.
// Built-in: owner / admin / member. Owner = bypass total, no se almacena en
// la matriz. La migración guarded convierte el column type y dropea el enum.
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
// Status del proyecto (estado del trabajo, distinto de la categoría/bucket).
// Los valores nuevos (prospecto/primer_contrato/firmado/descartado/retomar/
// operaciones) quedan en el enum por compat de PG (no se pueden DROP), pero
// el runtime no los usa más — esos pasaron a ser BUCKETS (categorías).
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "in_review",
  "stopped",
  "completed",
  "archived",
  "prospecto",
  "primer_contrato",
  "firmado",
  "descartado",
  "retomar",
  "operaciones",
]);
export const changelogActionEnum = pgEnum("changelog_action", [
  "created", "updated", "deleted", "status_changed", "assigned", "unassigned", "uploaded", "noted",
  "product_created", "product_updated", "product_archived",
]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive", "prospect"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "cancelled"]);
export const currencyEnum = pgEnum("currency", ["CRC", "USD"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_due_soon",
  "task_status_changed",
  "note_mentioned",
  "project_member_added",
  "workspace_member_added",
  "comment_reply",
]);

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

// ─── Refresh tokens (mobile / bearer auth) ──────────────────────────────────
// Antes: el access token mobile tenía TTL de 30 días sin forma de revocarlo.
// Riesgo: si se filtraba, el atacante tenía 30 días.
//
// Ahora: access token TTL corto (24h) + refresh token (30d, single-use,
// rotación). Logout / cambio de password puede revocar refresh tokens
// puntuales sin invalidar a todo el universo.

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("refresh_tokens_user_idx").on(t.userId),
  })
);

// ─── Rate limits (auth) ──────────────────────────────────────────────────────
// Sin Upstash ni servicios pagos. Tracking simple en DB:
//   - key = "mobile-token:email@x" o "signup:1.2.3.4"
//   - count = intentos fallidos en la ventana actual
//   - lockedUntil = si > now() → endpoint rechaza con 429
//
// Reset al login exitoso. Limpieza pasiva: filas viejas se ignoran y un cron
// (futuro) puede DELETE WHERE updated_at < now() - 24h.

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  // Tier de producto (modelo híbrido). Default premium para no ocultar nada
  // en los entornos actuales de RMH; tenants nuevos podrán arrancar en basic.
  tier: workspaceTierEnum("tier").default("premium").notNull(),
  rolePermissions: json("role_permissions")
    .$type<Record<string, string[]>>()
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
    // role: text para soportar built-in (owner/admin/member) + roles custom
    // que el admin del entorno define en workspaces.role_permissions.
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
    // Hot path: "¿en qué workspaces está este user?" — usado en requireWs y APIs mobile.
    // El PK (workspaceId, userId) no cubre queries WHERE user_id = ? solo.
    userIdx: index("workspace_members_user_idx").on(t.userId),
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

export const tasks = pgTable(
  "tasks",
  {
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
  },
  (t) => ({
    // Hot paths: /dashboard (mis tareas), /projects/[id] (board), /reports.
    assigneeStatusIdx: index("tasks_assignee_status_idx").on(t.assigneeId, t.status),
    projectStatusIdx: index("tasks_project_status_idx").on(t.projectId, t.status),
    parentIdx: index("tasks_parent_idx").on(t.parentTaskId),
  })
);

// Asignados múltiples por tarea (many-to-many). Fuente de verdad de "quién
// está asignado". `tasks.assignee_id` se mantiene como responsable primario
// denormalizado (= primer asignado) para compat con queries que aún lo usan.
export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.userId] }),
    // Reverse lookup "mis tareas" (WHERE user_id = me).
    userIdx: index("task_assignees_user_idx").on(t.userId),
  })
);

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    blobUrl: text("blob_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("documents_project_idx").on(t.projectId),
    taskIdx: index("documents_task_idx").on(t.taskId),
  })
);

// ─── Notes ────────────────────────────────────────────────────────────────────

export const notes = pgTable(
  "notes",
  {
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
  },
  (t) => ({
    projectIdx: index("notes_project_idx").on(t.projectId),
    taskIdx: index("notes_task_idx").on(t.taskId),
  })
);

// ─── Changelog ────────────────────────────────────────────────────────────────

export const changelog = pgTable(
  "changelog",
  {
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
  },
  (t) => ({
    projectIdx: index("changelog_project_idx").on(t.projectId),
    userIdx: index("changelog_user_idx").on(t.userId),
  })
);

// ─── Task comments (bitácora append-only) ──────────────────────────────────
// Cada entrada queda con autor + timestamp y no se edita más después de
// crearla. Borrar permitido sólo al autor en los primeros 5 min (typo fix).
// Modelado como log inmutable separado de `notes` (que son docs editables a
// nivel proyecto).

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    taskCreatedIdx: index("task_comments_task_created_idx").on(
      t.taskId,
      t.createdAt
    ),
  })
);

// ─── Notifications (N4) ──────────────────────────────────────────────────────
// Bell con badge en topbar + drawer slide-in. Polling cada 30s.
// Trigger desde server actions cuando algo "le pasa al usuario" (asignación,
// mención, member-add, etc.). Sin webhooks ni SSE en esta iter (más simple).

export interface NotificationPayload {
  title: string;       // "Te asignaron una tarea"
  body?: string;       // "Diseño hero web — Sitio RMH"
  actorId?: string;    // quién lo originó
  actorName?: string;
  actorAvatarUrl?: string | null;
  // Relaciones libres por type (taskId, projectId, noteId, etc.)
  refs?: Record<string, string>;
}

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: json("payload").$type<NotificationPayload>().notNull(),
    href: text("href"), // URL para hacer click (opcional)
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // Polling cada 30s × N usuarios → estos índices son críticos.
    userCreatedIdx: index("notifications_user_created_idx").on(t.userId, t.createdAt),
    userUnreadIdx: index("notifications_user_unread_idx").on(t.userId, t.readAt),
  })
);

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
  // Token UUID para acceso al portal del cliente (link secreto, sin cuenta).
  // null = portal no activado. Se genera bajo demanda desde el admin.
  portalToken: uuid("portal_token").unique(),
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

/**
 * Reportes entregables para clientes.
 * Distintos de los /reports de analytics (KPIs internos).
 * Se crean dentro de un proyecto, se publican para que el cliente los vea en su portal.
 */
export const clientReports = pgTable("client_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),   // URL Vercel Blob — nullable si es solo texto
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  reportDate: date("report_date"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  projectIdx: index("client_reports_project_idx").on(t.projectId),
  clientIdx: index("client_reports_client_idx").on(t.clientId),
}));

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

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  assignees: many(taskAssignees),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
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

// ─── Email Blaster (campañas de marketing) ──────────────────────────────────────
//
// Sistema ADITIVO de envío masivo: cola en DB → Vercel Cron → Resend batch API.
// NO toca el flujo transaccional (tareas/password en src/lib/email.ts). La
// deliverability se aísla con RESEND_MARKETING_API_KEY + subdominio propio.
//
// `bucketId` = etiqueta de negocio (multi-business forward-compat). Hoy los
// destinatarios salen de `clients` (CRM) filtrados por status; ver
// src/lib/marketing/segment.ts.

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "failed",
]);

export const sendStatusEnum = pgEnum("send_status", [
  "queued",
  "sending",
  "sent",
  "delivered",
  "bounced",
  "complained",
  "failed",
]);

export const suppressionReasonEnum = pgEnum("suppression_reason", [
  "unsubscribe",
  "hard_bounce",
  "complaint",
  "manual",
]);

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "delivery_delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: text("bucket_id").notNull(), // etiqueta de negocio (RMH | ...)
    name: text("name").notNull(),
    subject: text("subject").notNull(), // admite {{merge}} tags
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to"),
    html: text("html").notNull(), // plantilla con {{nombre}} {{empresa}} ...
    segmentQuery: jsonb("segment_query"), // filtro usado (auditoría)
    status: campaignStatusEnum("status").default("draft").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    bucketIdx: index("campaigns_bucket_idx").on(t.bucketId),
    statusIdx: index("campaigns_status_idx").on(t.status),
  })
);

export const campaignSends = pgTable(
  "campaign_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    bucketId: text("bucket_id").notNull(),
    contactId: text("contact_id"), // id del client del CRM (texto, no FK dura)
    email: text("email").notNull(),
    mergeData: jsonb("merge_data"), // { nombre, empresa, ... }
    status: sendStatusEnum("status").default("queued").notNull(),
    providerMessageId: text("provider_message_id"), // id de Resend
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx: index("sends_campaign_idx").on(t.campaignId),
    statusIdx: index("sends_status_idx").on(t.status),
    providerIdx: index("sends_provider_idx").on(t.providerMessageId),
  })
);

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sendId: uuid("send_id").references(() => campaignSends.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id"),
    type: emailEventTypeEnum("type").notNull(),
    email: text("email"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sendIdx: index("events_send_idx").on(t.sendId),
    campaignIdx: index("events_campaign_idx").on(t.campaignId),
    typeIdx: index("events_type_idx").on(t.type),
  })
);

export const suppressions = pgTable(
  "suppressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: text("bucket_id").notNull(),
    email: text("email").notNull(),
    reason: suppressionReasonEnum("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // misma persona puede estar suprimida en un bucket y no en otro
    uniq: uniqueIndex("suppressions_bucket_email_uniq").on(t.bucketId, t.email),
  })
);

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  sends: many(campaignSends),
}));

export const campaignSendsRelations = relations(campaignSends, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSends.campaignId],
    references: [campaigns.id],
  }),
}));
