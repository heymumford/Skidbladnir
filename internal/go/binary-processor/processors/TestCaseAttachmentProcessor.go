package processors

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"io/ioutil"
	"mime"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/skidbladnir/binary-processor/storage"
	"github.com/skidbladnir/internal/go/common/logger"
)

// TestCaseAttachmentProcessor handles the processing of test case attachments
type TestCaseAttachmentProcessor struct {
	log             *logger.Logger
	maxAttachmentSize int64
	chunkSize       int
	formatConverter *FormatConverter
}

// ProviderMapping maps between provider formats
type ProviderMapping struct {
	SourceProvider string
	TargetProvider string
	Formatter      func(data []byte, metadata map[string]interface{}) ([]byte, error)
}

// AttachmentOptions contains options for processing attachments
type AttachmentOptions struct {
	ProcessingOptions
	ExtractMetadata     bool              `json:"extractMetadata"`
	IncludeOriginalData bool              `json:"includeOriginalData"`
	PreserveStructure   bool              `json:"preserveStructure"`
	ResizeImages        bool              `json:"resizeImages"`
	MaxWidth            int               `json:"maxWidth"`
	MaxHeight           int               `json:"maxHeight"`
	CustomFields        map[string]string `json:"customFields"`
	ProviderMappings    []ProviderMapping `json:"providerMappings"`
}

// ProcessingResult contains the result of processing an attachment
type ProcessingResult struct {
	ProcessedAttachment *storage.Attachment
	SourceFormat        string
	TargetFormat        string
	Warnings            []string
	ProcessingTime      time.Duration
	BytesProcessed      int64
	ChunksProcessed     int
	Metadata            map[string]interface{}
}

// NewTestCaseAttachmentProcessor creates a new attachment processor
func NewTestCaseAttachmentProcessor(opts ...func(*TestCaseAttachmentProcessor)) *TestCaseAttachmentProcessor {
	processor := &TestCaseAttachmentProcessor{
		log:              logger.CreateLogger("TestCaseAttachmentProcessor", logger.INFO),
		maxAttachmentSize: 100 * 1024 * 1024, // 100MB default
		chunkSize:        DefaultChunkSize,
		formatConverter:  NewFormatConverter(nil),
	}

	// Apply options
	for _, opt := range opts {
		opt(processor)
	}

	return processor
}

// WithAttachmentLogger sets a custom logger for the attachment processor
func WithAttachmentLogger(log *logger.Logger) func(*TestCaseAttachmentProcessor) {
	return func(p *TestCaseAttachmentProcessor) {
		if log != nil {
			p.log = log
		}
	}
}

// WithAttachmentMaxSize sets the maximum attachment size
func WithAttachmentMaxSize(maxSize int64) func(*TestCaseAttachmentProcessor) {
	return func(p *TestCaseAttachmentProcessor) {
		if maxSize > 0 {
			p.maxAttachmentSize = maxSize
		}
	}
}

// WithAttachmentChunkSize sets the chunk size for processing
func WithAttachmentChunkSize(size int) func(*TestCaseAttachmentProcessor) {
	return func(p *TestCaseAttachmentProcessor) {
		if size > 0 {
			p.chunkSize = size
		}
	}
}

// WithFormatConverter sets a custom format converter
func WithFormatConverter(converter *FormatConverter) func(*TestCaseAttachmentProcessor) {
	return func(p *TestCaseAttachmentProcessor) {
		if converter != nil {
			p.formatConverter = converter
		}
	}
}

