import React, { useState } from 'react';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface ActivityLogProps {
  entries?: LogEntry[];
  onClear?: () => void;
}

/**
 * Simple Activity Log component for UI tests
 */
const ActivityLog: React.FC<ActivityLogProps> = ({
  entries = [],
  onClear
}) => {
  const [visibleEntries, setVisibleEntries] = useState<LogEntry[]>(entries);
  
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      setVisibleEntries([]);
    }
  };
  
  return (
    <div className="activity-log">
      <div className="header">
        <h3>Activity Log</h3>
        <button onClick={handleClear}>Clear</button>
      </div>
      
      <div className="log-container">
        {visibleEntries.length === 0 ? (
          <div className="empty-log">No log entries to display</div>
        ) : (
          <ul>
            {visibleEntries.map((entry, index) => (
              <li key={index} className={`log-entry log-${entry.level}`}>
                <span className="timestamp">{entry.timestamp}</span>
                <span className="level">{entry.level}</span>
                <span className="message">{entry.message}</span>
                {entry.source && <span className="source">{entry.source}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
