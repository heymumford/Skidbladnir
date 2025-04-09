import { User } from '../entities/User';

/**
 * Domain service interface for authentication operations
 */
export interface AuthService {
  authenticate(username: string, password: string): Promise<AuthResult>;
  validateToken(token: string): Promise<User | null>;
  refreshToken(refreshToken: string): Promise<AuthResult | null>;
  revokeToken(token: string): Promise<boolean>;
  generatePasswordResetToken(email: string): Promise<string | null>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
