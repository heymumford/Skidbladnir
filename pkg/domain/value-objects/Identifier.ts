/**
 * Identifier value object for domain entities
 * 
 * This is a simple implementation of a value object in the domain model.
 * Value objects are immutable and are compared by their values, not their identity.
 */

export class Identifier {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
    // Make the object immutable
    Object.freeze(this);
  }

  /**
   * Creates a new identifier with the given value
   * @param value The string value for the identifier
   * @returns A new Identifier instance
   * @throws Error if the value is invalid
   */
  public static create(value: string): Identifier {
    if (!value) {
      throw new Error('Identifier value cannot be empty');
    }
    
    if (typeof value !== 'string') {
      throw new Error('Identifier value must be a string');
    }
    
    if (value.trim().length === 0) {
      throw new Error('Identifier value cannot be empty');
    }
    
    return new Identifier(value);
  }

  /**
   * Creates a new random identifier using UUID v4
   * @returns A new Identifier instance with a random UUID value
   */
  public static createRandom(): Identifier {
    const uuid = crypto.randomUUID ? 
      crypto.randomUUID() : 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    
    return new Identifier(uuid);
  }

  /**
   * Gets the string value of the identifier
   * @returns The string value of the identifier
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Checks if this identifier is equal to another identifier
   * @param other The other identifier to compare with
   * @returns True if both identifiers have the same value, false otherwise
   */
  public equals(other: Identifier): boolean {
    if (!(other instanceof Identifier)) {
      return false;
    }
    
    return this.value === other.value;
  }

  /**
   * Returns the string representation of the identifier
   * @returns The string value of the identifier
   */
  public toString(): string {
    return this.value;
  }
}