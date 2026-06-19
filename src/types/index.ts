export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "done";
export type SubTaskStatus = "pending" | "in_progress" | "done";

export interface EventData {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  allDay?: boolean;
  color: string;
  location?: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  startDate?: string | null;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  estimatedHours?: number | null;
  color: string;
  templateId?: string | null;
  subtasks?: SubTaskData[];
}

export interface SubTaskData {
  id: string;
  taskId: string;
  title: string;
  estimatedHours?: number | null;
  order: number;
  status: SubTaskStatus;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}

export interface UserSettingsData {
  id: string;
  workStartHour: number;
  workEndHour: number;
  timezone: string;
}

export interface SubtaskTemplate {
  title: string;
  estimatedHours?: number;
}

export interface TaskTemplateData {
  id: string;
  title: string;
  description?: string | null;
  estimatedHours?: number | null;
  defaultSubtasks: SubtaskTemplate[];
}

// AI レスポンス型
export interface AIExtractedTask {
  title: string;
  description: string;
  estimatedHours: number;
  suggestedDeadline: string;
}

export interface AIBreakdownSubtask {
  title: string;
  estimatedHours: number;
}

export interface AIScheduledSubtask {
  subtaskId: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export interface AIParsedEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
}

export type AIErrorCode =
  | "ai_parse_error"
  | "ai_rate_limit"
  | "ai_timeout"
  | "ai_unknown";

export interface AIErrorResponse {
  error: AIErrorCode;
  message?: string;
}

// 決定論スケジューラ(/api/ai/plan)の結果型
export type UnplacedReason =
  | "no_time_before_deadline"
  | "longer_than_workday"
  | "invalid_estimate"
  | "invalid_work_window"
  | "deadline_in_past";

export interface PlanPlacedSubtask {
  subtaskId: string;
  scheduledStart: string; // UTC ISO
  scheduledEnd: string; // UTC ISO
}

export interface PlanUnplacedSubtask {
  subtaskId: string;
  title: string;
  reason: UnplacedReason;
}

export interface PlanResponse {
  placed: PlanPlacedSubtask[];
  unplaced: PlanUnplacedSubtask[];
}
