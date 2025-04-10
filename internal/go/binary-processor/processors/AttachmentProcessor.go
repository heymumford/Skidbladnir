package processors

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// AttachmentProcessor handles processing of attachments
type AttachmentProcessor struct {
	log         *logger.Logger
	chunkSize   int
	memoryLimit uint64
}

// NewAttachmentProcessor creates a new processor for attachments
func NewAttachmentProcessor(opts ...func(*AttachmentProcessor)) *AttachmentProcessor {
	processor := &AttachmentProcessor{
		log:         logger.CreateLogger("AttachmentProcessor", logger.INFO),
		chunkSize:   DefaultChunkSize,
		memoryLimit: 0, // No limit by default
	}

	// Apply options
	for _, opt := range opts {
		opt(processor)
	}

	return processor
}

// WithAttachmentChunkSize sets the chunk size for processing
func WithAttachmentChunkSize(size int) func(*AttachmentProcessor) {
	return func(p *AttachmentProcessor) {
		if size > 0 {
			p.chunkSize = size
		}
	}
}

// WithAttachmentMemoryLimit sets the memory limit (in bytes)
func WithAttachmentMemoryLimit(limit uint64) func(*AttachmentProcessor) {
	return func(p *AttachmentProcessor) {
		p.memoryLimit = limit
	}
}

// WithAttachmentLogger sets a custom logger
func WithAttachmentLogger(log *logger.Logger) func(*AttachmentProcessor) {
	return func(p *AttachmentProcessor) {
		if log != nil {
			p.log = log
		}
	}
}

// ProcessAttachment processes an attachment with optional format conversion
func (p *AttachmentProcessor) ProcessAttachment(attachment *storage.Attachment, options *ProcessingOptions) (*storage.Attachment, error) {
	// Check if we need to process this attachment type
	if !p.shouldProcess(attachment, options) {
		return attachment, nil
	}

	startTime := time.Now()
	p.log.Info(fmt.Sprintf("Processing attachment %s (%s, %d bytes)", attachment.ID, attachment.ContentType, attachment.Size))

	// Decode attachment data
	data, err := base64.StdEncoding.DecodeString(attachment.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode attachment data: %v", err)
	}

	// Process data based on content type and options
	processedData, err := p.processData(data, attachment, options)
	if err != nil {
		return nil, fmt.Errorf("failed to process attachment data: %v", err)
	}

	// Create new attachment with processed data
	processedAttachment := &storage.Attachment{
		ID:          uuid.New().String(),
		FileName:    p.getProcessedFileName(attachment.FileName, options),
		ContentType: p.getProcessedContentType(attachment.ContentType, options),
		Size:        int64(len(processedData)),
		Data:        base64.StdEncoding.EncodeToString(processedData),
		CreatedAt:   time.Now(),
	}

	p.log.Info(fmt.Sprintf("Attachment processed in %v, new size: %d bytes", time.Since(startTime), processedAttachment.Size))
	return processedAttachment, nil
}

// shouldProcess determines if attachment should be processed based on type and options
func (p *AttachmentProcessor) shouldProcess(attachment *storage.Attachment, options *ProcessingOptions) bool {
	// Don't process if export images is disabled and this is an image
	if !options.ExportImages && strings.HasPrefix(attachment.ContentType, "image/") {
		return false
	}

	// Always process by default
	return true
}

// processData processes the attachment data based on content type
func (p *AttachmentProcessor) processData(data []byte, attachment *storage.Attachment, options *ProcessingOptions) ([]byte, error) {
	// Check for cross-provider format conversion
	if attachment.ContentType == "application/json" {
		// Check if this is a provider-specific attachment that needs conversion
		if converted, ok := p.checkForProviderSpecificFormat(data, attachment, options); ok {
			return converted, nil
		}
	}

	// Check if we need chunking for large attachments
	if int64(len(data)) > int64(p.chunkSize) {
		return p.processLargeData(data, attachment.ContentType, options)
	}

	// Process data based on content type
	switch {
	case strings.HasPrefix(attachment.ContentType, "image/"):
		return p.processImage(data, attachment.ContentType, options)
	case strings.HasPrefix(attachment.ContentType, "text/"):
		return p.processText(data, attachment.ContentType, options)
	case attachment.ContentType == "application/pdf":
		return p.processPDF(data, options)
	case attachment.ContentType == "application/zip":
		return p.processZip(data, options)
	default:
		// For other types, just return as is
		return data, nil
	}
}

