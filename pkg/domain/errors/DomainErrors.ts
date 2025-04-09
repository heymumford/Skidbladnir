/**
 * Base class for all domain errors
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
  }
}

export class ValidationError extends DomainError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.validationErrors = validationErrors;
  }
}

export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication failed') {
    super(message);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message);
  }
}

export class DuplicateEntityError extends DomainError {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier ${identifier} already exists`);
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class ExternalServiceError extends DomainError {
  constructor(serviceName: string, message: string) {
    super(`Error in external service ${serviceName}: ${message}`);
  }
}
