import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Menu,
  MenuItem,
  TextField,
  Button,
  Divider,
  styled
} from '@mui/material';
import { 
  SaveAlt as SaveIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  FormatLineSpacing as FormatIcon,
  ViewComfy as LayoutIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { LcarsStatusHeader } from './LcarsStatusHeader';
import { LcarsDataIndicators } from './LcarsDataIndicators';

type OperationState = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
type DisplayFormat = 'plain' | 'timestamps' | 'numbered' | 'detailed';
type LayoutType = 'default' | 'compact' | 'expanded' | 'minimal';

interface StatusWindowProps {
  title: string;
  logs: string[];
  operationName: string;
  operationState: OperationState;
  percentComplete?: number;
  estimatedTimeRemaining?: number;
  startTime?: Date;
  endTime?: Date;
  lastTransactionName?: string;
  lastTransactionStatus?: 'pending' | 'running' | 'completed' | 'failed';
  bytesIn?: number;
  bytesOut?: number;
  hasIncomingData?: boolean;
  hasOutgoingData?: boolean;
  onClose?: () => void;
}

const WindowContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: '#121212',
  color: theme.palette.getContrastText('#121212'),
  border: '1px solid #333',
  borderRadius: theme.shape.borderRadius,
}));

const WindowHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const WindowTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'medium',
  flexGrow: 1,
}));

const ToolbarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  marginRight: theme.spacing(1),
}));

interface LogContainerProps {
  layoutType: LayoutType;
}

const LogContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'layoutType'
})<LogContainerProps>(({ theme, layoutType }) => {
  const baseStyles = {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1),
    fontFamily: 'monospace',
    backgroundColor: '#121212',
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
  
  switch (layoutType) {
    case 'compact':
      return {
        ...baseStyles,
        padding: theme.spacing(0.5),
        fontSize: '12px',
        lineHeight: 1.3,
      };
    case 'expanded':
      return {
        ...baseStyles,
        padding: theme.spacing(2),
        fontSize: '16px',
        lineHeight: 1.8,
      };
    case 'minimal':
      return {
        ...baseStyles,
        padding: theme.spacing(0.5),
        fontSize: '12px',
        lineHeight: 1.2,
        '& .timestamp': {
          display: 'none',
        },
        '& .lineNumber': {
          display: 'none',
        },
      };
    default:
      return baseStyles;
  }
});

const LogEntry = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'highlighted'
})<{ highlighted?: boolean }>(({ theme, highlighted }) => ({
  padding: '2px 0',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: highlighted ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
}));

const Timestamp = styled(Box)({
  color: '#888',
  marginRight: '8px',
  display: 'inline-block',
});

const LineNumber = styled(Box)({
  color: '#666',
  marginRight: '8px',
  textAlign: 'right',
  display: 'inline-block',
  width: '40px',
});

