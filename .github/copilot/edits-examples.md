# GitHub Copilot Edits Examples

This document provides concrete examples of using GitHub Copilot Edits for refactoring tasks in the Skidbladnir project.

## Setup

To use Copilot Edits (Agent Mode) for refactoring:

1. Install GitHub Copilot and GitHub Copilot Chat in your IDE
2. Access Copilot Chat from your IDE
3. Use one of the templates below with your code

## Example 1: Clean Architecture Refactoring

### Example Code Needing Refactoring

```typescript
// src/service/userService.ts
import { Database } from '../database/Database';

export class UserService {
  private db: Database;
  
  constructor() {
    this.db = new Database('users');
  }
  
  async getUser(id: string) {
    const user = await this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
    return user[0];
  }
  
  async createUser(name: string, email: string) {
    const userId = Math.random().toString(36).substring(7);
    await this.db.query(`INSERT INTO users (id, name, email) VALUES ('${userId}', '${name}', '${email}')`);
    return userId;
  }
}
```

### Copilot Edits Prompt

```
/refactor cleanArchitecture

Analyze this code and refactor it to better adhere to Clean Architecture principles:

```typescript
// src/service/userService.ts
import { Database } from '../database/Database';

export class UserService {
  private db: Database;
  
  constructor() {
    this.db = new Database('users');
  }
  
  async getUser(id: string) {
    const user = await this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
    return user[0];
  }
  
  async createUser(name: string, email: string) {
    const userId = Math.random().toString(36).substring(7);
    await this.db.query(`INSERT INTO users (id, name, email) VALUES ('${userId}', '${name}', '${email}')`);
    return userId;
  }
}
```

Focus on:
1. Ensuring proper dependency direction
2. Extracting interfaces for implementations
3. Moving domain logic to domain layer
4. Replacing infrastructure dependencies with abstractions
5. Applying dependency injection

Keep all existing functionality intact and ensure tests continue to pass.
```

### Expected Refactored Result

```typescript
// domain/entities/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// domain/repositories/UserRepository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(name: string, email: string): Promise<string>;
}

// domain/services/UserService.ts
import { User } from '../entities/User';
import { UserRepository } from '../repositories/UserRepository';

export class UserService {
  constructor(private userRepository: UserRepository) {}
  
  async getUser(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
  
  async createUser(name: string, email: string): Promise<string> {
    return this.userRepository.create(name, email);
  }
}

// infrastructure/repositories/SqlUserRepository.ts
import { Database } from '../database/Database';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/repositories/UserRepository';

export class SqlUserRepository implements UserRepository {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async findById(id: string): Promise<User | null> {
    const users = await this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
    return users[0] || null;
  }
  
  async create(name: string, email: string): Promise<string> {
    const userId = Math.random().toString(36).substring(7);
    await this.db.query(`INSERT INTO users (id, name, email) VALUES ('${userId}', '${name}', '${email}')`);
    return userId;
  }
}
```

## Example 2: Extract Method Refactoring

### Example Code Needing Refactoring

```python
def process_data(data, options):
    # Validate input
    if not isinstance(data, list):
        raise ValueError("Data must be a list")
    if not data:
        return []
    
    # Filter data based on options
    results = []
    for item in data:
        if "include_deleted" not in options and item.get("deleted"):
            continue
        if "min_value" in options and item.get("value", 0) < options["min_value"]:
            continue
        if "max_value" in options and item.get("value", 0) > options["max_value"]:
            continue
        results.append(item)
    
    # Sort results
    if "sort_by" in options:
        sort_key = options["sort_by"]
        reverse = options.get("sort_reverse", False)
        results.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)
    
    # Apply transformations
    for i, item in enumerate(results):
        if "format" in options and options["format"] == "uppercase":
            for key in item:
                if isinstance(item[key], str):
                    item[key] = item[key].upper()
        if "calculate_total" in options and options["calculate_total"]:
            if "price" in item and "quantity" in item:
                item["total"] = item["price"] * item["quantity"]
        results[i] = item
    
    return results
```

### Copilot Edits Prompt

```
/refactor extractMethod

Analyze this method and extract cohesive code blocks into separate methods:

```python
def process_data(data, options):
    # Validate input
    if not isinstance(data, list):
        raise ValueError("Data must be a list")
    if not data:
        return []
    
    # Filter data based on options
    results = []
    for item in data:
        if "include_deleted" not in options and item.get("deleted"):
            continue
        if "min_value" in options and item.get("value", 0) < options["min_value"]:
            continue
        if "max_value" in options and item.get("value", 0) > options["max_value"]:
            continue
        results.append(item)
    
    # Sort results
    if "sort_by" in options:
        sort_key = options["sort_by"]
        reverse = options.get("sort_reverse", False)
        results.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)
    
    # Apply transformations
    for i, item in enumerate(results):
        if "format" in options and options["format"] == "uppercase":
            for key in item:
                if isinstance(item[key], str):
                    item[key] = item[key].upper()
        if "calculate_total" in options and options["calculate_total"]:
            if "price" in item and "quantity" in item:
                item["total"] = item["price"] * item["quantity"]
        results[i] = item
    
    return results
