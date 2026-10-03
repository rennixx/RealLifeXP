import AsyncStorage from '@react-native-async-storage/async-storage';

import { trackEvent } from '@/src/lib/analytics';
import { AppError, AppErrorCode, toUserMessage } from '@/src/lib/errors';
import {
  logActivity,
  type ActivityLogResult,
  type LogActivityPayload,
} from '@/src/features/activity/activity-service';

export type PendingActivityCommand = {
  clientRequestId: string;
  templateId: string;
  occurredAt: string;
  durationMinutes?: number;
  note?: string;
  privateReflection?: string;
  queuedAt: string;
  attemptCount: number;
  nextRetryAt?: string;
  lastError?: string;
  isPermanentFailure?: boolean;
};

export type ActivitySubmitOutcome =
  | { type: 'confirmed'; result: ActivityLogResult }
  | { type: 'queued'; command: PendingActivityCommand };

export type QueueSyncResult = {
  synced: number;
  failed: number;
  remaining: number;
  skipped: number;
};

const OFFLINE_ACTIVITY_QUEUE_KEY = 'reallifexp:pending_activity_commands_v1';
const MAX_AUTO_RETRY_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 60_000;
const MILLISECONDS_IN_MINUTE = 60_000;

function sanitizeCommand(raw: Record<string, unknown>): PendingActivityCommand | null {
  const clientRequestId = typeof raw.clientRequestId === 'string' ? raw.clientRequestId : '';
  const templateId = typeof raw.templateId === 'string' ? raw.templateId : '';
  const occurredAt = typeof raw.occurredAt === 'string' ? raw.occurredAt : '';

  if (!clientRequestId || !templateId || !occurredAt) {
    return null;
  }

  const queuedAt = typeof raw.queuedAt === 'string' ? raw.queuedAt : new Date().toISOString();
  const attemptCount = typeof raw.attemptCount === 'number' && Number.isInteger(raw.attemptCount) && raw.attemptCount >= 0
    ? raw.attemptCount
    : 0;

  return {
    clientRequestId,
    templateId,
    occurredAt,
    durationMinutes: typeof raw.durationMinutes === 'number' && Number.isFinite(raw.durationMinutes)
      ? raw.durationMinutes
      : undefined,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    privateReflection: typeof raw.privateReflection === 'string' ? raw.privateReflection : undefined,
    queuedAt,
    attemptCount,
    nextRetryAt: typeof raw.nextRetryAt === 'string' ? raw.nextRetryAt : undefined,
    lastError: typeof raw.lastError === 'string' ? raw.lastError : undefined,
    isPermanentFailure: typeof raw.isPermanentFailure === 'boolean' ? raw.isPermanentFailure : undefined,
  };
}

