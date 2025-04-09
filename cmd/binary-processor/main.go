package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"github.com/skidbladnir/binary-processor/handlers"
	"github.com/skidbladnir/binary-processor/storage"
)

func main() {
	// Configure logger
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting Skidbladnir Binary Processor...")

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	// Create router
	router := mux.NewRouter()

	// Create in-memory storage
	testCaseStorage := storage.NewInMemoryTestCaseStorage()

	// Create test case handler
	testCaseHandler := handlers.NewTestCaseHandler(testCaseStorage)

	// Register routes
	testCaseHandler.RegisterRoutes(router)

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","timestamp":"` + time.Now().Format(time.RFC3339) + `"}`))
	}).Methods("GET")

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	// Use CORS middleware
	handler := c.Handler(router)

	// Start server
	log.Printf("Server starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}