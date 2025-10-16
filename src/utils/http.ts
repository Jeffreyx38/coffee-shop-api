export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const created = (body: unknown) => json(201, body);
export const ok = (body: unknown) => json(200, body);
export const noContent = () => ({ statusCode: 204, body: '' });

export const badRequest = (message = 'Bad Request') =>
  json(400, { error: 'bad_request', message });

export const notFound = (message = 'Not Found') =>
  json(404, { error: 'not_found', message });

export const serverError = (message = 'Internal Server Error') =>
  json(500, { error: 'server_error', message });
