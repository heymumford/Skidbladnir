/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Box, Typography, styled } from '@mui/material';
import { LcarsStatusLight } from './LcarsStatusLight';

type OperationState = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
type TransactionStatus = 'pending' | 'running' | 'completed' | 'failed';

interface LcarsStatusHeaderProps {
  operationName: string;
  operationState: OperationState;
  percentComplete?: number;
  estimatedTimeRemaining?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  lastTransactionName?: string;
  lastTransactionStatus?: TransactionStatus;
}

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  backgroundColor: '#000',
  color: '#f8db65', // LCARS gold/amber color
  fontFamily: '"Okuda", "Helvetica", "Arial", sans-serif',
  borderBottom: '1px solid #f8db65',
}));

const TopRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '4px 12px',
}));

const BottomRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '4px 12px',
  backgroundColor: '#0f0f1e', // Slightly lighter than black
}));

const ElbowSection = styled(Box)({
  width: '40px',
  height: '40px',
  borderTopLeftRadius: '20px',
  backgroundColor: '#f8db65',
  marginRight: '12px',
});

const StatusSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'state'
})<{ state: OperationState }>(({ theme, state }) => {
  // Define color mappings for better consistency
  let backgroundColor = 'green';
  
  switch (state) {
    case 'running':
      backgroundColor = 'green';
      break;
    case 'paused':
      backgroundColor = 'orange';
      break;
    case 'completed':
      backgroundColor = 'blue';
      break;
    case 'error':
      backgroundColor = 'red';
      break;
    case 'cancelled':
      backgroundColor = 'gray';
      break;
    default:
      backgroundColor = 'lightblue';
  }
  
  return {
    backgroundColor,
    color: 'white',
    padding: '4px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  };
});

const OperationName = styled(Typography)({
  color: 'white',
  fontWeight: 'bold',
  fontSize: '18px',
  marginRight: '24px',
});

const StardateDisplay = styled(Typography)({
  marginLeft: 'auto',
  fontStyle: 'italic',
});

const MetricsContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: '52px', // Aligns with content after elbow
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginRight: '24px',
});

const MetricLabel = styled(Typography)({
  fontSize: '12px',
  color: '#aaa',
  marginRight: '8px',
});

const MetricValue = styled(Typography)({
  fontSize: '14px',
  color: 'white',
});

const TransactionContainer = styled(Box)({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
});

const TransactionLabel = styled(Typography)({
  fontSize: '12px',
  color: '#aaa',
  marginRight: '8px',
});

const TransactionName = styled(Typography)({
  fontSize: '14px',
  color: 'white',
  marginRight: '8px',
});

const TransactionStatus = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status?: TransactionStatus }>(({ theme, status }) => {
  let backgroundColor = '#888';
  
  switch (status) {
    case 'running':
      backgroundColor = 'green';
      break;
    case 'completed':
      backgroundColor = 'blue';
      break;
    case 'failed':
      backgroundColor = 'red';
      break;
    default:
      backgroundColor = '#888';
  }
  
  return {
    backgroundColor,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  };
});

export const LcarsStatusHeader: React.FC<LcarsStatusHeaderProps> = ({
  operationName,
  operationState,
  percentComplete,
  estimatedTimeRemaining,
  startTime,
  endTime,
  lastTransactionName,
  lastTransactionStatus,
}) => {
  // Calculate stardate (a fun Star Trek inspired date format)
  const calculateStardate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const dayOfYear = Math.floor((now - new Date(year, 0, 0)) / (1000 * 60 * 60 * 24));
    
    // Format: [YEAR][DAY].[HOUR][MINUTE]
    const stardate = (year - 2000) * 1000 + dayOfYear + 
                     (now.getHours() / 24 + now.getMinutes() / (24 * 60)).toFixed(2).substring(1);
    
    return stardate;
  };
  
  // Format the estimated time remaining in MM:SS format
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <HeaderContainer>
      <TopRow>
        <ElbowSection />
        <Box sx={{ display: 'flex', alignItems: 'center', marginRight: '12px' }}>
          <LcarsStatusLight 
            state={operationState} 
            size="medium" 
            data-testid="status-light"
          />
        </Box>
        <StatusSection state={operationState} data-testid="operation-state">
          {operationState.toUpperCase()}
        </StatusSection>
        <OperationName variant="h6">
          {operationName}
        </OperationName>
        <StardateDisplay variant="body2">
          STARDATE {calculateStardate()}
        </StardateDisplay>
      </TopRow>
      <BottomRow>
        <MetricsContainer>
          {percentComplete !== undefined && (
            <MetricItem>
              <MetricLabel>COMPLETION:</MetricLabel>
              <MetricValue>{percentComplete}%</MetricValue>
            </MetricItem>
          )}
          {estimatedTimeRemaining !== undefined && (
            <MetricItem>
              <MetricLabel>ETA:</MetricLabel>
              <MetricValue>{formatTimeRemaining(estimatedTimeRemaining)}</MetricValue>
            </MetricItem>
          )}
          {startTime && (
            <MetricItem>
              <MetricLabel>STARTED:</MetricLabel>
              <MetricValue>{startTime.toLocaleTimeString()}</MetricValue>
            </MetricItem>
          )}
        </MetricsContainer>
        
        {lastTransactionName && (
          <TransactionContainer>
            <TransactionLabel>LAST ACTION:</TransactionLabel>
            {lastTransactionStatus && (
              <Box sx={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                <LcarsStatusLight 
                  state={lastTransactionStatus === 'running' ? 'running' : 
                         lastTransactionStatus === 'completed' ? 'completed' :
                         lastTransactionStatus === 'failed' ? 'error' : 'pending'}
                  size="small" 
                  data-testid="transaction-status-light"
                />
              </Box>
            )}
            <TransactionName>{lastTransactionName}</TransactionName>
            {lastTransactionStatus && (
              <TransactionStatus status={lastTransactionStatus}>
                {lastTransactionStatus.toUpperCase()}
              </TransactionStatus>
            )}
          </TransactionContainer>
        )}
      </BottomRow>
    </HeaderContainer>
  );
};