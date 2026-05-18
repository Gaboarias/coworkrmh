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
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
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

interface CalendarViewProps {
  tasks: CalendarTask[];
  userId: string;
}

const priorityDot: Record<TaskPriority, string> = {
  urgent: "bg-danger",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-text-tertiary",
};

export function CalendarView({ tasks, userId }: CalendarViewProps) {
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
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] border-b border-r border-border p-2 last:border-r-0",
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

                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
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
                  {dayTasks.length > 3 && (
                    <p className="px-1 text-xs text-text-tertiary">
                      +{dayTasks.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
