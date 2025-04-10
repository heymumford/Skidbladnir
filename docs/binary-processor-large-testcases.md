# Binary Processor - Large Test Cases & Attachments

This document describes the implementation for handling large test cases and attachments in the Binary Processor service.

## Overview

The Binary Processor service has been enhanced to handle large test cases and attachments efficiently. 
These enhancements include:

1. **Chunked Processing**: Processing large test cases and attachments in smaller, manageable chunks
2. **Memory Monitoring**: Tracking memory usage to prevent out-of-memory errors
3. **Provider Format Conversion**: Converting between provider-specific formats
4. **Attachment Handling**: Support for various attachment types and formats
5. **Cross-Provider Transformation**: Transforming data between providers (Zephyr, qTest, etc.)
6. **Performance Testing**: Tests for verifying performance with large test cases and attachments
7. **Stress Testing**: Tests for handling concurrent processing

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

## Attachment Handling

The Binary Processor now supports handling attachments for test cases:

### Storage

Attachments are stored with the following information:

```go
type Attachment struct {
    ID          string    `json:"id"`
    FileName    string    `json:"fileName"`
    ContentType string    `json:"contentType"`
    Size        int64     `json:"size"`
    Data        string    `json:"data"` // Base64 encoded data
    CreatedAt   time.Time `json:"createdAt"`
}
```

### API Endpoints

The following endpoints are available for attachment handling:

- `GET /api/testcases/{id}/attachments` - List all attachments for a test case
- `POST /api/testcases/{id}/attachments` - Upload a new attachment
- `GET /api/testcases/{id}/attachments/{attachmentId}` - Get attachment details
- `GET /api/testcases/{id}/attachments/{attachmentId}?download=true` - Download attachment
- `DELETE /api/testcases/{id}/attachments/{attachmentId}` - Delete attachment
- `POST /api/testcases/{id}/attachments/{attachmentId}/process` - Process attachment

### Processing Capabilities

Attachments can be processed in various ways:

1. **Format Conversion**: Convert between formats (XML, JSON, HTML, Markdown)
2. **Cross-Provider Conversion**: Convert between provider formats (Zephyr, qTest, etc.)
3. **Chunked Processing**: Process large attachments in chunks
4. **Content Type Processing**: Special handling for different content types

### Content Type Handling