// ProcessAttachment processes an attachment based on provided options
func (p *TestCaseAttachmentProcessor) ProcessAttachment(attachment *storage.Attachment, options *ProcessingOptions) (*storage.Attachment, error) {
	if attachment == nil {
		return nil, errors.New("attachment cannot be nil")
	}

	startTime := time.Now()
	p.log.Info(fmt.Sprintf("Processing attachment %s: %s (%s, %d bytes)",
		attachment.ID, attachment.FileName, attachment.ContentType, attachment.Size))

	// Apply default options if needed
	if options == nil {
		options = &ProcessingOptions{
			Format:       "JSON",
			ExportImages: true,
		}
	}

	// Check size limit
	if attachment.Size > p.maxAttachmentSize {
		return nil, fmt.Errorf("attachment size %d bytes exceeds maximum size %d bytes", 
			attachment.Size, p.maxAttachmentSize)
	}

	// Decode the attachment data
	data, err := base64.StdEncoding.DecodeString(attachment.Data)
	if err != nil {
		return nil, errors.Wrap(err, "failed to decode attachment data")
	}

	var processedData []byte
	var metadata map[string]interface{}
	var warnings []string

	// Process based on content type and format
	if options.SourceProvider != "" && options.TargetProvider != "" {
		// Cross-provider conversion
		processedData, metadata, warnings, err = p.convertBetweenProviders(
			data, attachment, options.SourceProvider, options.TargetProvider, options)
	} else {
		// Standard processing
		processedData, metadata, warnings, err = p.processData(data, attachment, options)
	}

	if err != nil {
		return nil, errors.Wrap(err, "failed to process attachment data")
	}

	// Create processed attachment
	processedAttachment := &storage.Attachment{
		ID:          uuid.New().String(),
		FileName:    p.getProcessedFileName(attachment.FileName, options),
		ContentType: p.getProcessedContentType(attachment.ContentType, options),
		Size:        int64(len(processedData)),
		Data:        base64.StdEncoding.EncodeToString(processedData),
		CreatedAt:   time.Now(),
	}

	// Include processing metadata if requested
	if len(metadata) > 0 && options.IncludeMetadata {
		// Add metadata to the processed attachment if JSON
		if strings.HasPrefix(processedAttachment.ContentType, "application/json") {
			var jsonData map[string]interface{}
			if err := json.Unmarshal(processedData, &jsonData); err == nil {
				// Add metadata to the JSON
				jsonData["processingMetadata"] = metadata
				if len(warnings) > 0 {
					jsonData["processingWarnings"] = warnings
				}
				
				// Re-encode with added metadata
				enhancedData, err := json.MarshalIndent(jsonData, "", "  ")
				if err == nil {
					processedAttachment.Data = base64.StdEncoding.EncodeToString(enhancedData)
					processedAttachment.Size = int64(len(enhancedData))
				}
			}
		}
	}

	processingTime := time.Since(startTime)
	p.log.Info(fmt.Sprintf("Attachment %s processed in %v, new size: %d bytes",
		attachment.ID, processingTime, processedAttachment.Size))

	return processedAttachment, nil
}

// processData processes attachment data based on content type and options
func (p *TestCaseAttachmentProcessor) processData(
	data []byte, 
	attachment *storage.Attachment, 
	options *ProcessingOptions,
) ([]byte, map[string]interface{}, []string, error) {
	metadata := make(map[string]interface{})
	warnings := make([]string, 0)

	// Check if we need to format the data
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			return p.formatAsXML(data, attachment.ContentType, metadata, warnings)
		case "HTML":
			return p.formatAsHTML(data, attachment.ContentType, metadata, warnings)
		case "MARKDOWN", "MD":
			return p.formatAsMarkdown(data, attachment.ContentType, metadata, warnings)
		case "JSON":
			return p.formatAsJSON(data, attachment.ContentType, metadata, warnings)
		}
	}

	// Process based on content type
	if strings.HasPrefix(attachment.ContentType, "image/") && options.ExportImages {
		return p.processImage(data, attachment.ContentType, options, metadata, warnings)
	} else if strings.HasPrefix(attachment.ContentType, "text/") {
		return p.processText(data, attachment.ContentType, metadata, warnings)
	} else if attachment.ContentType == "application/json" {
		return p.processJSON(data, metadata, warnings)
	} else if attachment.ContentType == "application/pdf" {
		return p.processPDF(data, options, metadata, warnings)
	} else if attachment.ContentType == "application/zip" {
		return p.processZip(data, options, metadata, warnings)
	}

	// Default - return as is
	metadata["processedAs"] = "binary"
	metadata["originalContentType"] = attachment.ContentType
	return data, metadata, warnings, nil
}

