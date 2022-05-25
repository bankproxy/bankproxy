export class BadRequestError extends Error {
  public readonly statusCode = 400;
}
export class ConnectionClosedError extends Error {
  public readonly statusCode = 400;
}
export class HeadlessError extends Error {
  public readonly statusCode = 400;
}
export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
}
export class ForbiddenError extends Error {
  public readonly statusCode = 403;
}
export class NotFoundError extends Error {
  public readonly statusCode = 404;
}
export class NotImplementedError extends Error {
  public readonly statusCode = 501;
}
export class LoginError extends ForbiddenError {
  constructor(text: string) {
    super(`Login failed: ${text}`);
  }
}
export class MissingConfigurationError extends Error {
  constructor(name: string) {
    super(`Missing configuration: ${name}`);
  }
}

export class BerlinTppMessagesError extends BadRequestError {
  constructor(tppMessages: Array<object>) {
    super(`TppMessages: ${JSON.stringify(tppMessages)}`);
  }
}

class NameValueError extends Error {
  constructor(text: string, name: string, value?: string) {
    let message = `${text}: ${name}`;
    if (value) message += `=${value}`;
    super(message);
  }
}
export class UnsupportedTypeError extends NameValueError {
  constructor(name: string, value?: string) {
    super("Unsupported type", name, value);
  }
}
export class InvalidStateError extends NameValueError {
  constructor(name: string, value?: string) {
    super("Invalid state", name, value);
  }
}
