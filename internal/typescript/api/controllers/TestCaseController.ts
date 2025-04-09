import express from 'express';
import { TestCaseRepository } from '../../../../pkg/domain/repositories/TestCaseRepository';
import { TestCaseControllerImpl } from '../../../../pkg/interfaces/api/TestCaseController';
import { ValidationError, EntityNotFoundError } from '../../../../pkg/domain/errors/DomainErrors';

/**
 * Express controller for test case management
 */
export class ExpressTestCaseController {
  private readonly controller: TestCaseControllerImpl;
  
  constructor(testCaseRepository: TestCaseRepository, baseUrl: string) {
    this.controller = new TestCaseControllerImpl(testCaseRepository, baseUrl);
  }
  
  /**
   * Get a test case by ID
   */
  getTestCase = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const id = req.params.id;
      const testCase = await this.controller.getTestCase(id);
      res.json(testCase);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get all test cases with filtering
   */
  getAllTestCases = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const filters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        priority: req.query.priority ? (req.query.priority as string).split(',') : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20
      };
      
      const testCases = await this.controller.getAllTestCases(filters);
      res.json(testCases);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Create a new test case
   */
  createTestCase = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const testCase = await this.controller.createTestCase(req.body);
      res.status(201).json(testCase);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update an existing test case
   */
  updateTestCase = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const id = req.params.id;
      const testCase = await this.controller.updateTestCase(id, req.body);
      res.json(testCase);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete a test case
   */
  deleteTestCase = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const id = req.params.id;
      await this.controller.deleteTestCase(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get test case steps
   */
  getTestCaseSteps = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const id = req.params.id;
      const steps = await this.controller.getTestCaseSteps(id);
      res.json(steps);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Error handler middleware
   */
  errorHandler = (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
        details: error.validationErrors
      });
    }
    
    if (error instanceof EntityNotFoundError) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  };
  
  /**
   * Register routes on an Express router
   */
  registerRoutes(router: express.Router): void {
    router.get('/test-cases', this.getAllTestCases);
    router.post('/test-cases', this.createTestCase);
    router.get('/test-cases/:id', this.getTestCase);
    router.put('/test-cases/:id', this.updateTestCase);
    router.delete('/test-cases/:id', this.deleteTestCase);
    router.get('/test-cases/:id/steps', this.getTestCaseSteps);
    
    // Register error handler
    router.use(this.errorHandler);
  }
}
