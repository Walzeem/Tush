export interface FieldIssue {
  field: string;
  message: string;
}

// Errors that map directly to the API's response envelope:
//   { success: false, error: { code, message, details? }, correlation_id }
export class AppError extends Error {
  status: number;
  code: string;
  details?: FieldIssue[];

  constructor(status: number, code: string, message: string, details?: FieldIssue[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (details: FieldIssue[]): AppError =>
  new AppError(422, 'VALIDATION_FAILED', 'Invalid request body', details);

export const unauthenticated = (message: string): AppError => new AppError(401, 'UNAUTHENTICATED', message);
export const notFound = (message: string): AppError => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string): AppError => new AppError(409, 'CONFLICT', message);