// convertBetweenProviders converts data between provider formats
func (p *TestCaseAttachmentProcessor) convertBetweenProviders(
	data []byte,
	attachment *storage.Attachment,
	sourceProvider string,
	targetProvider string,
	options *ProcessingOptions,
) ([]byte, map[string]interface{}, []string, error) {
	metadata := make(map[string]interface{})
	warnings := make([]string, 0)

	// Use the format converter
	sourceProviderType := ProviderType(sourceProvider)
	targetProviderType := ProviderType(targetProvider)

	p.log.Info(fmt.Sprintf("Converting attachment %s from %s to %s format",
		attachment.ID, sourceProvider, targetProvider))

	// Perform the conversion
	result, err := p.formatConverter.ConvertFormat(data, sourceProviderType, targetProviderType)
	if err != nil {
		warnings = append(warnings, fmt.Sprintf("Conversion error: %v", err))
		metadata["conversionError"] = err.Error()
		// Return original data on error
		return data, metadata, warnings, nil
	}

	// Collect metadata from the result
	metadata["sourceProvider"] = string(result.SourceProvider)
	metadata["targetProvider"] = string(result.TargetProvider)
	metadata["sourceFormat"] = result.SourceFormat
	metadata["targetFormat"] = result.TargetFormat
	metadata["conversionTime"] = result.ConversionTime.String()
	metadata["isFullConversion"] = result.IsFullConversion

	if len(result.ModifiedFields) > 0 {
		metadata["modifiedFields"] = result.ModifiedFields
	}

	// Add warnings
	if len(result.WarningMessages) > 0 {
		warnings = append(warnings, result.WarningMessages...)
		metadata["conversionWarnings"] = result.WarningMessages
	}

	return result.ConvertedData, metadata, warnings, nil
}

// formatAsXML formats data as XML
func (p *TestCaseAttachmentProcessor) formatAsXML(
	data []byte,
	contentType string, 
	metadata map[string]interface{}, 
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	if strings.HasPrefix(contentType, "application/xml") || strings.HasPrefix(contentType, "text/xml") {
		// Already XML, just return as is
		metadata["format"] = "XML"
		metadata["alreadyFormatted"] = true
		return data, metadata, warnings, nil
	}

	// Convert text data to XML
	if strings.HasPrefix(contentType, "text/") {
		xmlData := fmt.Sprintf("<content>%s</content>", escapeXML(string(data)))
		metadata["format"] = "XML"
		metadata["originalContentType"] = contentType
		return []byte(xmlData), metadata, warnings, nil
	}

	// Convert JSON to XML
	if contentType == "application/json" {
		var jsonData interface{}
		if err := json.Unmarshal(data, &jsonData); err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to parse JSON: %v", err))
			xmlData := fmt.Sprintf("<content>%s</content>", escapeXML(string(data)))
			metadata["format"] = "XML"
			metadata["parseError"] = err.Error()
			return []byte(xmlData), metadata, warnings, nil
		}
		
		// Simple JSON to XML conversion
		xmlData := jsonToXML(jsonData, "root")
		metadata["format"] = "XML"
		metadata["originalContentType"] = contentType
		metadata["convertedFromJSON"] = true
		return []byte(xmlData), metadata, warnings, nil
	}

	// For binary data, just wrap in XML
	xmlData := fmt.Sprintf("<binary encoding=\"base64\">%s</binary>", base64.StdEncoding.EncodeToString(data))
	metadata["format"] = "XML"
	metadata["originalContentType"] = contentType
	metadata["binaryEncoded"] = true
	return []byte(xmlData), metadata, warnings, nil
}

