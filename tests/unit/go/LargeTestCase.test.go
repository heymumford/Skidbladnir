package binary_processor_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/storage"
)

const (
	// 1MB of text
	oneMB = 1024 * 1024
	// 5MB of text
	fiveMB = 5 * 1024 * 1024
	// 10MB of text
	tenMB = 10 * 1024 * 1024
)

// generateLargeString creates a string of specified size
func generateLargeString(size int) string {
	// Create a pattern that's 1KB in size
	pattern := strings.Repeat("0123456789ABCDEF", 64) // 1KB

	// Repeat the pattern to reach the desired size
	repeats := size / len(pattern)
	return strings.Repeat(pattern, repeats)
}

// TestLargeTestCaseDescription tests handling of test cases with large descriptions
func TestLargeTestCaseDescription(t *testing.T) {
	// Create a storage and handler
	testStorage := storage.NewInMemoryTestCaseStorage()
	testHandler := handlers.NewTestCaseHandler(testStorage)

	// Set up router
	router := mux.NewRouter()
	testHandler.RegisterRoutes(router)

	// Track memory usage before the test
	var m1, m2 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// Test creating a test case with a large description (1MB)
	t.Run("Create 1MB Test Case", func(t *testing.T) {
		largeDescription := generateLargeString(oneMB)
		testCase := handlers.TestCase{
			Title:       "Large Test Case",
			Description: largeDescription,
			Status:      "DRAFT",
			Priority:    "MEDIUM",
		}

		testJSON, _ := json.Marshal(testCase)
		req, _ := http.NewRequest("POST", "/api/testcases", bytes.NewBuffer(testJSON))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Check the status code
		if status := rr.Code; status != http.StatusCreated {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusCreated)
		}

		// Parse the response
		var responseTestCase handlers.TestCase
		json.Unmarshal(rr.Body.Bytes(), &responseTestCase)

		// Verify the description length
		if len(responseTestCase.Description) != len(largeDescription) {
			t.Errorf("Description length mismatch: got %v want %v", len(responseTestCase.Description), len(largeDescription))
		}

		// Verify we can retrieve it
		req, _ = http.NewRequest("GET", "/api/testcases/"+responseTestCase.ID, nil)
		rr = httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	})

	// Check memory increase
	runtime.ReadMemStats(&m2)
	memoryIncrease := m2.Alloc - m1.Alloc
	t.Logf("Memory increase: %v bytes", memoryIncrease)

	// The memory increase should be at least the size of the test case description
	if memoryIncrease < uint64(oneMB) {
		t.Logf("WARNING: Memory increase is less than test case size, memory might be garbage collected")
	}
}

