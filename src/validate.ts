/**
 * Request validation. Ids are short, plain strings; anything else is a malformed
 * request (HTTP 400), which is different from a domain refusal (HTTP 200).
 */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function missingOrInvalid(body: unknown, fields: string[]): string[] {
  const source = (body ?? {}) as Record<string, unknown>;
  return fields.filter((field) => !isValidId(source[field]));
}
