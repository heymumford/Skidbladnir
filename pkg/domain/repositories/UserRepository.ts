import { User } from '../entities/User';

/**
 * Repository interface for User entity operations
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User | null>;
}
