package storage_test

import (
	"testing"
	"time"

	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/storage"
)

func TestMockTestCaseStorage(t *testing.T) {
	// Create a new mock storage
	mockStorage := storage.NewMockTestCaseStorage()

	// Test FindAll
	t.Run("FindAll", func(t *testing.T) {
		testCases, err := mockStorage.FindAll()
		if err != nil {
			t.Fatalf("Failed to find all test cases: %v", err)
		}

		if len(testCases) != 2 {
			t.Errorf("Expected 2 test cases, got %d", len(testCases))
		}
	})

	// Test FindByID
	t.Run("FindByID", func(t *testing.T) {
		testCase, err := mockStorage.FindByID("tc-001")
		if err != nil {
			t.Fatalf("Failed to find test case by ID: %v", err)
		}

		if testCase == nil {
			t.Fatal("Test case not found")
		}

		if testCase.ID != "tc-001" {
			t.Errorf("Expected ID tc-001, got %s", testCase.ID)
		}

		if testCase.Title != "Login Test Case" {
			t.Errorf("Expected title 'Login Test Case', got %s", testCase.Title)
		}
	})

	// Test FindByID with non-existent ID
	t.Run("FindByID_NotFound", func(t *testing.T) {
		testCase, err := mockStorage.FindByID("non-existent")
		if err != nil {
			t.Fatalf("Expected no error for non-existent ID, got %v", err)
		}

		if testCase != nil {
			t.Error("Expected nil test case for non-existent ID")
		}
	})

	// Test Save
	t.Run("Save", func(t *testing.T) {
		newTestCase := &handlers.TestCase{
			ID:          "tc-003",
			Title:       "New Test Case",
			Description: "A new test case",
			Status:      "DRAFT",
			Priority:    "LOW",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		err := mockStorage.Save(newTestCase)
		if err != nil {
			t.Fatalf("Failed to save test case: %v", err)
		}

		// Verify it was saved
		savedTestCase, err := mockStorage.FindByID("tc-003")
		if err != nil {
			t.Fatalf("Failed to find saved test case: %v", err)
		}

		if savedTestCase == nil {
			t.Fatal("Saved test case not found")
		}

		if savedTestCase.ID != "tc-003" {
			t.Errorf("Expected ID tc-003, got %s", savedTestCase.ID)
		}

		if savedTestCase.Title != "New Test Case" {
			t.Errorf("Expected title 'New Test Case', got %s", savedTestCase.Title)
		}
	})

	// Test Update
	t.Run("Update", func(t *testing.T) {
		testCase, err := mockStorage.FindByID("tc-001")
		if err != nil {
			t.Fatalf("Failed to find test case by ID: %v", err)
		}

		if testCase == nil {
			t.Fatal("Test case not found")
		}

		// Update the test case
		testCase.Title = "Updated Test Case"
		testCase.Status = "UPDATED"

		err = mockStorage.Update(testCase)
		if err != nil {
			t.Fatalf("Failed to update test case: %v", err)
		}

		// Verify it was updated
		updatedTestCase, err := mockStorage.FindByID("tc-001")
		if err != nil {
			t.Fatalf("Failed to find updated test case: %v", err)
		}

		if updatedTestCase == nil {
			t.Fatal("Updated test case not found")
		}

		if updatedTestCase.Title != "Updated Test Case" {
			t.Errorf("Expected title 'Updated Test Case', got %s", updatedTestCase.Title)
		}

		if updatedTestCase.Status != "UPDATED" {
			t.Errorf("Expected status 'UPDATED', got %s", updatedTestCase.Status)
		}
	})

	// Test Delete
	t.Run("Delete", func(t *testing.T) {
		err := mockStorage.Delete("tc-002")
		if err != nil {
			t.Fatalf("Failed to delete test case: %v", err)
		}

		// Verify it was deleted
		deletedTestCase, err := mockStorage.FindByID("tc-002")
		if err != nil {
			t.Fatalf("Failed to check deleted test case: %v", err)
		}

		if deletedTestCase != nil {
			t.Error("Test case should have been deleted")
		}
	})
}