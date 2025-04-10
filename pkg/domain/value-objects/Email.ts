/**
 * Email value object
 * 
 * This represents a valid email address in the domain.
 * As a value object, it is immutable and validated on creation.
 */

export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
    // Make the object immutable
    Object.freeze(this);
  }

  /**
   * Creates a new Email value object
   * @param value The email address
   * @returns A new Email instance
   * @throws Error if the email is invalid
   */
  public static create(value: string): Email {
    if (!value) {
      throw new Error('Email cannot be empty');
    }
    
    if (typeof value !== 'string') {
      throw new Error('Email must be a string');
    }
    
    value = value.trim().toLowerCase();
    
    if (!Email.isValid(value)) {
      throw new Error('Invalid email format');
    }
    
    return new Email(value);
  }

  /**
   * Validates an email address
   * @param email The email to validate
   * @returns True if the email is valid, false otherwise
   */
  public static isValid(email: string): boolean {
    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gets the email address
   * @returns The email address
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Gets the domain part of the email
   * @returns The domain part of the email
   */
  public getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Gets the local part of the email (before the @)
   * @returns The local part of the email
   */
  public getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Checks if this email is equal to another email
   * @param other The other email to compare with
   * @returns True if both emails have the same value, false otherwise
   */
  public equals(other: Email): boolean {
    if (!(other instanceof Email)) {
      return false;
    }
    
    return this.value === other.value;
  }

  /**
   * Returns the string representation of the email
   * @returns The email address
   */
  public toString(): string {
    return this.value;
  }
}