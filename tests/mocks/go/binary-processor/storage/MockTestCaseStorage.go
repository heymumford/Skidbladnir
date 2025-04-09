package storage

import (
	"errors"
	"sync"
	"time"

	"github.com/skidbladnir/binary-processor/handlers"
)

// MockTestCaseStorage implements TestCaseStorage interface for testing
type MockTestCaseStorage struct {
	testCases map[string]*handlers.TestCase
	mutex     sync.RWMutex
}

// NewMockTestCaseStorage creates a new mock storage with sample data
func NewMockTestCaseStorage() *MockTestCaseStorage {
	storage := &MockTestCaseStorage{
		testCases: make(map[string]*handlers.TestCase),
	}

	// Add some sample test cases
	now := time.Now()
	storage.testCases["tc-001"] = &handlers.TestCase{
		ID:          "tc-001",
		Title:       "Login Test Case",
		Description: "Verify user can login with valid credentials",
		Status:      "READY",
		Priority:    "HIGH",
		CreatedAt:   now.Add(-24 * time.Hour),
		UpdatedAt:   now.Add(-12 * time.Hour),
	}

	storage.testCases["tc-002"] = &handlers.TestCase{
		ID:          "tc-002",
		Title:       "Logout Test Case",
		Description: "Verify user can logout successfully",
		Status:      "READY",
		Priority:    "MEDIUM",
		CreatedAt:   now.Add(-24 * time.Hour),
		UpdatedAt:   now.Add(-12 * time.Hour),
	}

	return storage
}

// Save stores a test case in memory
func (s *MockTestCaseStorage) Save(testCase *handlers.TestCase) error {
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
func (s *MockTestCaseStorage) FindByID(id string) (*handlers.TestCase, error) {
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
func (s *MockTestCaseStorage) FindAll() ([]*handlers.TestCase, error) {
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
func (s *MockTestCaseStorage) Update(testCase *handlers.TestCase) error {
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
func (s *MockTestCaseStorage) Delete(id string) error {
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