export enum TaskStatus {
    Pending = "pending",
    Notified = "notified",
    Scheduled = "scheduled",
    Completed = "completed",
    Overdue = "overdue",
}

export interface Task {
    id: string;
    name: string;
    description?: string;

    intervalDays: number;
    flexibilityDays: number;
    preferredDayOfWeek?: number;
    durationMinutes: number;

    lastCompletedDate?: string;
    nextDueDate: string;
    status: TaskStatus;

    scheduledEventId?: string;
    snoozeCount: number;

    createdAt: string;
    updatedAt: string;
}
