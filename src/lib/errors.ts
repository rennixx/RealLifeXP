export enum AppErrorCode {
  AuthError = 'AuthError',
  ValidationError = 'ValidationError',
  AuthorizationError = 'AuthorizationError',
  ConflictError = 'ConflictError',
  NetworkError = 'NetworkError',
  ServerError = 'ServerError',
  UnknownError = 'UnknownError',
}

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: Record<string, string | number | boolean>
  ) {
    super(message);
    this.name = code;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case AppErrorCode.AuthError:
        return 'Authentication is required to continue.';
      case AppErrorCode.AuthorizationError:
        return 'You do not have permission for this action.';
      case AppErrorCode.ValidationError:
        return 'Please review your input and try again.';
      case AppErrorCode.ConflictError:
        return 'This action was already completed. Try refreshing.';
      case AppErrorCode.NetworkError:
        return 'Network issue. Check your connection and retry.';
      case AppErrorCode.ServerError:
        return 'The server could not process this request.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}