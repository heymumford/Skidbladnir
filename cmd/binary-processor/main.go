package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Service   string    `json:"service"`
}

func main() {
	// Routes
	http.HandleFunc("/health", healthCheckHandler)
	http.HandleFunc("/", homeHandler)

	// Start server
	port := 8090
	log.Printf("Binary Processor service starting on port %d", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err \!= nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// healthCheckHandler returns the current service health
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	resp := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Service:   "binary-processor",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// homeHandler returns basic service information
func homeHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]string{
		"service": "Skidbladnir Binary Processor",
		"version": "0.1.0",
		"status":  "operational",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
