"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Video,
} from "lucide-react";
import { TasksViewSwitch } from "@/components/tasks/TasksViewSwitch";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatDateCR, formatTimeCR } from "@/lib/utils/datetime";
import { Modal } from "@/components/ui/Modal";
import type { TaskPriority } from "@/lib/types";

// Constante de módulo — no recrear en cada render de CalendarView.
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  assigneeId: string | null;
  assigneeIds: string[];
  project: { name: string; color: string | null } | null;
}

interface CalendarProject {
  id: string;
  name: string;
  color: string | null;
  startDate: string;
  endDate: string;
}

interface CalendarNote {
  id: string;
  title: string;
  projectId: string;
  projectName: string | null;
  projectColor: string | null;
  date: string;
}

interface CalendarChange {
  id: string;
  description: string;
  projectId: string;
  projectName: string | null;
  date: string;
}

interface CalendarMeeting {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  url: string | null;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  projects: CalendarProject[];
  notes: CalendarNote[];
  changelog: CalendarChange[];
  meetings?: CalendarMeeting[];
  userId: string;
}

const priorityDot: Record<TaskPriority, string> = {
  urgent: "bg-danger",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-text-tertiary",
};

const DEFAULT_COLOR = "#ff6b6b"; // coral (Sunset Aurora primary)

