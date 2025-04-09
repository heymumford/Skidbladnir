import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestCaseRepositoryImpl } from '../../internal/typescript/api/repositories/TestCaseRepository';
import { ValidatedTestCaseRepository } from '../../internal/typescript/api/repositories/ValidatedTestCaseRepository';
import { ExpressTestCaseController } from '../../internal/typescript/api/controllers/TestCaseController';

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    requestId: uuidv4()
  });
});

// Set up test case repository and controller
const testCaseRepository = new TestCaseRepositoryImpl();
// Add sample data for development
if (process.env.NODE_ENV === 'development') {
  testCaseRepository.populateSampleData();
}

// Wrap with validated repository to enforce domain rules
const validatedRepository = new ValidatedTestCaseRepository(testCaseRepository);

// Set up test case controller
const testCaseController = new ExpressTestCaseController(
  validatedRepository, 
  '/api'
);

// Create API router
const apiRouter = express.Router();
testCaseController.registerRoutes(apiRouter);

// Mount API router
app.use('/api', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

// Export app for testing
export default app;
