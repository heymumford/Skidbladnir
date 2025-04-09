import { TestCase } from '../../domain/entities/TestCase';
import { EntityNotFoundError } from '../../domain/errors/DomainErrors';

/**
 * Input data for migrating test cases from one system to another
 */
export interface MigrateTestCasesInput {
  sourceSystem: string;
  targetSystem: string;
  projectKey: string;
  options: {
    includeAttachments: boolean;
    includeHistory: boolean;
    preserveIds: boolean;
    dryRun: boolean;
  };
}

/**
 * Result of the migration operation
 */
export interface MigrateTestCasesResult {
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  details: {
    migrated: TestCaseMigrationDetail[];
    skipped: TestCaseMigrationDetail[];
    failed: TestCaseMigrationDetail[];
  };
  dryRun: boolean;
}

export interface TestCaseMigrationDetail {
  sourceId: string;
  targetId?: string;
  name: string;
  status: 'MIGRATED' | 'SKIPPED' | 'FAILED';
  error?: string;
}

/**
 * Use case for migrating test cases between different test management systems
 */
export class MigrateTestCasesUseCase {
  constructor(
    private readonly sourceProviderFactory: ProviderFactory,
    private readonly targetProviderFactory: ProviderFactory
  ) {}

  async execute(input: MigrateTestCasesInput): Promise<MigrateTestCasesResult> {
    // Create provider instances for source and target systems
    const sourceProvider = this.sourceProviderFactory.createProvider(input.sourceSystem);
    const targetProvider = this.targetProviderFactory.createProvider(input.targetSystem);
    
    if (!sourceProvider) {
      throw new EntityNotFoundError('Provider', input.sourceSystem);
    }
    
    if (!targetProvider) {
      throw new EntityNotFoundError('Provider', input.targetSystem);
    }

    // Fetch test cases from source system
    const sourceTestCases = await sourceProvider.getTestCases(input.projectKey);
    
    // Initialize result
    const result: MigrateTestCasesResult = {
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      details: {
        migrated: [],
        skipped: [],
        failed: []
      },
      dryRun: input.options.dryRun
    };

    // If this is a dry run, just return counts
    if (input.options.dryRun) {
      // Simulate results for dry run
      result.migratedCount = sourceTestCases.length;
      result.details.migrated = sourceTestCases.map(tc => ({
        sourceId: tc.id,
        targetId: input.options.preserveIds ? tc.id : `new-${tc.id}`,
        name: tc.title,
        status: 'MIGRATED'
      }));
      return result;
    }

    // Process each test case
    for (const testCase of sourceTestCases) {
      try {
        // Create test case in target system
        const createdTestCase = await targetProvider.createTestCase(input.projectKey, testCase);
        
        // Process attachments if needed
        if (input.options.includeAttachments) {
          const attachments = await sourceProvider.getTestCaseAttachments(testCase.id);
          for (const attachment of attachments) {
            await targetProvider.addTestCaseAttachment(createdTestCase.id, attachment);
          }
        }
        
        // Process history if needed
        if (input.options.includeHistory) {
          const history = await sourceProvider.getTestCaseHistory(testCase.id);
          await targetProvider.addTestCaseHistory(createdTestCase.id, history);
        }
        
        // Update migration results
        result.migratedCount++;
        result.details.migrated.push({
          sourceId: testCase.id,
          targetId: createdTestCase.id,
          name: testCase.title,
          status: 'MIGRATED'
        });
      } catch (error) {
        // Handle failed migrations
        result.failedCount++;
        result.details.failed.push({
          sourceId: testCase.id,
          name: testCase.title,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }
}

/**
 * Interface for provider factories
 */
interface ProviderFactory {
  createProvider(providerType: string): TestManagementProvider | null;
}

/**
 * Interface for test management system providers
 */
interface TestManagementProvider {
  getTestCases(projectKey: string): Promise<TestCase[]>;
  createTestCase(projectKey: string, testCase: TestCase): Promise<TestCase>;
  getTestCaseAttachments(testCaseId: string): Promise<Attachment[]>;
  addTestCaseAttachment(testCaseId: string, attachment: Attachment): Promise<void>;
  getTestCaseHistory(testCaseId: string): Promise<History[]>;
  addTestCaseHistory(testCaseId: string, history: History[]): Promise<void>;
}

/**
 * Attachment interface for test case attachments
 */
interface Attachment {
  id: string;
  name: string;
  contentType: string;
  content: Buffer;
  size: number;
}

/**
 * History interface for test case history
 */
interface History {
  id: string;
  date: Date;
  author: string;
  field: string;
  oldValue: string;
  newValue: string;
}
