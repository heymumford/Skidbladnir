/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MigrationError, DomainError } from '../../../../pkg/domain/errors/DomainErrors';

describe('MigrationError', () => {
  it('should be an instance of DomainError', () => {
    const error = new MigrationError('Migration failed');
    expect(error).toBeInstanceOf(DomainError);
  });

  it('should set the error message', () => {
    const message = 'Test migration error message';
    const error = new MigrationError(message);
    expect(error.message).toBe(message);
  });

  it('should set the name property to the class name', () => {
    const error = new MigrationError('Migration failed');
    expect(error.name).toBe('MigrationError');
  });

  it('should maintain the error prototype chain', () => {
    const error = new MigrationError('Migration failed');
    expect(error instanceof Error).toBeTruthy();
    expect(error instanceof DomainError).toBeTruthy();
    expect(error instanceof MigrationError).toBeTruthy();
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new MigrationError('Migration failed');
    }).toThrow(MigrationError);
  });
});