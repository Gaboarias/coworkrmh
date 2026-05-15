-- ============================================================
-- Migration 002: Row Level Security Policies - Cowork RMH
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get the global role of the current user
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Check if current user is a member of a project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

-- Get current user's role within a specific project
CREATE OR REPLACE FUNCTION project_member_role(p_project_id UUID)
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid();
$$;

-- Check if current user is admin or manager globally
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth_user_role() IN ('admin', 'manager');
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

CREATE POLICY "profiles_select_all_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR auth_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR auth_user_role() = 'admin');

-- ============================================================
-- BUCKETS POLICIES
-- ============================================================

CREATE POLICY "buckets_select_authenticated"
  ON buckets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "buckets_insert_admin_manager"
  ON buckets FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "buckets_update_admin_manager"
  ON buckets FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "buckets_delete_admin"
  ON buckets FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'admin');

-- ============================================================
-- PROJECTS POLICIES
-- ============================================================

CREATE POLICY "projects_select"
  ON projects FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR is_project_member(id)
    OR created_by = auth.uid()
  );

CREATE POLICY "projects_insert_admin_manager"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "projects_update_admin_manager"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'admin');

-- ============================================================
-- PROJECT MEMBERS POLICIES
-- ============================================================

CREATE POLICY "project_members_select"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

CREATE POLICY "project_members_insert_admin_manager"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "project_members_update_admin_manager"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "project_members_delete_admin_manager"
  ON project_members FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- ============================================================
-- TASKS POLICIES
-- ============================================================

CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR is_project_member(project_id)
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_or_manager()
    OR is_project_member(project_id)
  );

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR created_by = auth.uid()
  );

-- ============================================================
-- DOCUMENTS POLICIES
-- ============================================================

CREATE POLICY "documents_select"
  ON documents FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR is_project_member(project_id)
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "documents_insert"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_or_manager()
    OR is_project_member(project_id)
  );

CREATE POLICY "documents_delete"
  ON documents FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- NOTES POLICIES
-- ============================================================

CREATE POLICY "notes_select"
  ON notes FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR is_project_member(project_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "notes_insert"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_or_manager()
    OR is_project_member(project_id)
  );

CREATE POLICY "notes_update"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR is_project_member(project_id)
    OR created_by = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR is_project_member(project_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "notes_delete"
  ON notes FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR created_by = auth.uid()
  );

-- ============================================================
-- CHANGELOG POLICIES
-- ============================================================

CREATE POLICY "changelog_select"
  ON changelog FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR (project_id IS NOT NULL AND is_project_member(project_id))
    OR user_id = auth.uid()
  );

CREATE POLICY "changelog_insert_authenticated"
  ON changelog FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin_or_manager());

-- ============================================================
-- NOTE PRESENCE POLICIES
-- ============================================================

CREATE POLICY "note_presence_select"
  ON note_presence FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND is_project_member(n.project_id)
    )
  );

CREATE POLICY "note_presence_upsert"
  ON note_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_presence_update_own"
  ON note_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "note_presence_delete_own"
  ON note_presence FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- CRM: CLIENTS POLICIES
-- ============================================================

CREATE POLICY "clients_select_admin_manager"
  ON clients FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "clients_insert_admin_manager"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "clients_update_admin_manager"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'admin');

-- ============================================================
-- CRM: CLIENT ACCOUNTS POLICIES
-- ============================================================

CREATE POLICY "client_accounts_select_admin"
  ON client_accounts FOR SELECT
  TO authenticated
  USING (auth_user_role() = 'admin');

CREATE POLICY "client_accounts_insert_admin"
  ON client_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "client_accounts_update_admin"
  ON client_accounts FOR UPDATE
  TO authenticated
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "client_accounts_delete_admin"
  ON client_accounts FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'admin');

-- ============================================================
-- CRM: PAYMENTS POLICIES
-- ============================================================

CREATE POLICY "payments_select_admin_manager"
  ON payments FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "payments_insert_admin_manager"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "payments_update_admin_manager"
  ON payments FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "payments_delete_admin"
  ON payments FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'admin');

-- ============================================================
-- CRM: CLIENT PROJECTS POLICIES
-- ============================================================

CREATE POLICY "client_projects_select_admin_manager"
  ON client_projects FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "client_projects_insert_admin_manager"
  ON client_projects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "client_projects_delete_admin_manager"
  ON client_projects FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());
