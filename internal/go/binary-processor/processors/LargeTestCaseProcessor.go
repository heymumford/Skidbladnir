package processors

import (
	"fmt"
	"time"
	"runtime"
	"strings"
	
	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/internal/go/common/logger"
)

// DefaultChunkSize defines the default size for processing chunks (1MB)
const DefaultChunkSize = 1 * 1024 * 1024

// TestCaseProcessor handles processing of large test cases
type TestCaseProcessor struct {
	log         *logger.Logger
	chunkSize   int
	memoryLimit uint64
}

// ProcessingOptions contains options for test case processing
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

// ProcessingStats contains statistics about the processing
type ProcessingStats struct {
	TotalBytes     int           `json:"totalBytes"`
	ProcessedBytes int           `json:"processedBytes"`
	ChunksProcessed int          `json:"chunksProcessed"`
	ProcessingTime time.Duration `json:"processingTime"`
	MemoryUsage    uint64        `json:"memoryUsage"`
}

// NewTestCaseProcessor creates a new processor for large test cases
func NewTestCaseProcessor(opts ...func(*TestCaseProcessor)) *TestCaseProcessor {
	processor := &TestCaseProcessor{
		log:         logger.CreateLogger("TestCaseProcessor", logger.INFO),
		chunkSize:   DefaultChunkSize,
		memoryLimit: 0, // No limit by default
	}

	// Apply options
	for _, opt := range opts {
		opt(processor)
	}

	return processor
}

// WithChunkSize sets the chunk size for processing
func WithChunkSize(size int) func(*TestCaseProcessor) {
	return func(p *TestCaseProcessor) {
		if size > 0 {
			p.chunkSize = size
		}
	}
}

// WithMemoryLimit sets the memory limit (in bytes)
func WithMemoryLimit(limit uint64) func(*TestCaseProcessor) {
	return func(p *TestCaseProcessor) {
		p.memoryLimit = limit
	}
}

// WithLogger sets a custom logger
func WithLogger(log *logger.Logger) func(*TestCaseProcessor) {
	return func(p *TestCaseProcessor) {
		if log != nil {
			p.log = log
		}
	}
}

// ProcessTestCase processes a test case with chunking for large content
func (p *TestCaseProcessor) ProcessTestCase(testCase *handlers.TestCase, options ProcessingOptions) (map[string]interface{}, ProcessingStats, error) {
	startTime := time.Now()
	
	// Initialize stats
	stats := ProcessingStats{
		TotalBytes:      len(testCase.Description),
		ProcessedBytes:  0,
		ChunksProcessed: 0,
	}
	
	// Check if we need chunking (if description is larger than chunk size)
	needsChunking := len(testCase.Description) > p.chunkSize
	
	// If custom chunk size is provided in options, use that
	chunkSize := p.chunkSize
	if options.ChunkSize > 0 {
		chunkSize = options.ChunkSize
	}
	
	// Log the start of processing
	p.log.Info(
		fmt.Sprintf("Processing test case %s (size: %d bytes, chunking: %t)", 
			testCase.ID, 
			len(testCase.Description), 
			needsChunking,
		),
	)
	
	// Process in chunks if needed
	var processedDescription string
	if needsChunking {
		description := testCase.Description
		chunks := (len(description) + chunkSize - 1) / chunkSize // Ceiling division
		
		for i := 0; i < chunks; i++ {
			// Check memory usage before processing
			if p.memoryLimit > 0 {
				p.checkMemoryLimit()
			}
			
			// Calculate the chunk
			start := i * chunkSize
			end := (i + 1) * chunkSize
			if end > len(description) {
				end = len(description)
			}
			
			chunk := description[start:end]
			
			// Process the chunk (in a real implementation, would do actual processing)
			processedChunk := p.processChunk(chunk, options)
			processedDescription += processedChunk
			
			// Update stats
			stats.ProcessedBytes += len(chunk)
			stats.ChunksProcessed++
			
			// Log progress
			p.log.Debug(
				fmt.Sprintf("Processed chunk %d/%d (%d bytes)", 
					i+1, 
					chunks, 
					len(chunk),
				),
			)
		}
	} else {
		// Small enough to process in one go
		processedDescription = p.processChunk(testCase.Description, options)
		stats.ProcessedBytes = len(testCase.Description)
		stats.ChunksProcessed = 1
	}
	
	// Create the result
	result := map[string]interface{}{
		"id":          testCase.ID,
		"title":       testCase.Title,
		"description": processedDescription, // Only include the first 1000 chars for response
		"status":      testCase.Status,
		"priority":    testCase.Priority,
		"processingDetails": map[string]interface{}{
			"format":       options.Format,
			"processedAt":  time.Now(),
			"includeSteps": options.IncludeSteps,
			"exportImages": options.ExportImages,
			"chunked":      needsChunking,
			"chunks":       stats.ChunksProcessed,
		},
	}
	
	// Update final stats
	stats.ProcessingTime = time.Since(startTime)
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	stats.MemoryUsage = m.Alloc
	
	return result, stats, nil
}

// processChunk processes a single chunk of test case description
func (p *TestCaseProcessor) processChunk(chunk string, options ProcessingOptions) string {
	// This is where the actual processing would happen
	// For now, we'll just simulate processing by truncating the test data
	// In a real implementation, this would parse, transform, validate, etc.
	
	// Simulate some processing based on format
	var processed string
	switch strings.ToUpper(options.Format) {
	case "XML":
		// Convert to XML format (simulation)
		processed = fmt.Sprintf("<testCase><description>%s</description></testCase>", truncateForLog(chunk, 100))
	case "HTML":
		// Convert to HTML format (simulation)
		processed = fmt.Sprintf("<div class='test-case'>%s</div>", truncateForLog(chunk, 100))
	case "MARKDOWN":
		// Convert to Markdown format (simulation)
		processed = fmt.Sprintf("# Test Case\n\n%s", truncateForLog(chunk, 100))
	default: // JSON or any other
		// Leave as is
		processed = chunk
	}
	
	return processed
}

// checkMemoryLimit checks if memory usage exceeds the limit
func (p *TestCaseProcessor) checkMemoryLimit() {
	if p.memoryLimit == 0 {
		return
	}
	
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	if m.Alloc > p.memoryLimit {
		p.log.Warn(
			fmt.Sprintf("Memory usage exceeds limit: %d bytes (limit: %d bytes)", 
				m.Alloc, 
				p.memoryLimit,
			),
		)
		
		// Force garbage collection
		runtime.GC()
		
		// Wait a little bit for GC to complete
		time.Sleep(100 * time.Millisecond)
	}
}

// truncateForLog truncates a string for logging purposes
func truncateForLog(s string, maxLength int) string {
	if len(s) <= maxLength {
		return s
	}
	return s[:maxLength] + "..."
}