# Go Implementation

This directory contains the Go implementations of the interfaces defined in the `pkg/` directory.

## Directory Structure

- **binary-processor/**: Binary processor service
  - **handlers/**: Request handlers
  - **storage/**: Storage adapters
  - **processors/**: Binary processors

- **common/**: Shared Go utilities

## Build

To build the Go code:

```bash
go build ./...
```

## Test

To run the Go tests:

```bash
go test ./...
```