// formatAsHTML formats data as HTML
func (p *TestCaseAttachmentProcessor) formatAsHTML(
	data []byte,
	contentType string, 
	metadata map[string]interface{}, 
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	if strings.HasPrefix(contentType, "text/html") {
		// Already HTML, just return as is
		metadata["format"] = "HTML"
		metadata["alreadyFormatted"] = true
		return data, metadata, warnings, nil
	}

	// Convert text data to HTML
	if strings.HasPrefix(contentType, "text/") {
		htmlData := fmt.Sprintf("<div class=\"content\">%s</div>", escapeHTML(string(data)))
		metadata["format"] = "HTML"
		metadata["originalContentType"] = contentType
		return []byte(htmlData), metadata, warnings, nil
	}

	// Convert JSON to HTML
	if contentType == "application/json" {
		var jsonData interface{}
		if err := json.Unmarshal(data, &jsonData); err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to parse JSON: %v", err))
			htmlData := fmt.Sprintf("<div class=\"content\">%s</div>", escapeHTML(string(data)))
			metadata["format"] = "HTML"
			metadata["parseError"] = err.Error()
			return []byte(htmlData), metadata, warnings, nil
		}
		
		// JSON to HTML conversion
		htmlData := jsonToHTML(jsonData)
		metadata["format"] = "HTML"
		metadata["originalContentType"] = contentType
		metadata["convertedFromJSON"] = true
		return []byte(htmlData), metadata, warnings, nil
	}

	// For images, create HTML that embeds the image
	if strings.HasPrefix(contentType, "image/") {
		htmlData := fmt.Sprintf("<div class=\"image-container\"><img src=\"data:%s;base64,%s\" alt=\"Embedded Image\"></div>",
			contentType, base64.StdEncoding.EncodeToString(data))
		metadata["format"] = "HTML"
		metadata["originalContentType"] = contentType
		metadata["embeddedImage"] = true
		return []byte(htmlData), metadata, warnings, nil
	}

	// For binary data, just create a download link
	htmlData := fmt.Sprintf("<div class=\"binary-data\"><a href=\"#\" class=\"download-link\">Download Binary Data</a></div>")
	metadata["format"] = "HTML"
	metadata["originalContentType"] = contentType
	metadata["binaryReferenced"] = true
	return []byte(htmlData), metadata, warnings, nil
}

// formatAsMarkdown formats data as Markdown
func (p *TestCaseAttachmentProcessor) formatAsMarkdown(
	data []byte,
	contentType string, 
	metadata map[string]interface{}, 
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	if strings.HasPrefix(contentType, "text/markdown") {
		// Already Markdown, just return as is
		metadata["format"] = "Markdown"
		metadata["alreadyFormatted"] = true
		return data, metadata, warnings, nil
	}

	// Convert text data to Markdown
	if strings.HasPrefix(contentType, "text/") {
		mdData := fmt.Sprintf("# Content\n\n%s", string(data))
		metadata["format"] = "Markdown"
		metadata["originalContentType"] = contentType
		return []byte(mdData), metadata, warnings, nil
	}

	// Convert JSON to Markdown
	if contentType == "application/json" {
		var jsonData interface{}
		if err := json.Unmarshal(data, &jsonData); err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to parse JSON: %v", err))
			mdData := fmt.Sprintf("# Content\n\n```\n%s\n```", string(data))
			metadata["format"] = "Markdown"
			metadata["parseError"] = err.Error()
			return []byte(mdData), metadata, warnings, nil
		}
		
		// Format JSON as code block in Markdown
		prettyJSON, _ := json.MarshalIndent(jsonData, "", "  ")
		mdData := fmt.Sprintf("# JSON Content\n\n```json\n%s\n```", string(prettyJSON))
		metadata["format"] = "Markdown"
		metadata["originalContentType"] = contentType
		metadata["convertedFromJSON"] = true
		return []byte(mdData), metadata, warnings, nil
	}

	// For images, create Markdown that references the image
	if strings.HasPrefix(contentType, "image/") {
		mdData := fmt.Sprintf("# Image\n\n![Image](%s)\n\n*Image data embedded in binary format*", 
			"image." + getImageExtension(contentType))
		metadata["format"] = "Markdown"
		metadata["originalContentType"] = contentType
		metadata["referencesImage"] = true
		return []byte(mdData), metadata, warnings, nil
	}

	// For binary data, just create a reference
	mdData := fmt.Sprintf("# Binary Data\n\n*Binary data in %s format*", contentType)
	metadata["format"] = "Markdown"
	metadata["originalContentType"] = contentType
	metadata["binaryReferenced"] = true
	return []byte(mdData), metadata, warnings, nil
}

