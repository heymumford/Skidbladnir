import express from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// Start server
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

// Export app for testing
export default app;
