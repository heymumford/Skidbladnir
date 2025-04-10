/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Router } from 'express';
import { OperationDependencyController } from '../controllers/OperationDependencyController';
import { ProviderRegistry } from '../../../../packages/common/src/interfaces/provider';
import { LoggerService } from '../../../../pkg/domain/services/LoggerService';

/**
 * Creates routes for the Operation Dependency API
 */
export function createOperationDependencyRoutes(
  providerRegistry: ProviderRegistry,
  logger?: LoggerService
): Router {
  const router = Router();
  const controller = new OperationDependencyController(providerRegistry, logger);
  
  /**
   * @api {get} /api/operations Get all available operations
   * @apiName GetOperations
   * @apiGroup Operations
   * @apiDescription Get a list of all available operations from providers
   * @apiSuccess {Object[]} operations List of operations
   * @apiSuccess {Number} count Total count of operations
   */
  router.get('/', (req, res) => controller.getOperations(req, res));
  
  /**
   * @api {get} /api/operations/dependency-graph Get dependency graph
   * @apiName GetDependencyGraph
   * @apiGroup Operations
   * @apiDescription Get the dependency graph for all operations
   * @apiSuccess {Object} graph Dependency graph information
   * @apiSuccess {String[]} executionOrder Topologically sorted execution order
   */
  router.get('/dependency-graph', (req, res) => controller.getDependencyGraph(req, res));
  
  /**
   * @api {post} /api/operations/validate Validate operations
   * @apiName ValidateOperations
   * @apiGroup Operations
   * @apiDescription Validate a set of operations for dependency issues
   * @apiParam {Object[]} operations Array of operations to validate
   * @apiSuccess {Boolean} valid Whether the operations are valid
   * @apiSuccess {Object[]} errors Array of validation errors (if any)
   */
  router.post('/validate', (req, res) => controller.validateOperations(req, res));
  
  /**
   * @api {post} /api/operations/visualize Generate dependency visualization
   * @apiName VisualizeDependencyGraph
   * @apiGroup Operations
   * @apiDescription Generate a visualization of the dependency graph
   * @apiParam {String} sourceSystem Source provider ID
   * @apiParam {String} targetSystem Target provider ID
   * @apiParam {String} [format=html] Visualization format (html, mermaid, or dot)
   * @apiSuccess {String} visualization Visualization in the requested format
   */
  router.post('/visualize', (req, res) => controller.visualizeDependencyGraph(req, res));
  
  /**
   * @api {post} /api/operations/minimal-set Calculate minimal operation set
   * @apiName CalculateMinimalOperationSet
   * @apiGroup Operations
   * @apiDescription Calculate minimal set of operations needed for a specific goal
   * @apiParam {String} sourceSystem Source provider ID
   * @apiParam {String} targetSystem Target provider ID
   * @apiParam {String} goalOperation Target operation to achieve
   * @apiSuccess {String} goalOperation The goal operation
   * @apiSuccess {String[]} operations Minimal set of operations needed
   * @apiSuccess {Number} count Count of operations
   */
  router.post('/minimal-set', (req, res) => controller.calculateMinimalOperationSet(req, res));
  
  return router;
}