// TestPerformanceWithManyLargeTestCases tests performance with many large test cases
func TestPerformanceWithManyLargeTestCases(t *testing.T) {
	// Create a storage and handler
	testStorage := storage.NewInMemoryTestCaseStorage()
	testHandler := handlers.NewTestCaseHandler(testStorage)

	// Set up router
	router := mux.NewRouter()
	testHandler.RegisterRoutes(router)

	// Track memory usage before the test
	var m1, m2 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// Create 10 test cases with 1MB descriptions
	for i := 0; i < 10; i++ {
		largeDescription := generateLargeString(oneMB)
		testCase := handlers.TestCase{
			Title:       "Large Test Case",
			Description: largeDescription,
			Status:      "DRAFT",
			Priority:    "MEDIUM",
		}

		testJSON, _ := json.Marshal(testCase)
		req, _ := http.NewRequest("POST", "/api/testcases", bytes.NewBuffer(testJSON))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusCreated {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusCreated)
		}
	}

	// Test listing all test cases
	t.Run("List Many Large Test Cases", func(t *testing.T) {
		startTime := time.Now()

		req, _ := http.NewRequest("GET", "/api/testcases", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		elapsedTime := time.Since(startTime)

		// Check the status code
		if status := rr.Code; status != http.StatusOK {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// Parse the response
		var testCases []*handlers.TestCase
		json.Unmarshal(rr.Body.Bytes(), &testCases)

		// Verify the number of test cases
		if len(testCases) != 10 {
			t.Errorf("Expected 10 test cases, got %v", len(testCases))
		}

		t.Logf("Time to list 10 large test cases: %v", elapsedTime)
		
		// Performance assertion - should be reasonably fast
		if elapsedTime > time.Second*2 {
			t.Errorf("Listing test cases took too long: %v", elapsedTime)
		}
	})

	// Check memory increase
	runtime.ReadMemStats(&m2)
	memoryIncrease := m2.Alloc - m1.Alloc
	t.Logf("Memory increase: %v bytes", memoryIncrease)
}

// TestVeryLargeTestCaseHandling tests handling of extremely large test cases
func TestVeryLargeTestCaseHandling(t *testing.T) {
	// Create a storage and handler
	testStorage := storage.NewInMemoryTestCaseStorage()
	testHandler := handlers.NewTestCaseHandler(testStorage)

	// Set up router
	router := mux.NewRouter()
	testHandler.RegisterRoutes(router)

	// Test creating a test case with a very large description (10MB)
	t.Run("Create 10MB Test Case", func(t *testing.T) {
		largeDescription := generateLargeString(tenMB)
		testCase := handlers.TestCase{
			Title:       "Very Large Test Case",
			Description: largeDescription,
			Status:      "DRAFT",
			Priority:    "MEDIUM",
		}

		testJSON, _ := json.Marshal(testCase)
		req, _ := http.NewRequest("POST", "/api/testcases", bytes.NewBuffer(testJSON))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Check if we can handle it (should succeed but may take time)
		if status := rr.Code; status != http.StatusCreated {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusCreated)
		}
	})

	// Test processing a very large test case
	t.Run("Process 10MB Test Case", func(t *testing.T) {
		// First, get the ID of the test case we just created
		req, _ := http.NewRequest("GET", "/api/testcases", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		
		var testCases []*handlers.TestCase
		json.Unmarshal(rr.Body.Bytes(), &testCases)
		
		if len(testCases) == 0 {
			t.Fatal("No test cases found")
		}
		
		// Now try to process it
		testCaseID := testCases[0].ID
		processingOptions := map[string]interface{}{
			"format":       "JSON",
			"includeSteps": true,
			"exportImages": true,
		}
		
		optionsJSON, _ := json.Marshal(processingOptions)
		req, _ = http.NewRequest("POST", "/api/testcases/"+testCaseID+"/process", bytes.NewBuffer(optionsJSON))
		req.Header.Set("Content-Type", "application/json")
		
		rr = httptest.NewRecorder()
		startTime := time.Now()
		router.ServeHTTP(rr, req)
		elapsedTime := time.Since(startTime)
		
		// Check the status code
		if status := rr.Code; status != http.StatusOK {
			t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
		
		t.Logf("Time to process 10MB test case: %v", elapsedTime)
	})
}

// TestConcurrentLargeTestCaseProcessing tests processing multiple large test cases concurrently
func TestConcurrentLargeTestCaseProcessing(t *testing.T) {
	// Skip this test in short mode
	if testing.Short() {
		t.Skip("Skipping concurrent test in short mode")
	}

	// Create a storage and handler
	testStorage := storage.NewInMemoryTestCaseStorage()
	testHandler := handlers.NewTestCaseHandler(testStorage)

	// Set up router
	router := mux.NewRouter()
	testHandler.RegisterRoutes(router)

	// Create 5 test cases with 1MB descriptions
	var testCaseIDs []string
	for i := 0; i < 5; i++ {
		largeDescription := generateLargeString(oneMB)
		testCase := handlers.TestCase{
			Title:       "Concurrent Test Case",
			Description: largeDescription,
			Status:      "DRAFT",
			Priority:    "MEDIUM",
		}

		testJSON, _ := json.Marshal(testCase)
		req, _ := http.NewRequest("POST", "/api/testcases", bytes.NewBuffer(testJSON))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		var responseTestCase handlers.TestCase
		json.Unmarshal(rr.Body.Bytes(), &responseTestCase)
		testCaseIDs = append(testCaseIDs, responseTestCase.ID)
	}

	// Process them concurrently
	t.Run("Process Multiple Large Test Cases Concurrently", func(t *testing.T) {
		startTime := time.Now()
		
		done := make(chan bool)
		for _, id := range testCaseIDs {
			go func(testCaseID string) {
				processingOptions := map[string]interface{}{
					"format":       "JSON",
					"includeSteps": true,
					"exportImages": false,
				}
				
				optionsJSON, _ := json.Marshal(processingOptions)
				req, _ := http.NewRequest("POST", "/api/testcases/"+testCaseID+"/process", bytes.NewBuffer(optionsJSON))
				req.Header.Set("Content-Type", "application/json")
				
				rr := httptest.NewRecorder()
				router.ServeHTTP(rr, req)
				
				if status := rr.Code; status != http.StatusOK {
					t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
				}
				
				done <- true
			}(id)
		}
		
		// Wait for all goroutines to finish
		for i := 0; i < len(testCaseIDs); i++ {
			<-done
		}
		
		elapsedTime := time.Since(startTime)
		t.Logf("Time to process 5 large test cases concurrently: %v", elapsedTime)
	})
}