function sortQueueByEnqueued(commands: PendingActivityCommand[]): PendingActivityCommand[] {
  return [...commands].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

function mapCommandToPayload(command: PendingActivityCommand): LogActivityPayload {
  return {
    templateId: command.templateId,
    clientRequestId: command.clientRequestId,
    occurredAt: command.occurredAt,
    durationMinutes: command.durationMinutes,
    note: command.note,
    privateReflection: command.privateReflection,
  };
}

function computeNextRetryDate(attemptCount: number): Date {
  const delayMs = BASE_RETRY_DELAY_MS * 2 ** attemptCount;
  return new Date(Date.now() + Math.min(delayMs, MAX_RETRY_DELAY_MS));
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return (
      error.code === AppErrorCode.NetworkError ||
      error.code === AppErrorCode.ServerError
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes('network') || lowered.includes('fetch') || lowered.includes('timeout');
}

function classifySyncError(error: unknown): 'successNoop' | 'retry' | 'permanent' {
  if (error instanceof AppError) {
    if (error.code === AppErrorCode.ConflictError) {
      return 'successNoop';
    }

    if (
      error.code === AppErrorCode.ValidationError ||
      error.code === AppErrorCode.AuthorizationError ||
      error.code === AppErrorCode.AuthError
    ) {
      return 'permanent';
    }

    if (isNetworkError(error)) {
      return 'retry';
    }

    return 'retry';
  }

  return isNetworkError(error) ? 'retry' : 'retry';
}

async function loadQueue(): Promise<PendingActivityCommand[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_ACTIVITY_QUEUE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortQueueByEnqueued(
      parsed
        .map((item) => (typeof item === 'object' && item !== null ? sanitizeCommand(item as Record<string, unknown>) : null))
        .filter((item): item is PendingActivityCommand => item !== null),
    );
  } catch {
    return [];
  }
}

async function saveQueue(commands: PendingActivityCommand[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_ACTIVITY_QUEUE_KEY, JSON.stringify(commands));
}

export async function fetchPendingActivityCommands(): Promise<PendingActivityCommand[]> {
  return loadQueue();
}

export async function queueActivityCommand(payload: LogActivityPayload): Promise<PendingActivityCommand> {
  const queue = await loadQueue();
  const existing = queue.find((command) => command.clientRequestId === payload.clientRequestId);
  if (existing) {
    return existing;
  }

  const command: PendingActivityCommand = {
    clientRequestId: payload.clientRequestId,
    templateId: payload.templateId,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    durationMinutes: payload.durationMinutes,
    note: payload.note,
    privateReflection: payload.privateReflection,
    queuedAt: new Date().toISOString(),
    attemptCount: 0,
  };

  const next = sortQueueByEnqueued([...queue, command]);
  await saveQueue(next);
  trackEvent('offline_activity_queued', {
    template_id: command.templateId,
    client_request_id: command.clientRequestId,
  });
  return command;
}

export async function discardPendingActivity(clientRequestId: string): Promise<void> {
  const queue = await loadQueue();
  const next = queue.filter((command) => command.clientRequestId !== clientRequestId);
  await saveQueue(next);
}

export async function submitActivityWithOfflineSupport(payload: LogActivityPayload): Promise<ActivitySubmitOutcome> {
  try {
    const result = await logActivity(payload);
    return {
      type: 'confirmed',
      result,
    };
  } catch (error) {
    if (isNetworkError(error)) {
      const command = await queueActivityCommand(payload);
      return {
        type: 'queued',
        command,
      };
    }

    throw error;
  }
}

export async function syncQueuedActivityCommands(options: {
  commandIds?: string[];
  force?: boolean;
} = {}): Promise<QueueSyncResult> {
  const queue = await loadQueue();
  if (!queue.length) {
    return { synced: 0, failed: 0, remaining: 0, skipped: 0 };
  }

  const now = new Date();
  const filteredIds = options.commandIds ? new Set(options.commandIds) : null;
  const shouldFilterByIds = filteredIds !== null && filteredIds.size > 0;
  const nextQueue: PendingActivityCommand[] = [];
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const command of queue) {
    if (shouldFilterByIds && !filteredIds.has(command.clientRequestId)) {
      nextQueue.push(command);
      continue;
    }

    const shouldDelay = command.nextRetryAt && new Date(command.nextRetryAt) > now;
    if (!options.force && command.isPermanentFailure) {
      nextQueue.push(command);
      continue;
    }

    if (!options.force && shouldDelay) {
      nextQueue.push(command);
      skipped++;
      continue;
    }

    try {
      await logActivity(mapCommandToPayload(command));
      synced++;
      trackEvent('offline_activity_synced', {
        template_id: command.templateId,
        client_request_id: command.clientRequestId,
      });
      continue;
    } catch (error) {
      const disposition = classifySyncError(error);
      if (disposition === 'successNoop') {
        synced++;
        trackEvent('offline_activity_synced', {
          template_id: command.templateId,
          client_request_id: command.clientRequestId,
        });
        continue;
      }

      const nextAttemptCount = command.attemptCount + 1;
      const shouldKeepRetrying = options.force || nextAttemptCount < MAX_AUTO_RETRY_ATTEMPTS;

      if (!shouldKeepRetrying || disposition === 'permanent') {
        nextQueue.push({
          ...command,
          attemptCount: nextAttemptCount,
          isPermanentFailure: true,
          lastError: toUserMessage(error),
          nextRetryAt: undefined,
        });
        failed++;
        continue;
      }

      nextQueue.push({
        ...command,
        attemptCount: nextAttemptCount,
        isPermanentFailure: false,
        lastError: toUserMessage(error),
        nextRetryAt: computeNextRetryDate(nextAttemptCount).toISOString(),
      });
      failed++;
    }
  }

  await saveQueue(nextQueue);
  return {
    synced,
    failed,
    remaining: nextQueue.length,
    skipped,
  };
}

export function commandIsDue(command: PendingActivityCommand, now = new Date()): boolean {
  if (command.isPermanentFailure) {
    return false;
  }
  if (!command.nextRetryAt) {
    return true;
  }
  return new Date(command.nextRetryAt) <= now;
}

export function computeRetryInMinutes(command: PendingActivityCommand): number | null {
  if (!command.nextRetryAt) {
    return null;
  }

  const retryAt = new Date(command.nextRetryAt).getTime();
  if (Number.isNaN(retryAt)) {
    return null;
  }

  const remainingMs = retryAt - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / MILLISECONDS_IN_MINUTE);
}