// formatAsJSON formats data as JSON
func (p *TestCaseAttachmentProcessor) formatAsJSON(
	data []byte,
	contentType string, 
	metadata map[string]interface{}, 
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	if contentType == "application/json" {
		// Already JSON, validate and return
		var jsonData interface{}
		if err := json.Unmarshal(data, &jsonData); err != nil {
			warnings = append(warnings, fmt.Sprintf("Invalid JSON data: %v", err))
			// Return wrapped in valid JSON
			jsonObj := map[string]interface{}{
				"data": string(data),
				"error": err.Error(),
				"valid": false,
			}
			jsonData, _ := json.MarshalIndent(jsonObj, "", "  ")
			metadata["format"] = "JSON"
			metadata["valid"] = false
			metadata["error"] = err.Error()
			return jsonData, metadata, warnings, nil
		}
		
		// Check if it's an object or array
		_, isObject := jsonData.(map[string]interface{})
		_, isArray := jsonData.([]interface{})
		
		if !isObject && !isArray {
			// Convert primitive values to an object
			jsonObj := map[string]interface{}{
				"value": jsonData,
			}
			jsonData, _ := json.MarshalIndent(jsonObj, "", "  ")
			metadata["format"] = "JSON"
			metadata["convertedPrimitive"] = true
			return jsonData, metadata, warnings, nil
		}
		
		// Already valid JSON object or array
		prettyJSON, _ := json.MarshalIndent(jsonData, "", "  ")
		metadata["format"] = "JSON"
		metadata["valid"] = true
		return prettyJSON, metadata, warnings, nil
	}

	// Convert text data to JSON
	if strings.HasPrefix(contentType, "text/") {
		// Try to parse as JSON first
		var jsonData interface{}
		if json.Unmarshal(data, &jsonData) == nil {
			// It's already valid JSON in a text file
			prettyJSON, _ := json.MarshalIndent(jsonData, "", "  ")
			metadata["format"] = "JSON"
			metadata["originalContentType"] = contentType
			metadata["parsedAsJSON"] = true
			return prettyJSON, metadata, warnings, nil
		}
		
		// Regular text, wrap in JSON
		jsonObj := map[string]interface{}{
			"content": string(data),
			"contentType": contentType,
		}
		jsonData, _ := json.MarshalIndent(jsonObj, "", "  ")
		metadata["format"] = "JSON"
		metadata["originalContentType"] = contentType
		metadata["wrappedText"] = true
		return jsonData, metadata, warnings, nil
	}

	// For binary data, encode and wrap in JSON
	jsonObj := map[string]interface{}{
		"data": base64.StdEncoding.EncodeToString(data),
		"encoding": "base64",
		"contentType": contentType,
		"format": "binary",
	}
	jsonData, _ := json.MarshalIndent(jsonObj, "", "  ")
	metadata["format"] = "JSON"
	metadata["originalContentType"] = contentType
	metadata["wrappedBinary"] = true
	metadata["encoding"] = "base64"
	return jsonData, metadata, warnings, nil
}

// processImage processes image data
func (p *TestCaseAttachmentProcessor) processImage(
	data []byte,
	contentType string,
	options *ProcessingOptions,
	metadata map[string]interface{},
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	// Record image metadata
	metadata["processedAs"] = "image"
	metadata["contentType"] = contentType
	
	// If not an image format we can process, return as is
	if !isProcessableImage(contentType) {
		warnings = append(warnings, fmt.Sprintf("Unprocessable image format: %s", contentType))
		metadata["processed"] = false
		return data, metadata, warnings, nil
	}
	
	// Check for resize option
	if options.ResizeImages {
		// Parse the image
		img, format, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to decode image: %v", err))
			metadata["decodingError"] = err.Error()
			metadata["processed"] = false
			return data, metadata, warnings, nil
		}
		
		// Get dimensions
		bounds := img.Bounds()
		width := bounds.Max.X - bounds.Min.X
		height := bounds.Max.Y - bounds.Min.Y
		
		metadata["originalWidth"] = width
		metadata["originalHeight"] = height
		metadata["format"] = format
		
		// Check if resize is needed
		maxWidth := options.MaxWidth
		maxHeight := options.MaxHeight
		
		if maxWidth <= 0 {
			maxWidth = 1920 // Default max width
		}
		if maxHeight <= 0 {
			maxHeight = 1080 // Default max height
		}
		
		if width > maxWidth || height > maxHeight {
			// Resize image logic would go here
			// For now, we'll just return the original since actual resizing
			// requires additional dependencies
			warnings = append(warnings, "Image resize not implemented, returning original")
			metadata["resizeAttempted"] = true
			metadata["targetWidth"] = maxWidth
			metadata["targetHeight"] = maxHeight
			metadata["processed"] = false
		} else {
			metadata["resizeNeeded"] = false
			metadata["processed"] = true
		}
	}
	
	// Return original data
	return data, metadata, warnings, nil
}

