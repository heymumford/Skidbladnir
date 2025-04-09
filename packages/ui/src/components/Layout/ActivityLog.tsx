/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText,
  Collapse,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  styled
} from '@mui/material';
import { 
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { LogEntry, LogLevel } from '../../types';

// Mock log context hook until we implement it
const useLogContext = () => {
  return {
    logs: [
      {
        id: '1',
        timestamp: '2025-04-09T10:00:00Z',
        level: 'info',
        component: 'Provider',
        message: 'Connected to Jira successfully'
      },
      {
        id: '2',
        timestamp: '2025-04-09T10:01:00Z',
        level: 'error',
        component: 'API',
        message: 'Failed to fetch test cases',
        details: { statusCode: 403 }
      },
      {
        id: '3',
        timestamp: '2025-04-09T10:02:00Z',
        level: 'warn',
        component: 'Migration',
        message: 'Retrying operation after failure'
      }
    ] as LogEntry[],
    clearLogs: () => {},
    filterLogs: (level: LogLevel) => {}
  };
};

const LogContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 350,
  maxWidth: 450,
  borderLeft: `1px solid ${theme.palette.divider}`,
}));

const LogHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const LogBody = styled(Box)({
  flex: 1,
  overflow: 'auto',
});

const SeverityChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'logLevel'
})<{ logLevel?: LogLevel }>(({ theme, logLevel }) => {
  let color = theme.palette.info.main;
  
  if (logLevel === 'error' || logLevel === 'fatal') {
    color = theme.palette.error.main;
  } else if (logLevel === 'warn') {
    color = theme.palette.warning.main;
  } else if (logLevel === 'debug') {
    color = theme.palette.grey[500];
  }
  
  return {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    fontSize: '0.75rem',
    height: 20,
    marginRight: theme.spacing(1),
  };
});

const LogListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'logLevel'
})<{ logLevel?: LogLevel }>(({ theme, logLevel }) => {
  let borderLeftColor = theme.palette.info.main;
  
  if (logLevel === 'error' || logLevel === 'fatal') {
    borderLeftColor = theme.palette.error.main;
  } else if (logLevel === 'warn') {
    borderLeftColor = theme.palette.warning.main;
  } else if (logLevel === 'debug') {
    borderLeftColor = theme.palette.grey[500];
  }
  
  return {
    borderLeft: `4px solid ${borderLeftColor}`,
    margin: theme.spacing(0.5, 0),
    padding: theme.spacing(0.5, 1),
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  };
});

const TimeStamp = styled(Typography)({
  fontSize: '0.75rem',
  opacity: 0.7,
});

const DetailsBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.action.hover,
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.875rem',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
}));

export const ActivityLog: React.FC = () => {
  const { logs, clearLogs, filterLogs } = useLogContext();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<LogLevel | 'all'>('all');

  const handleClear = () => {
    clearLogs();
  };

  const handleExpandLog = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const handleSeverityFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSeverity: LogLevel | 'all',
  ) => {
    if (newSeverity !== null) {
      setSeverityFilter(newSeverity);
      if (newSeverity !== 'all') {
        filterLogs(newSeverity);
      }
    }
  };

  // Format timestamp to local time
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <LogContainer data-testid="activity-log">
      <LogHeader>
        <Typography variant="subtitle1" fontWeight="medium">
          Activity Log
        </Typography>
        <Box display="flex" alignItems="center">
          <IconButton size="small" aria-label="search logs" sx={{ mr: 1 }}>
            <SearchIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="clear logs" onClick={handleClear}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
      </LogHeader>
      
      <Box sx={{ padding: 1, borderBottom: 1, borderColor: 'divider' }}>
        <ToggleButtonGroup
          size="small"
          value={severityFilter}
          exclusive
          onChange={handleSeverityFilterChange}
          aria-label="log severity filter"
          sx={{ width: '100%', justifyContent: 'space-between' }}
        >
          <ToggleButton value="all" aria-label="all logs">
            All
          </ToggleButton>
          <ToggleButton value="error" aria-label="error logs">
            Error
          </ToggleButton>
          <ToggleButton value="warn" aria-label="warning logs">
            Warn
          </ToggleButton>
          <ToggleButton value="info" aria-label="info logs">
            Info
          </ToggleButton>
          <ToggleButton value="debug" aria-label="debug logs">
            Debug
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <LogBody>
        <List disablePadding>
          {logs.map((log) => (
            <React.Fragment key={log.id}>
              <LogListItem 
                logLevel={log.level} 
                button 
                onClick={() => handleExpandLog(log.id)}
                data-severity={log.level}
              >
                <Box sx={{ width: '100%' }}>
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <SeverityChip 
                      label={log.level.toUpperCase()} 
                      logLevel={log.level}
                      size="small" 
                    />
                    <Typography variant="caption" color="text.secondary">
                      {log.component}
                    </Typography>
                    <Box flexGrow={1} />
                    <TimeStamp variant="caption">
                      {formatTimestamp(log.timestamp)}
                    </TimeStamp>
                  </Box>
                  <Typography variant="body2">
                    {log.message}
                  </Typography>
                  <Collapse in={expandedLog === log.id} timeout="auto" unmountOnExit>
                    {log.details && (
                      <Box mt={1}>
                        <DetailsBox>
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>{key}: {JSON.stringify(value)}</div>
                          ))}
                        </DetailsBox>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              </LogListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      </LogBody>
    </LogContainer>
  );
};