| Content Type          | Processing Capabilities                                |
|-----------------------|-------------------------------------------------------|
| text/plain            | Format conversion, chunking                            |
| text/html             | Format conversion, chunking                            |
| application/json      | Provider format conversion, validation, transformation |
| image/*               | Compression, resizing, metadata extraction             |
| application/pdf       | Text extraction, metadata                              |
| application/zip       | Content extraction                                     |

## Provider Format Conversion

The Binary Processor supports conversion between different test management tool formats:

### Format Converter

A dedicated `FormatConverter` handles conversions between provider formats:

```go
// ConvertFormat converts data from one provider format to another
func (c *FormatConverter) ConvertFormat(
    data []byte, 
    sourceProvider, 
    targetProvider ProviderType
) (*ConversionResult, error) {
    // ...conversion logic
}
```

### Supported Providers

- **Zephyr**: Test cases, executions, attachments
- **qTest**: Test cases, test runs, test cycles, attachments
- **Azure DevOps**: Work items, test cases
- **Rally**: Query results, test cases

### Conversion Matrix

| Source → Target | Zephyr | qTest | Azure DevOps | Rally |
|-----------------|--------|-------|--------------|-------|
| Zephyr          | -      | Full  | Partial      | Partial |
| qTest           | Full   | -     | Partial      | Partial |
| Azure DevOps    | Partial| Full  | -            | Partial |
| Rally           | Partial| Full  | Partial      | -     |

### Example: Zephyr to qTest Conversion

```go
// Zephyr format
zephyrData := map[string]interface{}{
    "attachmentInfo": map[string]interface{}{
        "origin": "zephyr",
        "metadata": map[string]interface{}{
            "projectKey": "ZEPH",
            "issueKey": "ZEPH-123",
            "testCaseKey": "ZEPH-TEST-456",
        },
    },
    "content": "This is attachment content from Zephyr",
}

// Convert to qTest format
result, err := converter.ConvertFormat(
    zephyrJSON, 
    processors.ZephyrProvider, 
    processors.QTestProvider
)

// qTest format result
qTestData := map[string]interface{}{
    "links": [...],
    "test-case": {
        "id": "ZEPH-TEST-456",
        "name": "Test Case from Zephyr: ZEPH-TEST-456",
    },
    "content": "This is attachment content from Zephyr",
    "convertedAt": "2023-09-21T15:30:45Z",
    "convertedFrom": "Zephyr",
    "originalMetadata": {...}
}
```

## Usage Examples

### Upload an Attachment

```http
POST /api/testcases/12345/attachments
Content-Type: multipart/form-data

file=@path/to/file.json
```

### Process an Attachment with Format Conversion

```http
POST /api/testcases/12345/attachments/67890/process
Content-Type: application/json

{
  "format": "JSON",
  "sourceProvider": "zephyr",
  "targetProvider": "qtest",
  "exportImages": true,
  "preserveFormatting": true,
  "customFields": {
    "project": "MIGRATION-123",
    "organization": "TestOrg"
  }
}
```

### Batch Process Multiple Attachments

```http
POST /api/testcases/12345/attachments/batch
Content-Type: application/json

{
  "attachmentIds": ["67890", "67891", "67892", "67893"],
  "processingOptions": {
    "format": "XML",
    "exportImages": true
  },
  "batchOptions": {
    "maxConcurrentJobs": 3,
    "abortOnFailure": false,
    "timeoutSeconds": 300,
    "retryCount": 3,
    "collectDetailedStats": true,
    "filterByContentType": ["text/plain", "application/json"],
    "filterByFileName": ["*.json", "test_*.txt"]
  }
}
```

### Batch Convert Multiple Attachments Between Providers

```http
POST /api/testcases/12345/attachments/batch/convert
Content-Type: application/json

{
  "attachmentIds": ["67890", "67891", "67892"],
  "processingOptions": {
    "format": "JSON",
    "sourceProvider": "zephyr",
    "targetProvider": "qtest",
    "exportImages": true,
    "includeMetadata": true,
    "preserveFormatting": true
  },
  "batchOptions": {
    "maxConcurrentJobs": 5,
    "abortOnFailure": false,
    "timeoutSeconds": 600,
    "retryCount": 3,
    "collectDetailedStats": true
  }
}
```

### Batch Processing Response

```json
{
  "batchId": "b8f9c8e7-d6e5-4a3b-b2a1-9c8d7e6f5a4b",
  "status": "completed",
  "processed": 4,
  "failed": 0,
  "total": 4,
  "processedAttachments": ["67894", "67895", "67896", "67897"],
  "failedAttachments": {},
  "elapsedTime": "2.541s",
  "warnings": 1,
  "conversionStatistics": {
    "zephyr_attachments": 2,
    "qtest_cases": 2,
    "converted_from_zephyr": 2
  },
  "detailedStats": {
    "totalBytesProcessed": 15360,
    "totalChunksProcessed": 4,
    "maxAttachmentSize": 8192,
    "minAttachmentSize": 1024,
    "avgAttachmentSize": 3840,
    "totalConversions": 4,
    "fullConversions": 2,
    "partialConversions": 0,
    "zephyrConversions": 2,
    "qTestConversions": 2
  }
}
```

### Advanced Processing Options

The processor supports many options for customizing attachment processing:

```go
type ProcessingOptions struct {
    Format              string            `json:"format"`
    IncludeSteps        bool              `json:"includeSteps"`
    ExportImages        bool              `json:"exportImages"`
    ChunkSize           int               `json:"chunkSize"`
    TargetProvider      string            `json:"targetProvider"`
    SourceProvider      string            `json:"sourceProvider"`
    IncludeAttachments  bool              `json:"includeAttachments"`
    IncludeMetadata     bool              `json:"includeMetadata"`
    CustomFields        map[string]string `json:"customFields"`
    PreserveFormatting  bool              `json:"preserveFormatting"`
    MaxSizeBytes        int64             `json:"maxSizeBytes"`
    CompressImages      bool              `json:"compressImages"`
    ResizeImages        bool              `json:"resizeImages"`
    MaxImageWidth       int               `json:"maxImageWidth"`
    MaxImageHeight      int               `json:"maxImageHeight"`
    DefaultProjectKey   string            `json:"defaultProjectKey"`
    DefaultOrganization string            `json:"defaultOrganization"`
}
```

## Future Enhancements

1. **Disk-Based Processing**: For extremely large test cases and attachments, implement disk-based processing
2. **Streaming Responses**: Stream processed data instead of returning all at once
3. **Queue-Based Processing**: Offload processing to a queue for better resource management
4. **Memory Optimization**: Further optimize memory usage during processing
5. **Additional Provider Support**: Add support for more test management providers
6. **Advanced Image Processing**: Enhanced image processing capabilities (OCR, comparison)
7. **Binary Diffing**: Compare binary attachments for changes
8. **Multi-Part Attachments**: Handle multi-part attachments and reassembly