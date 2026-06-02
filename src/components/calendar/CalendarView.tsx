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
import { ChevronLeft, ChevronRight, FileText, History } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatDateCR } from "@/lib/utils/datetime";
import type { TaskPriority } from "@/lib/types";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  assigneeId: string | null;
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

interface CalendarViewProps {
  tasks: CalendarTask[];
  projects: CalendarProject[];
  notes: CalendarNote[];
  changelog: CalendarChange[];
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
  userId,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredTasks = showMyTasksOnly
    ? tasks.filter((t) => t.assigneeId === userId)
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

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="animate-fade-in p-6 md:p-8">
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
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              aria-label="Mes anterior"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-el hover:text-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
            >
              Hoy
            </button>
            <button
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
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-elev-1">
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => (
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
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isMonday = idx % 7 === 0;

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[128px] border-b border-r border-border p-2 last:border-r-0",
                  !isCurrentMonth && "bg-surface-el/40",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div
                  className={cn(
                    "mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isCurrentDay
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                        ? "text-text"
                        : "text-text-tertiary"
                  )}
                >
                  {format(day, "d")}
                </div>

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
                      <p className="px-1 text-[12px] text-text-tertiary">
                        +{dayProjects.length - 2} proyectos
                      </p>
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
                    <p className="px-1 text-xs text-text-tertiary">
                      +{dayTasks.length - 2} más
                    </p>
                  )}
                </div>

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
    </div>
  );
}
