import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ExpressTestCaseController } from '../../internal/typescript/api/controllers/TestCaseController';
import { TestCaseRepositoryImpl } from '../../internal/typescript/api/repositories/TestCaseRepository';

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Create API router
const apiRouter = express.Router();

// Initialize repositories
const testCaseRepository = new TestCaseRepositoryImpl();

// Initialize controllers
const testCaseController = new ExpressTestCaseController(testCaseRepository, `${baseUrl}/api`);

// Register routes
testCaseController.registerRoutes(apiRouter);

// Mount API router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
  console.log(`API base URL: ${baseUrl}`);
});

export default app;