# Binary Processor Large Test Cases

This document describes the implementation for handling large test cases in the Binary Processor service.

## Overview

The Binary Processor service has been enhanced to handle large test cases efficiently. 
These enhancements include:

1. **Chunked Processing**: Processing large test cases in smaller, manageable chunks
2. **Memory Monitoring**: Tracking memory usage to prevent out-of-memory errors
3. **Performance Testing**: Tests for verifying performance with large test cases
4. **Stress Testing**: Tests for handling concurrent processing of large test cases

## Implementation Details

### Chunked Processing

Large test cases (especially those with large descriptions) are processed in chunks to avoid 
memory issues:

```go
// Process in chunks if needed
if needsChunking {
    description := testCase.Description
    chunks := (len(description) + chunkSize - 1) / chunkSize // Ceiling division
    
    for i := 0; i < chunks; i++ {
        // Calculate the chunk
        start := i * chunkSize
        end := (i + 1) * chunkSize
        if end > len(description) {
            end = len(description)
        }
        
        chunk := description[start:end]
        
        // Process the chunk
        processedChunk := p.processChunk(chunk, options)
        processedDescription += processedChunk
        
        // Update stats
        stats.ProcessedBytes += len(chunk)
        stats.ChunksProcessed++
    }
}
```

### Memory Monitoring

Memory usage is monitored during processing:

1. **Before Processing**: Check memory usage before processing a chunk
2. **Periodic Monitoring**: Background goroutine monitors memory usage
3. **Forced GC**: Garbage collection is triggered if memory usage is high

```go
// Check memory usage before processing
if p.memoryLimit > 0 {
    p.checkMemoryLimit()
}

// ...

// checkMemoryLimit checks if memory usage exceeds the limit
func (p *TestCaseProcessor) checkMemoryLimit() {
    if p.memoryLimit == 0 {
        return
    }
    
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    if m.Alloc > p.memoryLimit {
        p.log.Warn(fmt.Sprintf("Memory usage exceeds limit: %d bytes (limit: %d bytes)", 
            m.Alloc, 
            p.memoryLimit,
        ))
        
        // Force garbage collection
        runtime.GC()
        
        // Wait a little bit for GC to complete
        time.Sleep(100 * time.Millisecond)
    }
}
```

### Configuration

The processor can be configured with:

- **Chunk Size**: Size of each processing chunk (default: 1MB)
- **Memory Limit**: Maximum allowed memory usage (default: no limit)
- **Custom Logger**: For detailed logging

```go
// Create processor with configuration
processor := processors.NewTestCaseProcessor(
    processors.WithChunkSize(1024 * 1024), // 1MB chunks
    processors.WithMemoryLimit(1024 * 1024 * 1024), // 1GB memory limit
    processors.WithLogger(customLogger),
)
```

## Performance Considerations

### Memory Usage

- **Storage**: The in-memory storage creates copies of test cases to prevent external modification
- **Processing**: Chunked processing prevents loading entire large test cases into memory
- **Garbage Collection**: Forced GC helps manage memory during processing

### Processing Time

- **Chunking Overhead**: There is a small overhead for chunking, but it's negligible
- **Concurrent Processing**: The service supports concurrent processing of multiple test cases
- **Async Processing**: For very large test cases, async processing is available

## Testing

Comprehensive tests have been added to verify the handling of large test cases:

1. **TestLargeTestCaseDescription**: Tests handling of test cases with large descriptions (1MB)
2. **TestPerformanceWithManyLargeTestCases**: Tests performance with many large test cases
3. **TestVeryLargeTestCaseHandling**: Tests handling of extremely large test cases (10MB)
4. **TestConcurrentLargeTestCaseProcessing**: Tests processing multiple large test cases concurrently

## Usage

### Standard Processing

```http
POST /api/testcases/{id}/process
Content-Type: application/json

{
  "format": "JSON",
  "includeSteps": true,
  "exportImages": false,
  "chunkSize": 1048576
}
```

### Chunked Processing

```http
POST /api/testcases/{id}/process-chunked
Content-Type: application/json

{
  "format": "JSON",
  "includeSteps": true,
  "exportImages": false,
  "chunkSize": 1048576
}
```

### Asynchronous Processing

```http
POST /api/testcases/{id}/process-async
Content-Type: application/json

{
  "format": "JSON",
  "includeSteps": true,
  "exportImages": false
}
```

## Monitoring

The service provides endpoints for monitoring:

- **Health Check**: `/health` provides basic service health including memory usage
- **Memory Stats**: `/api/system/memory` provides detailed memory statistics

## Future Enhancements

1. **Disk-Based Processing**: For extremely large test cases, implement disk-based processing
2. **Streaming Responses**: Stream processed data instead of returning all at once
3. **Queue-Based Processing**: Offload processing to a queue for better resource management
4. **Memory Optimization**: Further optimize memory usage during processing