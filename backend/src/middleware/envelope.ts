import { Response } from 'express';

export interface SuccessEnvelope<T> {
  status: 'success';
  data: T;
  error: null;
}

export interface ErrorEnvelope {
  status: 'error';
  data: null;
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessEnvelope<T> = {
    status: 'success',
    data,
    error: null,
  };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  field?: string
): void {
  const body: ErrorEnvelope = {
    status: 'error',
    data: null,
    error: field ? { code, message, field } : { code, message },
  };
  res.status(statusCode).json(body);
}
