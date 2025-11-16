import type { MessageType } from '../constants/message-types.js';

export function buildResponse(type: MessageType | string, data: unknown): string {
  return JSON.stringify({
    type,
    data: JSON.stringify(data),
    id: 0,
  });
}

export function buildErrorResponse(type: MessageType | string, errorText: string): string {
  return JSON.stringify({
    type,
    data: JSON.stringify({
      error: true,
      errorText,
    }),
    id: 0,
  });
}

export function buildRegistrationResponse(
  name: string,
  index: number | string,
  error = false,
  errorText = ''
): string {
  return buildResponse('reg', {
    name,
    index,
    error,
    errorText,
  });
}
