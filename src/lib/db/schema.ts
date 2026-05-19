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

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "member"]);
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
  teamAgreements: text("team_agreements"),
  breakEvenMargin: numeric("break_even_margin", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
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
  bucketId: uuid("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
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
  currency: text("currency").default("USD").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
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
  bucket: one(buckets, { fields: [projects.bucketId], references: [buckets.id] }),
  members: many(projectMembers),
  tasks: many(tasks),
  notes: many(notes),
  documents: many(documents),
  changelog: many(changelog),
}));

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

// ─── Perfiles configurables por negocio ──────────────────────────────────────
// Cada negocio (bucket) define sus perfiles con una matriz de permisos editable.
// permissions = array de claves de permiso (ver src/lib/utils/permissions.ts).

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    permissions: json("permissions").$type<string[]>().default([]).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    bucketNameUnq: uniqueIndex("profiles_bucket_name_unq").on(
      t.bucketId,
      t.name
    ),
  })
);

// ─── Bucket members (acceso por equipo/negocio) ──────────────────────────────
// Cada bucket = un equipo/negocio. Un usuario solo ve los buckets donde está
// asignado. Mismo patrón que project_members (PK compuesta).

export const bucketMembers = pgTable(
  "bucket_members",
  {
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").default("member").notNull(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    responsibilities: text("responsibilities"),
    compensation: text("compensation"),
    memberStatus: text("member_status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bucketId, t.userId] }),
  })
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  bucket: one(buckets, {
    fields: [profiles.bucketId],
    references: [buckets.id],
  }),
  members: many(bucketMembers),
}));

export const bucketMembersRelations = relations(bucketMembers, ({ one }) => ({
  bucket: one(buckets, {
    fields: [bucketMembers.bucketId],
    references: [buckets.id],
  }),
  user: one(users, {
    fields: [bucketMembers.userId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [bucketMembers.profileId],
    references: [profiles.id],
  }),
}));

// ─── Operations module ────────────────────────────────────────────────────────
// Multi-negocio: cada negocio = un bucket (top-level ya existente). Las tablas
// referencian bucketId NOT NULL para aislar catálogos por negocio.

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "archived",
]);

export const currencyEnum = pgEnum("currency", ["CRC", "USD"]);

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    color: varchar("color", { length: 7 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    bucketNameUnq: uniqueIndex("product_categories_bucket_name_unq").on(
      t.bucketId,
      t.name
    ),
  })
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    sku: varchar("sku", { length: 60 }),
    status: productStatusEnum("status").default("active").notNull(),
    currency: currencyEnum("currency").default("CRC").notNull(),
    basePrice: numeric("base_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    defaultMaterialsCost: numeric("default_materials_cost", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    defaultLaborCost: numeric("default_labor_cost", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    imageUrl: text("image_url"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (t) => ({
    bucketIdx: index("products_bucket_idx").on(t.bucketId),
    bucketStatusIdx: index("products_bucket_status_idx").on(
      t.bucketId,
      t.status
    ),
    bucketSkuUnq: uniqueIndex("products_bucket_sku_unq")
      .on(t.bucketId, t.sku)
      .where(sql`${t.sku} IS NOT NULL`),
  })
);

export const productCostHistory = pgTable(
  "product_cost_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    materialsCost: numeric("materials_cost", {
      precision: 12,
      scale: 2,
    }).notNull(),
    laborCost: numeric("labor_cost", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    changedById: uuid("changed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
  },
  (t) => ({
    productChangedIdx: index("product_cost_history_product_changed_idx").on(
      t.productId,
      t.changedAt.desc()
    ),
  })
);

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    bucket: one(buckets, {
      fields: [productCategories.bucketId],
      references: [buckets.id],
    }),
    products: many(products),
  })
);

export const productsRelations = relations(products, ({ one, many }) => ({
  bucket: one(buckets, {
    fields: [products.bucketId],
    references: [buckets.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  createdBy: one(users, {
    fields: [products.createdById],
    references: [users.id],
  }),
  costHistory: many(productCostHistory),
}));

export const productCostHistoryRelations = relations(
  productCostHistory,
  ({ one }) => ({
    product: one(products, {
      fields: [productCostHistory.productId],
      references: [products.id],
    }),
    changedBy: one(users, {
      fields: [productCostHistory.changedById],
      references: [users.id],
    }),
  })
);

// ─── ERP: Cotizador / Ventas / Gastos ─────────────────────────────────────────

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

export const expenseKindEnum = pgEnum("expense_kind", [
  "investment",
  "fixed_monthly",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }),
    ivaRate: numeric("iva_rate", { precision: 5, scale: 4 })
      .default("0.13")
      .notNull(),
    status: quoteStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    bucketIdx: index("quotes_bucket_idx").on(t.bucketId),
  })
);

export const quoteItems = pgTable(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    qty: numeric("qty", { precision: 12, scale: 2 }).default("1").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    quoteIdx: index("quote_items_quote_idx").on(t.quoteId),
  })
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    saleDate: date("sale_date").notNull(),
    description: text("description").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    clientName: varchar("client_name", { length: 200 }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
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
    bucketDateIdx: index("sales_bucket_date_idx").on(t.bucketId, t.saleDate),
  })
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    kind: expenseKindEnum("kind").notNull(),
    concept: varchar("concept", { length: 200 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    category: varchar("category", { length: 80 }),
    priority: text("priority"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    bucketKindIdx: index("expenses_bucket_kind_idx").on(t.bucketId, t.kind),
  })
);

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  bucket: one(buckets, {
    fields: [quotes.bucketId],
    references: [buckets.id],
  }),
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  bucket: one(buckets, {
    fields: [sales.bucketId],
    references: [buckets.id],
  }),
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  category: one(productCategories, {
    fields: [sales.categoryId],
    references: [productCategories.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  bucket: one(buckets, {
    fields: [expenses.bucketId],
    references: [buckets.id],
  }),
}));

// ─── Etiquetas de tareas ──────────────────────────────────────────────────────

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
