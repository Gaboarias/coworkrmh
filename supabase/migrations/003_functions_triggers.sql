-- ============================================================
-- Migration 003: Functions & Triggers - Cowork RMH
-- ============================================================

-- ============================================================
-- TRIGGER: update_updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_buckets_updated_at
  BEFORE UPDATE ON buckets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 'admin'::user_role
      ELSE 'member'::user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: set completed_at on task status change
-- ============================================================

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_task_completed_at();

-- ============================================================
-- TRIGGER: changelog on task changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_action changelog_action;
  v_description TEXT;
  v_old_value JSONB := NULL;
  v_new_value JSONB := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_description := 'Tarea creada: ' || NEW.title;
    v_new_value := to_jsonb(NEW);

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_description := 'Tarea eliminada: ' || OLD.title;
    v_old_value := to_jsonb(OLD);

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_changed';
      v_description := 'Estado cambiado de ' || OLD.status || ' a ' || NEW.status;
      v_old_value := jsonb_build_object('status', OLD.status);
      v_new_value := jsonb_build_object('status', NEW.status);

    ELSIF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      IF NEW.assignee_id IS NULL THEN
        v_action := 'unassigned';
        v_description := 'Tarea desasignada';
      ELSE
        v_action := 'assigned';
        v_description := 'Tarea asignada';
      END IF;
      v_old_value := jsonb_build_object('assignee_id', OLD.assignee_id);
      v_new_value := jsonb_build_object('assignee_id', NEW.assignee_id);

    ELSE
      v_action := 'updated';
      v_description := 'Tarea actualizada: ' || NEW.title;
      v_old_value := to_jsonb(OLD);
      v_new_value := to_jsonb(NEW);
    END IF;
  END IF;

  INSERT INTO changelog (
    project_id, task_id, user_id,
    action, entity_type, entity_id,
    old_value, new_value, description
  ) VALUES (
    COALESCE(NEW.project_id, OLD.project_id),
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    v_action,
    'task',
    COALESCE(NEW.id, OLD.id),
    v_old_value,
    v_new_value,
    v_description
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_task_change
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_change();

-- ============================================================
-- TRIGGER: changelog on payment status change
-- ============================================================

CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO changelog (
      user_id, action, entity_type, entity_id,
      new_value, description
    ) VALUES (
      auth.uid(), 'created', 'payment', NEW.id,
      to_jsonb(NEW),
      'Pago registrado: ' || NEW.description
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO changelog (
      user_id, action, entity_type, entity_id,
      old_value, new_value, description
    ) VALUES (
      auth.uid(), 'status_changed', 'payment', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      'Estado de pago cambiado de ' || OLD.status || ' a ' || NEW.status
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();

-- ============================================================
-- STORAGE BUCKET SETUP (run after creating buckets in dashboard)
-- ============================================================

-- These commands should be run via Supabase Dashboard > Storage
-- or via the Supabase CLI:
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('project-documents', 'project-documents', false, 52428800,
--    ARRAY['image/*', 'application/pdf', 'application/msword',
--          'application/vnd.openxmlformats-officedocument.*', 'text/*']),
--   ('avatars', 'avatars', true, 5242880, ARRAY['image/*']);
