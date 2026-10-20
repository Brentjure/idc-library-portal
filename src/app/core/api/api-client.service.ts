import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

export const API_BASE = '/idc-library/api/v1';

/** Every backend response is wrapped like this. */
interface ApiEnvelope<T> {
  success: boolean;
  responseCode: string;
  message: string;
  timestamp: string;
  data: T;
}

/**
 * A failed call, with a message you can show to staff.
 * `fieldErrors` holds per-field messages, e.g. {"books[2].author": "Author is required for a new title"}.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** The message to show for any error caught around an API call. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * The only class that talks HTTP. It unwraps the envelope and turns every failure into an ApiError,
 * so the *.api.ts services stay one-liners.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.send(this.http.get<ApiEnvelope<T>>(API_BASE + path, { params: toHttpParams(params) }));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.post<ApiEnvelope<T>>(API_BASE + path, body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.patch<ApiEnvelope<T>>(API_BASE + path, body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.put<ApiEnvelope<T>>(API_BASE + path, body));
  }

  /** A file from the server (e.g. a CSV report), as a Blob to save. */
  async download(path: string, params?: QueryParams): Promise<Blob> {
    try {
      return await firstValueFrom(this.http.get(API_BASE + path, { params: toHttpParams(params), responseType: 'blob' }));
    } catch (err) {
      throw toApiError(err);
    }
  }

  delete<T>(path: string): Promise<T> {
    return this.send(this.http.delete<ApiEnvelope<T>>(API_BASE + path));
  }

  private async send<T>(request: Observable<ApiEnvelope<T>>): Promise<T> {
    let envelope: ApiEnvelope<T>;
    try {
      envelope = await firstValueFrom(request);
    } catch (err) {
      throw toApiError(err);
    }
    if (!envelope.success) {
      throw new ApiError(envelope.message, 200);
    }
    return envelope.data;
  }
}

function toApiError(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) {
    return new ApiError('Something went wrong. Please try again.', -1);
  }
  if (err.status === 0) {
    return new ApiError("Can't reach the library server. Check the connection and try again.", 0);
  }
  const body = err.error as Partial<ApiEnvelope<unknown>> | null;
  const fieldErrors =
    body?.responseCode === '02' && body.data && typeof body.data === 'object'
      ? (body.data as Record<string, string>)
      : {};
  return new ApiError(body?.message || 'Something went wrong. Please try again.', err.status, fieldErrors);
}

function toHttpParams(params?: QueryParams): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      result = result.set(key, String(value));
    }
  }
  return result;
}
