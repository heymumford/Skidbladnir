import React, { useState, useEffect } from 'react';
import { Box, Typography, keyframes, styled } from '@mui/material';

interface LcarsDataIndicatorsProps {
  bytesIn: number;
  bytesOut: number;
  hasIncomingData?: boolean;
  hasOutgoingData?: boolean;
}

// Keyframes for blinking lights
const blinkGreen = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

const blinkRed = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

const IndicatorsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#000',
  padding: theme.spacing(0.5, 1),
  borderBottom: '1px solid #333',
}));

const DataIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing(2),
}));

const IndicatorLight = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'color'
})<{ active: boolean; color: 'red' | 'green' }>(({ active, color }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: color === 'red' ? '#ff2d2d' : '#2dff2d',
  marginRight: 6,
  boxShadow: active 
    ? color === 'red' 
      ? '0 0 6px 1px rgba(255, 45, 45, 0.7)' 
      : '0 0 6px 1px rgba(45, 255, 45, 0.7)' 
    : 'none',
  opacity: active ? 1 : 0.3,
  animation: active 
    ? color === 'red' 
      ? `${blinkRed} 0.8s infinite` 
      : `${blinkGreen} 0.8s infinite` 
    : 'none',
}));

const IndicatorLabel = styled(Typography)({
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#aaa',
  marginRight: 6,
});

const DataValue = styled(Typography)({
  fontSize: '12px',
  fontFamily: 'monospace',
  color: 'white',
});

export const LcarsDataIndicators: React.FC<LcarsDataIndicatorsProps> = ({
  bytesIn,
  bytesOut,
  hasIncomingData = false,
  hasOutgoingData = false,
}) => {
  // Format bytes to nearest KB, MB, etc.
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Round to 2 decimal places
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Simulate active TX/RX for the storybook
  const [rxActive, setRxActive] = useState(hasIncomingData);
  const [txActive, setTxActive] = useState(hasOutgoingData);

  // Random blink when there's no actual data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (!hasIncomingData && !hasOutgoingData) {
      interval = setInterval(() => {
        // Randomly decide whether to show activity
        const randomRx = Math.random() > 0.7;
        const randomTx = Math.random() > 0.8;
        
        setRxActive(randomRx);
        setTxActive(randomTx);
      }, 800);
    } else {
      setRxActive(hasIncomingData);
      setTxActive(hasOutgoingData);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasIncomingData, hasOutgoingData]);

  return (
    <IndicatorsContainer>
      <DataIndicator>
        <IndicatorLight active={rxActive} color="green" />
        <IndicatorLabel>RX:</IndicatorLabel>
        <DataValue>{formatBytes(bytesIn)}</DataValue>
      </DataIndicator>
      
      <DataIndicator>
        <IndicatorLight active={txActive} color="red" />
        <IndicatorLabel>TX:</IndicatorLabel>
        <DataValue>{formatBytes(bytesOut)}</DataValue>
      </DataIndicator>
    </IndicatorsContainer>
  );
};