package storage

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Attachment represents a test case attachment
type Attachment struct {
	ID          string    `json:"id"`
	FileName    string    `json:"fileName"`
	ContentType string    `json:"contentType"`
	Size        int64     `json:"size"`
	Data        string    `json:"data"` // Base64 encoded data
	CreatedAt   time.Time `json:"createdAt"`
}

// AttachmentStorage interface for storing and retrieving attachments
type AttachmentStorage interface {
	SaveAttachment(testCaseID string, attachment *Attachment) error
	GetAttachments(testCaseID string) ([]Attachment, error)
	GetAttachment(testCaseID string, attachmentID string) (*Attachment, error)
	DeleteAttachment(testCaseID string, attachmentID string) error
}

// InMemoryAttachmentStorage implements AttachmentStorage using in-memory storage
type InMemoryAttachmentStorage struct {
	attachments map[string]map[string]*Attachment // Map by testCaseID then by attachmentID
	mutex       sync.RWMutex
}

// NewInMemoryAttachmentStorage creates a new in-memory attachment storage
func NewInMemoryAttachmentStorage() *InMemoryAttachmentStorage {
	return &InMemoryAttachmentStorage{
		attachments: make(map[string]map[string]*Attachment),
	}
}

// SaveAttachment stores an attachment in memory
func (s *InMemoryAttachmentStorage) SaveAttachment(testCaseID string, attachment *Attachment) error {
	if testCaseID == "" {
		return fmt.Errorf("test case ID cannot be empty")
	}
	if attachment == nil {
		return fmt.Errorf("attachment cannot be nil")
	}
	
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if attachment.ID == "" {
		attachment.ID = uuid.New().String()
	}

	// Create map for test case if it doesn't exist
	if _, exists := s.attachments[testCaseID]; !exists {
		s.attachments[testCaseID] = make(map[string]*Attachment)
	}

	// Store a copy of the attachment
	s.attachments[testCaseID][attachment.ID] = &Attachment{
		ID:          attachment.ID,
		FileName:    attachment.FileName,
		ContentType: attachment.ContentType,
		Size:        attachment.Size,
		Data:        attachment.Data,
		CreatedAt:   attachment.CreatedAt,
	}

	return nil
}

// GetAttachments retrieves all attachments for a test case
func (s *InMemoryAttachmentStorage) GetAttachments(testCaseID string) ([]Attachment, error) {
	if testCaseID == "" {
		return nil, fmt.Errorf("test case ID cannot be empty")
	}

	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		attachments := make([]Attachment, 0, len(attachmentsMap))
		for _, attachment := range attachmentsMap {
			// Add a copy to prevent external modification
			attachments = append(attachments, Attachment{
				ID:          attachment.ID,
				FileName:    attachment.FileName,
				ContentType: attachment.ContentType,
				Size:        attachment.Size,
				Data:        attachment.Data,
				CreatedAt:   attachment.CreatedAt,
			})
		}
		return attachments, nil
	}

	return []Attachment{}, nil
}

// GetAttachment retrieves a specific attachment
func (s *InMemoryAttachmentStorage) GetAttachment(testCaseID string, attachmentID string) (*Attachment, error) {
	if testCaseID == "" {
		return nil, fmt.Errorf("test case ID cannot be empty")
	}
	if attachmentID == "" {
		return nil, fmt.Errorf("attachment ID cannot be empty")
	}

	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		if attachment, attachExists := attachmentsMap[attachmentID]; attachExists {
			// Return a copy to prevent external modification
			return &Attachment{
				ID:          attachment.ID,
				FileName:    attachment.FileName,
				ContentType: attachment.ContentType,
				Size:        attachment.Size,
				Data:        attachment.Data,
				CreatedAt:   attachment.CreatedAt,
			}, nil
		}
	}

	return nil, nil // Not found
}

// DeleteAttachment deletes an attachment
func (s *InMemoryAttachmentStorage) DeleteAttachment(testCaseID string, attachmentID string) error {
	if testCaseID == "" {
		return fmt.Errorf("test case ID cannot be empty")
	}
	if attachmentID == "" {
		return fmt.Errorf("attachment ID cannot be empty")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	if attachmentsMap, exists := s.attachments[testCaseID]; exists {
		if _, attachExists := attachmentsMap[attachmentID]; attachExists {
			delete(attachmentsMap, attachmentID)
			return nil
		}
	}

	return fmt.Errorf("attachment not found")
}