// checkForProviderSpecificFormat checks if the attachment is from a specific provider
// and converts it to the appropriate format if needed
func (p *AttachmentProcessor) checkForProviderSpecificFormat(data []byte, attachment *storage.Attachment, options *ProcessingOptions) ([]byte, error) {
	// Try to parse as JSON first
	var jsonData map[string]interface{}
	err := json.Unmarshal(data, &jsonData)
	if err != nil {
		// Not JSON, skip conversion
		return nil, fmt.Errorf("not a valid JSON format")
	}

	// Create format converter
	converter := NewFormatConverter(p.log.Child("FormatConverter"))

	// Check for Zephyr format
	attachmentInfo, hasAttachmentInfo := jsonData["attachmentInfo"].(map[string]interface{})
	if hasAttachmentInfo {
		origin, hasOrigin := attachmentInfo["origin"].(string)
		if hasOrigin && origin == "zephyr" {
			// Use the format converter
			result, err := converter.ConvertFormat(data, ZephyrProvider, QTestProvider)
			if err != nil {
				return nil, fmt.Errorf("failed to convert Zephyr to qTest format: %v", err)
			}
			return result.ConvertedData, nil
		}
	}

	// Check for qTest format
	if _, hasLinks := jsonData["links"]; hasLinks {
		if _, hasTestCycle := jsonData["test-cycle"]; hasTestCycle || jsonData["test-case"] != nil {
			// This is already qTest format, we could convert to Zephyr if needed
			if options.Format == "ZEPHYR" {
				result, err := converter.ConvertFormat(data, QTestProvider, ZephyrProvider)
				if err != nil {
					return nil, fmt.Errorf("failed to convert qTest to Zephyr format: %v", err)
				}
				return result.ConvertedData, nil
			}
			// No conversion needed
			return data, nil
		}
	}

	// Check for Azure DevOps format
	if _, hasWorkItems := jsonData["workItems"]; hasWorkItems {
		result, err := converter.ConvertFormat(data, AzureDevOpsProvider, QTestProvider)
		if err != nil {
			return nil, fmt.Errorf("failed to convert Azure DevOps to qTest format: %v", err)
		}
		return result.ConvertedData, nil
	}

	// Check for Rally format
	if _, hasResults := jsonData["QueryResult"]; hasResults {
		result, err := converter.ConvertFormat(data, RallyProvider, QTestProvider)
		if err != nil {
			return nil, fmt.Errorf("failed to convert Rally to qTest format: %v", err)
		}
		return result.ConvertedData, nil
	}

	// No specific format detected or no conversion needed
	return data, fmt.Errorf("no provider-specific format detected")
}

// processLargeData processes large data in chunks
func (p *AttachmentProcessor) processLargeData(data []byte, contentType string, options *ProcessingOptions) ([]byte, error) {
	chunkSize := p.chunkSize
	p.log.Info(fmt.Sprintf("Processing large attachment (%d bytes) in chunks of %d bytes", len(data), chunkSize))

	// Process in chunks
	var processedData []byte
	chunks := (len(data) + chunkSize - 1) / chunkSize // Ceiling division

	for i := 0; i < chunks; i++ {
		// Calculate chunk range
		start := i * chunkSize
		end := (i + 1) * chunkSize
		if end > len(data) {
			end = len(data)
		}

		chunk := data[start:end]

		// Process individual chunk
		var processedChunk []byte
		var err error

		switch {
		case strings.HasPrefix(contentType, "image/"):
			// For images, if this is the first chunk, process header info
			if i == 0 {
				processedChunk, err = p.processImage(chunk, contentType, options)
			} else {
				// For subsequent chunks of images, just append the data
				processedChunk = chunk
			}
		case strings.HasPrefix(contentType, "text/"):
			// For text, process each chunk
			processedChunk, err = p.processText(chunk, contentType, options)
		default:
			// For other types, just append chunk
			processedChunk = chunk
		}

		if err != nil {
			return nil, fmt.Errorf("error processing chunk %d: %v", i, err)
		}

		processedData = append(processedData, processedChunk...)
		p.log.Debug(fmt.Sprintf("Processed chunk %d/%d (%d bytes)", i+1, chunks, len(chunk)))
	}

	return processedData, nil
}

// processImage processes image data
func (p *AttachmentProcessor) processImage(data []byte, contentType string, options *ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would resize, compress, or convert the image
	// For now, just return the original data
	p.log.Debug(fmt.Sprintf("Processing image of type %s (%d bytes)", contentType, len(data)))
	return data, nil
}

// processText processes text data
func (p *AttachmentProcessor) processText(data []byte, contentType string, options *ProcessingOptions) ([]byte, error) {
	// Convert text based on format option
	p.log.Debug(fmt.Sprintf("Processing text of type %s (%d bytes) to format %s", contentType, len(data), options.Format))
	
	switch strings.ToUpper(options.Format) {
	case "XML":
		// Convert to XML-like format
		return []byte(fmt.Sprintf("<content>%s</content>", data)), nil
	case "HTML":
		// Convert to HTML-like format
		return []byte(fmt.Sprintf("<div>%s</div>", data)), nil
	case "MARKDOWN":
		// Convert to Markdown-like format
		return []byte(fmt.Sprintf("# Content\n\n%s", data)), nil
	default:
		// Return as-is for other formats
		return data, nil
	}
}

// processPDF handles PDF attachments
func (p *AttachmentProcessor) processPDF(data []byte, options *ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would extract text, compress, or analyze PDFs
	p.log.Debug(fmt.Sprintf("Processing PDF (%d bytes)", len(data)))
	return data, nil
}

// processZip handles ZIP attachments
func (p *AttachmentProcessor) processZip(data []byte, options *ProcessingOptions) ([]byte, error) {
	// In a real implementation, this would extract and process ZIP contents
	p.log.Debug(fmt.Sprintf("Processing ZIP (%d bytes)", len(data)))
	return data, nil
}

// getProcessedFileName returns the appropriate filename for processed attachment
func (p *AttachmentProcessor) getProcessedFileName(originalFilename string, options *ProcessingOptions) string {
	ext := filepath.Ext(originalFilename)
	baseName := strings.TrimSuffix(originalFilename, ext)

	// Modify extension based on format if applicable
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			ext = ".xml"
		case "HTML":
			ext = ".html"
		case "MARKDOWN", "MD":
			ext = ".md"
		}
	}

	return baseName + "_processed" + ext
}

// getProcessedContentType returns the content type for processed attachment
func (p *AttachmentProcessor) getProcessedContentType(originalType string, options *ProcessingOptions) string {
	// Change content type based on format if applicable
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			return "application/xml"
		case "HTML":
			return "text/html"
		case "MARKDOWN", "MD":
			return "text/markdown"
		}
	}

	return originalType
}