package storage

import (
	"errors"
	"sync"
	"time"

	"github.com/skidbladnir/binary-processor/handlers"
)

// InMemoryTestCaseStorage implements TestCaseStorage using in-memory storage
type InMemoryTestCaseStorage struct {
	testCases map[string]*handlers.TestCase
	mutex     sync.RWMutex
}

// NewInMemoryTestCaseStorage creates a new in-memory test case storage
func NewInMemoryTestCaseStorage() *InMemoryTestCaseStorage {
	return &InMemoryTestCaseStorage{
		testCases: make(map[string]*handlers.TestCase),
	}
}

// Save stores a test case in memory
func (s *InMemoryTestCaseStorage) Save(testCase *handlers.TestCase) error {
	if testCase == nil {
		return errors.New("test case cannot be nil")
	}

	if testCase.ID == "" {
		return errors.New("test case ID cannot be empty")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Save a copy to prevent external modification
	s.testCases[testCase.ID] = &handlers.TestCase{
		ID:          testCase.ID,
		Title:       testCase.Title,
		Description: testCase.Description,
		Status:      testCase.Status,
		Priority:    testCase.Priority,
		CreatedAt:   testCase.CreatedAt,
		UpdatedAt:   testCase.UpdatedAt,
	}

	return nil
}

// FindByID retrieves a test case by ID
func (s *InMemoryTestCaseStorage) FindByID(id string) (*handlers.TestCase, error) {
	if id == "" {
		return nil, errors.New("ID cannot be empty")
	}

	s.mutex.RLock()
	defer s.mutex.RUnlock()

	testCase, exists := s.testCases[id]
	if !exists {
		return nil, nil
	}

	// Return a copy to prevent external modification
	return &handlers.TestCase{
		ID:          testCase.ID,
		Title:       testCase.Title,
		Description: testCase.Description,
		Status:      testCase.Status,
		Priority:    testCase.Priority,
		CreatedAt:   testCase.CreatedAt,
		UpdatedAt:   testCase.UpdatedAt,
	}, nil
}

// FindAll retrieves all test cases
func (s *InMemoryTestCaseStorage) FindAll() ([]*handlers.TestCase, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	result := make([]*handlers.TestCase, 0, len(s.testCases))

	for _, testCase := range s.testCases {
		// Add a copy to prevent external modification
		result = append(result, &handlers.TestCase{
			ID:          testCase.ID,
			Title:       testCase.Title,
			Description: testCase.Description,
			Status:      testCase.Status,
			Priority:    testCase.Priority,
			CreatedAt:   testCase.CreatedAt,
			UpdatedAt:   testCase.UpdatedAt,
		})
	}

	return result, nil
}

// Update updates an existing test case
func (s *InMemoryTestCaseStorage) Update(testCase *handlers.TestCase) error {
	if testCase == nil {
		return errors.New("test case cannot be nil")
	}

	if testCase.ID == "" {
		return errors.New("test case ID cannot be empty")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Check if the test case exists
	_, exists := s.testCases[testCase.ID]
	if !exists {
		return errors.New("test case not found")
	}

	// Update the test case with a copy
	s.testCases[testCase.ID] = &handlers.TestCase{
		ID:          testCase.ID,
		Title:       testCase.Title,
		Description: testCase.Description,
		Status:      testCase.Status,
		Priority:    testCase.Priority,
		CreatedAt:   testCase.CreatedAt,
		UpdatedAt:   time.Now(), // Always update the timestamp
	}

	return nil
}

// Delete removes a test case by ID
func (s *InMemoryTestCaseStorage) Delete(id string) error {
	if id == "" {
		return errors.New("ID cannot be empty")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Check if the test case exists
	_, exists := s.testCases[id]
	if !exists {
		return errors.New("test case not found")
	}

	// Delete the test case
	delete(s.testCases, id)

	return nil
}