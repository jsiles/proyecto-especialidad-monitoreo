/**
 * User Model
 * Entity representing a system user
 */

export interface User {
  id: string;
  username: string;
  password_hash: string;
  email: string | null;
  created_at: string;
  last_login: string | null;
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface UserRole {
  user_id: string;
  role_id: string;
}

// User without sensitive data
export interface SafeUser {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  last_login: string | null;
  roles: string[];
}

// Type for creating a new user
export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  roles?: string[];
}

// Type for updating a user
export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  roles?: string[];
}

export default User;