export function CalendarView({
  tasks,
  projects,
  notes,
  changelog,
  meetings = [],
  userId,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  // Día seleccionado para el modal de "ver todo". null = cerrado.
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredTasks = showMyTasksOnly
    ? tasks.filter((t) => t.assigneeIds.includes(userId))
    : tasks;

  function tasksForDay(day: Date) {
    return filteredTasks.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), day)
    );
  }

  function projectsForDay(day: Date) {
    return projects.filter((p) => {
      const start = parseISO(p.startDate);
      const end = parseISO(p.endDate);
      if (end < start) return false;
      return isWithinInterval(day, { start, end });
    });
  }

  function notesForDay(day: Date) {
    return notes.filter((n) => isSameDay(parseISO(n.date), day));
  }

  function changesForDay(day: Date) {
    return changelog.filter((c) => isSameDay(parseISO(c.date), day));
  }

  function meetingsForDay(day: Date) {
    return meetings.filter((m) => isSameDay(parseISO(m.start), day));
  }


  return (
    <div className="animate-fade-in p-6 md:p-8">
      <TasksViewSwitch />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Calendario
          </h1>
          <p className="mt-1 text-sm capitalize text-text-muted">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-out",
              showMyTasksOnly
                ? "bg-primary text-primary-foreground"
                : "bg-surface-el text-text-muted hover:text-text"
            )}
          >
            {showMyTasksOnly ? "Mis tareas" : "Todas las tareas"}
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              aria-label="Mes anterior"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-el hover:text-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              aria-label="Mes siguiente"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-el hover:text-text"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-primary/60" />
          Duración de proyecto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Nota
        </span>
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3 w-3" />
          Cambio
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Video className="h-3 w-3" style={{ color: "var(--info)" }} />
          Reunión
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-elev-1">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-center text-xs font-semibold text-text-tertiary"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = tasksForDay(day);
            const dayProjects = projectsForDay(day);
            const dayNotes = notesForDay(day);
            const dayChanges = changesForDay(day);
            const dayMeetings = meetingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isMonday = idx % 7 === 0;

            const hasContent =
              dayTasks.length > 0 ||
              dayProjects.length > 0 ||
              dayNotes.length > 0 ||
              dayChanges.length > 0 ||
              dayMeetings.length > 0;

            return (
              <div
                key={idx}
                className={cn(
                  "group/cell relative min-h-[128px] border-b border-r border-border p-2 last:border-r-0",
                  !isCurrentMonth && "bg-surface-el/40",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <button
                  type="button"
                  onClick={() => hasContent && setSelectedDay(day)}
                  disabled={!hasContent}
                  aria-label={`Ver todo del ${formatDateCR(day)}`}
                  className={cn(
                    "mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCurrentDay
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                        ? "text-text"
                        : "text-text-tertiary",
                    hasContent
                      ? "cursor-pointer hover:bg-accent-soft"
                      : "cursor-default"
                  )}
                >
                  {format(day, "d")}
                </button>

                {dayProjects.length > 0 && (
                  <div className="mb-1 space-y-0.5">
                    {dayProjects.slice(0, 2).map((p) => {
                      const color = p.color ?? DEFAULT_COLOR;
                      const isStart = isSameDay(parseISO(p.startDate), day);
                      const isEnd = isSameDay(parseISO(p.endDate), day);
                      const showLabel = isStart || isMonday;
                      return (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          title={`${p.name} · ${formatDateCR(p.startDate)} – ${formatDateCR(p.endDate)}`}
                          className={cn(
                            "block h-4 truncate px-1 text-[12px] font-medium leading-4 text-text/90 transition-opacity hover:opacity-80",
                            isStart ? "rounded-l-sm" : "",
                            isEnd ? "rounded-r-sm" : "",
                            !isStart && !isEnd && "rounded-none"
                          )}
                          style={{
                            backgroundColor: `color-mix(in oklab, ${color} 38%, transparent)`,
                            borderLeft: isStart
                              ? `2px solid ${color}`
                              : undefined,
                          }}
                        >
                          {showLabel ? p.name : " "}
                        </Link>
                      );
                    })}
                    {dayProjects.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="block w-full rounded px-1 text-left text-[12px] font-medium text-primary transition-colors hover:bg-accent-soft hover:text-text"
                      >
                        +{dayProjects.length - 2} proyectos →
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.projectId}`}
                      title={task.title}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-surface-el"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                          priorityDot[task.priority] ?? "bg-text-tertiary"
                        )}
                      />
                      <span
                        className={cn(
                          "truncate",
                          task.status === "done"
                            ? "text-text-tertiary line-through"
                            : "text-text-muted"
                        )}
                      >
                        {task.title}
                      </span>
                    </Link>
                  ))}
                  {dayTasks.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className="block w-full rounded px-1 py-0.5 text-left text-xs font-medium text-primary transition-colors hover:bg-accent-soft hover:text-text"
                    >
                      +{dayTasks.length - 2} más →
                    </button>
                  )}
                </div>

                {dayMeetings.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <a
                        key={m.id}
                        href={m.url ?? "#"}
                        target={m.url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        title={`${m.title}${m.allDay ? "" : ` · ${formatTimeCR(m.start)}`}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-surface-el"
                        style={{
                          backgroundColor:
                            "color-mix(in oklab, var(--info) 12%, transparent)",
                        }}
                      >
                        <Video
                          className="h-2.5 w-2.5 flex-shrink-0"
                          style={{ color: "var(--info)" }}
                        />
                        <span className="truncate text-text-muted">
                          {m.title}
                        </span>
                      </a>
                    ))}
                    {dayMeetings.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="block w-full rounded px-1 py-0.5 text-left text-xs font-medium text-primary transition-colors hover:bg-accent-soft hover:text-text"
                      >
                        +{dayMeetings.length - 2} reuniones →
                      </button>
                    )}
                  </div>
                )}

                {(dayNotes.length > 0 || dayChanges.length > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {dayNotes.slice(0, 2).map((n) => (
                      <Link
                        key={n.id}
                        href={`/projects/${n.projectId}/notes`}
                        title={`Nota: ${n.title}`}
                        className="inline-flex max-w-full items-center gap-0.5 rounded bg-surface-el px-1 py-0.5 text-[12px] text-text-muted transition-colors hover:text-text"
                      >
                        <FileText className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{n.title}</span>
                      </Link>
                    ))}
                    {dayChanges.length > 0 && (
                      <Link
                        href={
                          dayChanges[0]!.projectId
                            ? `/projects/${dayChanges[0]!.projectId}/changelog`
                            : "#"
                        }
                        title={`${dayChanges.length} cambio(s)`}
                        className="inline-flex items-center gap-0.5 rounded bg-surface-el px-1 py-0.5 text-[12px] text-text-muted transition-colors hover:text-text"
                      >
                        <History className="h-2.5 w-2.5" />
                        {dayChanges.length}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DayDetailModal
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        tasks={selectedDay ? tasksForDay(selectedDay) : []}
        projects={selectedDay ? projectsForDay(selectedDay) : []}
        notes={selectedDay ? notesForDay(selectedDay) : []}
        changes={selectedDay ? changesForDay(selectedDay) : []}
        meetings={selectedDay ? meetingsForDay(selectedDay) : []}
      />
    </div>
  );
}

// ── Day-detail modal ───────────────────────────────────────────────
// Se abre al click en el número del día o en "+N más" cuando hay más
// items de los que caben en la celda.

function DayDetailModal({
  day,
  onClose,
  tasks,
  projects,
  notes,
  changes,
  meetings,
}: {
  day: Date | null;
  onClose: () => void;
  tasks: CalendarTask[];
  projects: CalendarProject[];
  notes: CalendarNote[];
  changes: CalendarChange[];
  meetings: CalendarMeeting[];
}) {
  if (!day) return null;
  const titleDate = formatDateCR(day, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={titleDate.charAt(0).toUpperCase() + titleDate.slice(1)}
      size="lg"
    >
      <div className="space-y-5">
        {meetings.length > 0 && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Reuniones ({meetings.length})
            </h3>
            <ul className="space-y-1">
              {meetings.map((m) => {
                const inner = (
                  <span className="flex items-center gap-2">
                    <Video
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: "var(--info)" }}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-text">
                      {m.title}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {m.allDay ? "Todo el día" : formatTimeCR(m.start)}
                    </span>
                  </span>
                );
                return (
                  <li key={m.id}>
                    {m.url ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface-el"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="px-2 py-1.5 text-sm">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {projects.length > 0 && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Proyectos activos ({projects.length})
            </h3>
            <ul className="space-y-1.5">
              {projects.map((p) => {
                const color = p.color ?? DEFAULT_COLOR;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-text transition-colors hover:bg-surface-el"
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="ml-auto text-xs text-text-tertiary">
                        {formatDateCR(p.startDate)} – {formatDateCR(p.endDate)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {tasks.length > 0 && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Tareas ({tasks.length})
            </h3>
            <ul className="space-y-1">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.projectId}`}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface-el"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                        priorityDot[t.priority] ?? "bg-text-tertiary"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        t.status === "done"
                          ? "text-text-tertiary line-through"
                          : "text-text"
                      )}
                    >
                      {t.title}
                    </span>
                    {t.project?.name && (
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              t.project.color ?? DEFAULT_COLOR,
                          }}
                        />
                        <span className="max-w-[140px] truncate">
                          {t.project.name}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notes.length > 0 && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Notas ({notes.length})
            </h3>
            <ul className="space-y-1">
              {notes.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/projects/${n.projectId}/notes`}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-text transition-colors hover:bg-surface-el"
                  >
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    {n.projectName && (
                      <span className="text-xs text-text-tertiary">
                        {n.projectName}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {changes.length > 0 && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Cambios ({changes.length})
            </h3>
            <ul className="space-y-1">
              {changes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={
                      c.projectId
                        ? `/projects/${c.projectId}/changelog`
                        : "#"
                    }
                    onClick={onClose}
                    className="flex items-start gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-surface-el"
                  >
                    <History className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 text-text">
                      {c.description}
                    </span>
                    {c.projectName && (
                      <span className="text-xs text-text-tertiary">
                        {c.projectName}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tasks.length === 0 &&
          projects.length === 0 &&
          notes.length === 0 &&
          changes.length === 0 &&
          meetings.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              Sin actividad este día.
            </p>
          )}
      </div>
    </Modal>
  );
}
