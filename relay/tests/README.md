# Nostr Channel Tests in Go

This directory contains Go tests for testing the Nostr relay's channel functionality. These tests verify the same behavior as the previous TypeScript tests but offer better concurrency handling and connection management.

## Prerequisites

- Go 1.21 or later
- A running Nostr relay on `ws://localhost:3334`

## Setup

1. Update the `admin` struct in `channel_test.go` with your actual admin keys from the `characters.ts` file:

```go
var admin = struct {
	PublicKey  string
	PrivateKey string
}{
	PublicKey:  "your_admin_pubkey",
	PrivateKey: "your_admin_privkey",
}
```

2. Download dependencies:

```bash
go mod download
```

## Running Tests

Run all tests:

```bash
go test -v
```

Run a specific test:

```bash
go test -v -run TestChannelCreation
```

## Benefits of Go Tests

- Better concurrency with Go's goroutines and channels
- Context-based timeouts for better test control
- Automatic resource cleanup with `defer`
- Built-in testing framework
- Simplified WebSocket connection management
- No "database locked" issues since these tests don't interact with the database directly

## Test Structure

Each test follows this pattern:

1. Set up a timeout context
2. Connect to the relay
3. Create and sign a Nostr event
4. Publish the event to the relay
5. Subscribe to receive events back
6. Verify the received events match expectations
7. Clean up connections

This approach provides a more reliable testing experience compared to the previous implementation. 