// processText processes text data
func (p *TestCaseAttachmentProcessor) processText(
	data []byte,
	contentType string,
	metadata map[string]interface{},
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	// Record text metadata
	metadata["processedAs"] = "text"
	metadata["contentType"] = contentType
	metadata["length"] = len(data)
	metadata["processed"] = true
	
	// Extract information based on content type
	if contentType == "text/csv" {
		// Count rows and columns for CSV
		rows := strings.Split(string(data), "\n")
		metadata["rows"] = len(rows)
		
		if len(rows) > 0 {
			columns := strings.Split(rows[0], ",")
			metadata["columns"] = len(columns)
		}
	} else if contentType == "text/html" {
		// Extract title from HTML
		titleRegex := regexp.MustCompile(`<title[^>]*>(.*?)</title>`)
		matches := titleRegex.FindSubmatch(data)
		if len(matches) > 1 {
			metadata["title"] = string(matches[1])
		}
	}
	
	// Return text unchanged
	return data, metadata, warnings, nil
}

// processJSON processes JSON data
func (p *TestCaseAttachmentProcessor) processJSON(
	data []byte,
	metadata map[string]interface{},
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	// Parse the JSON
	var jsonData interface{}
	if err := json.Unmarshal(data, &jsonData); err != nil {
		warnings = append(warnings, fmt.Sprintf("Invalid JSON: %v", err))
		metadata["processedAs"] = "text"
		metadata["valid"] = false
		metadata["error"] = err.Error()
		return data, metadata, warnings, nil
	}
	
	// Record JSON metadata
	metadata["processedAs"] = "json"
	metadata["valid"] = true
	
	// Check if it's an object
	if jsonObj, isObject := jsonData.(map[string]interface{}); isObject {
		metadata["type"] = "object"
		metadata["properties"] = len(jsonObj)
		
		// Check for specific properties that indicate the format
		if _, hasLinks := jsonObj["links"]; hasLinks {
			if _, hasTestCycle := jsonObj["test-cycle"]; hasTestCycle {
				metadata["format"] = "qtest-cycle"
			} else if _, hasTestCase := jsonObj["test-case"]; hasTestCase {
				metadata["format"] = "qtest-case"
			}
		} else if attachmentInfo, hasAttachmentInfo := jsonObj["attachmentInfo"].(map[string]interface{}); hasAttachmentInfo {
			if origin, hasOrigin := attachmentInfo["origin"].(string); hasOrigin {
				metadata["format"] = fmt.Sprintf("%s-attachment", origin)
			}
		}
	} else if jsonArr, isArray := jsonData.([]interface{}); isArray {
		metadata["type"] = "array"
		metadata["length"] = len(jsonArr)
	} else {
		metadata["type"] = "primitive"
	}
	
	// Format the JSON nicely
	prettyJSON, _ := json.MarshalIndent(jsonData, "", "  ")
	return prettyJSON, metadata, warnings, nil
}

// processPDF processes PDF data
func (p *TestCaseAttachmentProcessor) processPDF(
	data []byte,
	options *ProcessingOptions,
	metadata map[string]interface{},
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	// Record PDF metadata
	metadata["processedAs"] = "pdf"
	metadata["size"] = len(data)
	
	// In a real implementation, we would extract text and metadata from the PDF
	// But this would require additional dependencies
	warnings = append(warnings, "PDF processing not fully implemented, returning original")
	metadata["processed"] = false
	
	// Return PDF unchanged
	return data, metadata, warnings, nil
}

