/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Container, Typography, Box, Paper, Breadcrumbs, Link } from '@mui/material';
import { ZephyrQTestMigrationDemo } from '../components/Transformation/ZephyrQTestMigrationDemo';

/**
 * Demonstration page for Zephyr to qTest migration workflow
 */
export const ZephyrQTestMigrationDemoPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">
            Home
          </Link>
          <Link color="inherit" href="/migration">
            Migration
          </Link>
          <Typography color="text.primary">Zephyr to qTest Demo</Typography>
        </Breadcrumbs>
      </Box>
      
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom>
          Zephyr Scale to qTest Migration Demo
        </Typography>
        
        <Typography variant="body1" paragraph>
          This is a demonstration of the Zephyr Scale to qTest migration workflow. 
          The demo shows the complete process of connecting to both systems, 
          retrieving test cases from Zephyr Scale, transforming them to the qTest format, 
          and creating them in qTest including all attachments.
        </Typography>
        
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Note: This is a simulated demo using representative data structures. 
          In a real environment, you would need to provide valid API credentials for both systems.
        </Typography>
      </Paper>
      
      <ZephyrQTestMigrationDemo />
    </Container>
  );
};

export default ZephyrQTestMigrationDemoPage;