export const StatusWindow: React.FC<StatusWindowProps> = ({
  title,
  logs,
  operationName,
  operationState,
  percentComplete,
  estimatedTimeRemaining,
  startTime,
  endTime,
  lastTransactionName,
  lastTransactionStatus,
  bytesIn = 0,
  bytesOut = 0,
  hasIncomingData = false,
  hasOutgoingData = false,
  onClose,
}) => {
  const [formatMenuAnchor, setFormatMenuAnchor] = useState<null | HTMLElement>(null);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>('plain');
  const [layoutType, setLayoutType] = useState<LayoutType>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<string[]>(logs);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // If operation is running, simulate data activity
  const isRunning = operationState === 'running';
  
  useEffect(() => {
    // Filter logs based on search term
    if (searchTerm) {
      setFilteredLogs(logs.filter(log => 
        log.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, searchTerm]);
  
  useEffect(() => {
    // Auto-scroll to bottom when new logs are added, but only if already at the bottom
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      
      if (isAtBottom) {
        logContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [filteredLogs]);
  
  const handleFormatMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFormatMenuAnchor(event.currentTarget);
  };
  
  const handleFormatMenuClose = () => {
    setFormatMenuAnchor(null);
  };
  
  const handleLayoutMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLayoutMenuAnchor(event.currentTarget);
  };
  
  const handleLayoutMenuClose = () => {
    setLayoutMenuAnchor(null);
  };
  
  const handleFormatChange = (format: DisplayFormat) => {
    setDisplayFormat(format);
    handleFormatMenuClose();
  };
  
  const handleLayoutChange = (layout: LayoutType) => {
    setLayoutType(layout);
    handleLayoutMenuClose();
  };
  
  const handleSaveLogs = () => {
    // Create a file with the logs
    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${operationName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_log_${timestamp}.txt`;
    
    // Create download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    a.remove();
    
    // Revoke the object URL to free memory
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };
  
  const handleCopyLogs = () => {
    // Copy logs to clipboard
    navigator.clipboard.writeText(filteredLogs.join('\n'))
      .then(() => {
        // Show a temporary success message
        // This would be better with a toast notification
        console.log('Logs copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
      });
  };
  
  const formatLog = (log: string, index: number) => {
    switch (displayFormat) {
      case 'timestamps':
        const timestamp = new Date().toLocaleTimeString();
        return (
          <LogEntry key={index}>
            <Timestamp className="timestamp">{timestamp}</Timestamp>
            {log}
          </LogEntry>
        );
      case 'numbered':
        return (
          <LogEntry key={index}>
            <LineNumber className="lineNumber">{index + 1}</LineNumber>
            {log}
          </LogEntry>
        );
      case 'detailed':
        const time = new Date().toLocaleTimeString();
        return (
          <LogEntry key={index}>
            <Timestamp className="timestamp">{time}</Timestamp>
            <LineNumber className="lineNumber">{index + 1}</LineNumber>
            {log}
          </LogEntry>
        );
      case 'plain':
      default:
        return (
          <LogEntry key={index}>
            {log}
          </LogEntry>
        );
    }
  };
  
  return (
    <WindowContainer elevation={3}>
      <LcarsStatusHeader 
        operationName={operationName}
        operationState={operationState}
        percentComplete={percentComplete}
        estimatedTimeRemaining={estimatedTimeRemaining}
        startTime={startTime}
        endTime={endTime}
        lastTransactionName={lastTransactionName}
        lastTransactionStatus={lastTransactionStatus}
      />
      
      <LcarsDataIndicators 
        bytesIn={bytesIn}
        bytesOut={bytesOut}
        hasIncomingData={isRunning && (hasIncomingData || Math.random() > 0.7)}
        hasOutgoingData={isRunning && (hasOutgoingData || Math.random() > 0.8)}
      />
      
      <WindowHeader>
        <WindowTitle variant="subtitle1">{title}</WindowTitle>
        {onClose && (
          <IconButton size="small" onClick={onClose} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </WindowHeader>
      
      <ToolbarContainer>
        <SearchContainer>
          <TextField
            placeholder="Search logs..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
        </SearchContainer>
        
        <Button
          startIcon={<SaveIcon />}
          variant="outlined"
          size="small"
          onClick={handleSaveLogs}
          sx={{ mr: 1 }}
        >
          Save
        </Button>
        
        <Button
          startIcon={<CopyIcon />}
          variant="outlined"
          size="small"
          onClick={handleCopyLogs}
          sx={{ mr: 1 }}
        >
          Copy
        </Button>
        
        <Button
          startIcon={<FormatIcon />}
          variant="outlined"
          size="small"
          onClick={handleFormatMenuOpen}
          sx={{ mr: 1 }}
        >
          Format
        </Button>
        
        <Button
          startIcon={<LayoutIcon />}
          variant="outlined"
          size="small"
          onClick={handleLayoutMenuOpen}
        >
          Layout
        </Button>
        
        <Menu
          anchorEl={formatMenuAnchor}
          open={Boolean(formatMenuAnchor)}
          onClose={handleFormatMenuClose}
        >
          <MenuItem onClick={() => handleFormatChange('plain')} selected={displayFormat === 'plain'}>
            Plain Text
          </MenuItem>
          <MenuItem onClick={() => handleFormatChange('timestamps')} selected={displayFormat === 'timestamps'}>
            Show Timestamps
          </MenuItem>
          <MenuItem onClick={() => handleFormatChange('numbered')} selected={displayFormat === 'numbered'}>
            Show Line Numbers
          </MenuItem>
          <MenuItem onClick={() => handleFormatChange('detailed')} selected={displayFormat === 'detailed'}>
            Detailed (Timestamps + Line Numbers)
          </MenuItem>
        </Menu>
        
        <Menu
          anchorEl={layoutMenuAnchor}
          open={Boolean(layoutMenuAnchor)}
          onClose={handleLayoutMenuClose}
        >
          <MenuItem onClick={() => handleLayoutChange('default')} selected={layoutType === 'default'}>
            Default
          </MenuItem>
          <MenuItem onClick={() => handleLayoutChange('compact')} selected={layoutType === 'compact'}>
            Compact
          </MenuItem>
          <MenuItem onClick={() => handleLayoutChange('expanded')} selected={layoutType === 'expanded'}>
            Expanded
          </MenuItem>
          <MenuItem onClick={() => handleLayoutChange('minimal')} selected={layoutType === 'minimal'}>
            Minimal
          </MenuItem>
        </Menu>
      </ToolbarContainer>
      
      <LogContainer 
        ref={logContainerRef} 
        layoutType={layoutType}
        className={layoutType}
        data-testid="status-log-container"
      >
        {filteredLogs.map((log, index) => formatLog(log, index))}
      </LogContainer>
    </WindowContainer>
  );
};