```

Focus on:
1. Identifying code blocks that perform a single logical operation
2. Creating meaningful method names that describe what they do
3. Passing only necessary parameters
4. Returning only required values
5. Maintaining the original method's functionality and signature
```

## Example 3: Extract Interface

### Example Code Needing Refactoring

```typescript
// src/services/RateLimiter.ts
export class RateLimiter {
  private limits: Map<string, number> = new Map();
  private usage: Map<string, number> = new Map();
  private timestamps: Map<string, number> = new Map();
  
  constructor(private defaultLimit: number = 100, 
              private windowSizeMs: number = 60000) {}
  
  public setLimit(key: string, limit: number): void {
    this.limits.set(key, limit);
  }
  
  public getLimit(key: string): number {
    return this.limits.get(key) || this.defaultLimit;
  }
  
  public isRateLimited(key: string): boolean {
    const now = Date.now();
    const lastTimestamp = this.timestamps.get(key) || 0;
    
    if (now - lastTimestamp > this.windowSizeMs) {
      this.usage.set(key, 0);
      this.timestamps.set(key, now);
      return false;
    }
    
    const currentUsage = this.usage.get(key) || 0;
    const limit = this.getLimit(key);
    
    return currentUsage >= limit;
  }
  
  public incrementUsage(key: string): number {
    const currentUsage = this.usage.get(key) || 0;
    const newUsage = currentUsage + 1;
    this.usage.set(key, newUsage);
    return newUsage;
  }
  
  public getRemainingAllowance(key: string): number {
    const limit = this.getLimit(key);
    const currentUsage = this.usage.get(key) || 0;
    return Math.max(0, limit - currentUsage);
  }
  
  public resetUsage(key: string): void {
    this.usage.set(key, 0);
    this.timestamps.set(key, Date.now());
  }
}
```

### Copilot Edits Prompt

```
/refactor extractInterface

Extract an interface from this class implementation:

```typescript
// src/services/RateLimiter.ts
export class RateLimiter {
  private limits: Map<string, number> = new Map();
  private usage: Map<string, number> = new Map();
  private timestamps: Map<string, number> = new Map();
  
  constructor(private defaultLimit: number = 100, 
              private windowSizeMs: number = 60000) {}
  
  public setLimit(key: string, limit: number): void {
    this.limits.set(key, limit);
  }
  
  public getLimit(key: string): number {
    return this.limits.get(key) || this.defaultLimit;
  }
  
  public isRateLimited(key: string): boolean {
    const now = Date.now();
    const lastTimestamp = this.timestamps.get(key) || 0;
    
    if (now - lastTimestamp > this.windowSizeMs) {
      this.usage.set(key, 0);
      this.timestamps.set(key, now);
      return false;
    }
    
    const currentUsage = this.usage.get(key) || 0;
    const limit = this.getLimit(key);
    
    return currentUsage >= limit;
  }
  
  public incrementUsage(key: string): number {
    const currentUsage = this.usage.get(key) || 0;
    const newUsage = currentUsage + 1;
    this.usage.set(key, newUsage);
    return newUsage;
  }
  
  public getRemainingAllowance(key: string): number {
    const limit = this.getLimit(key);
    const currentUsage = this.usage.get(key) || 0;
    return Math.max(0, limit - currentUsage);
  }
  
  public resetUsage(key: string): void {
    this.usage.set(key, 0);
    this.timestamps.set(key, Date.now());
  }
}
```

Create a properly named interface that captures all public methods. Format the interface following our project conventions and place it where it belongs according to Clean Architecture principles.
```

## Example 4: Test-First Refactoring

See the detailed example in the `copilot-agent-refactoring.md` document in the `docs/development-guide` directory.

## Example 5: Batch Refactoring

See the detailed example in the `copilot-agent-refactoring.md` document in the `docs/development-guide` directory.

## Next Steps with Copilot Edits

1. Start with smaller, focused refactoring tasks
2. Use the test-first approach for critical components
3. Document your refactoring decisions in commit messages
4. Share successful refactoring patterns with the team
5. Provide feedback on these templates to improve them

For more advanced usage, see the full documentation in `docs/development-guide/copilot-agent-refactoring.md`.