// processZip processes ZIP data
func (p *TestCaseAttachmentProcessor) processZip(
	data []byte,
	options *ProcessingOptions,
	metadata map[string]interface{},
	warnings []string,
) ([]byte, map[string]interface{}, []string, error) {
	// Record ZIP metadata
	metadata["processedAs"] = "zip"
	metadata["size"] = len(data)
	
	// In a real implementation, we would extract and analyze ZIP contents
	// But this would require additional dependencies
	warnings = append(warnings, "ZIP processing not fully implemented, returning original")
	metadata["processed"] = false
	
	// Return ZIP unchanged
	return data, metadata, warnings, nil
}

// getProcessedFileName returns the appropriate filename for processed attachment
func (p *TestCaseAttachmentProcessor) getProcessedFileName(originalFilename string, options *ProcessingOptions) string {
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
		case "JSON":
			ext = ".json"
		}
	} else if options.TargetProvider != "" {
		// Add provider indication to filename
		return fmt.Sprintf("%s_as_%s%s", baseName, options.TargetProvider, ext)
	}

	return baseName + "_processed" + ext
}

// getProcessedContentType returns the content type for processed attachment
func (p *TestCaseAttachmentProcessor) getProcessedContentType(originalType string, options *ProcessingOptions) string {
	// Change content type based on format if applicable
	if options.Format != "" {
		switch strings.ToUpper(options.Format) {
		case "XML":
			return "application/xml"
		case "HTML":
			return "text/html"
		case "MARKDOWN", "MD":
			return "text/markdown"
		case "JSON":
			return "application/json"
		}
	}

	return originalType
}

// Helper functions

// escapeXML escapes special characters for XML
func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

// escapeHTML escapes special characters for HTML
func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}

// jsonToXML converts JSON data to XML
func jsonToXML(data interface{}, nodeName string) string {
	switch v := data.(type) {
	case map[string]interface{}:
		result := fmt.Sprintf("<%s>", nodeName)
		for key, value := range v {
			result += jsonToXML(value, key)
		}
		result += fmt.Sprintf("</%s>", nodeName)
		return result
	case []interface{}:
		result := fmt.Sprintf("<%s>", nodeName)
		for i, item := range v {
			result += jsonToXML(item, fmt.Sprintf("item_%d", i))
		}
		result += fmt.Sprintf("</%s>", nodeName)
		return result
	case string:
		return fmt.Sprintf("<%s>%s</%s>", nodeName, escapeXML(v), nodeName)
	case nil:
		return fmt.Sprintf("<%s></%s>", nodeName, nodeName)
	default:
		return fmt.Sprintf("<%s>%v</%s>", nodeName, v, nodeName)
	}
}

// jsonToHTML converts JSON data to HTML
func jsonToHTML(data interface{}) string {
	switch v := data.(type) {
	case map[string]interface{}:
		result := "<dl class=\"json-object\">"
		for key, value := range v {
			result += fmt.Sprintf("<dt>%s</dt><dd>%s</dd>", escapeHTML(key), jsonToHTML(value))
		}
		result += "</dl>"
		return result
	case []interface{}:
		result := "<ol class=\"json-array\">"
		for _, item := range v {
			result += fmt.Sprintf("<li>%s</li>", jsonToHTML(item))
		}
		result += "</ol>"
		return result
	case string:
		return fmt.Sprintf("<span class=\"json-string\">%s</span>", escapeHTML(v))
	case nil:
		return "<span class=\"json-null\">null</span>"
	default:
		return fmt.Sprintf("<span class=\"json-value\">%v</span>", v)
	}
}

// getImageExtension returns the file extension for an image content type
func getImageExtension(contentType string) string {
	switch contentType {
	case "image/jpeg", "image/jpg":
		return "jpg"
	case "image/png":
		return "png"
	case "image/gif":
		return "gif"
	case "image/webp":
		return "webp"
	case "image/svg+xml":
		return "svg"
	default:
		return "img"
	}
}

// isProcessableImage checks if we can process this image type
func isProcessableImage(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/jpg", "image/png", "image/gif":
		return true
	default:
		return false
	}
}