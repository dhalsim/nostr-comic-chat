package tests

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"testing"
	"time"

	"github.com/nbd-wtf/go-nostr"
	"github.com/stretchr/testify/assert"
)

const (
	RelayURL = "ws://localhost:3334"
	// Increase test timeout
	TestTimeout = 60 * time.Second
)

// Admin keypair for testing
var admin = struct {
	PublicKey  string
	PrivateKey string
}{
	// Replace these with your actual admin keys from characters.ts
	PublicKey:  "d72615ac2ccd79b06962b0dd6243d8112b6939612c01f277931a428746a77297",
	PrivateKey: "8b81834146b9500c5551398bf6a79a30db892587b256dc09a875bec8fa5331af",
}

// TestEvents keeps track of published events for cleanup
var TestEvents = struct {
	Events []string
}{
	Events: make([]string, 0),
}

// publishEvent publishes an event and tracks its ID for later cleanup
func publishEvent(ctx context.Context, relay *nostr.Relay, ev nostr.Event) error {
	startTime := time.Now()
	err := relay.Publish(ctx, ev)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("Failed to publish event: %v (after %v)", err, duration)
		return err
	}

	log.Printf("Successfully published event %s in %v", ev.ID, duration)
	TestEvents.Events = append(TestEvents.Events, ev.ID)
	return nil
}

// cleanupTestEvents sends deletion requests for all test events
func cleanupTestEvents(ctx context.Context, relay *nostr.Relay) {
	if len(TestEvents.Events) == 0 {
		log.Printf("No test events to clean up")
		return
	}

	log.Printf("Cleaning up %d test events", len(TestEvents.Events))

	// Create tags for each event to delete
	tags := nostr.Tags{}
	for _, eventID := range TestEvents.Events {
		tags = append(tags, []string{"e", eventID})
	}

	// Add kind tags (40 and 41 for channel events)
	tags = append(tags, []string{"k", "40"})
	tags = append(tags, []string{"k", "41"})

	// Create the deletion request event (kind 5)
	delEvent := nostr.Event{
		Kind:      5, // NIP-09 deletion request
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Tags:      tags,
		Content:   "Cleanup of test events",
	}

	// Sign the event
	err := delEvent.Sign(admin.PrivateKey)
	if err != nil {
		log.Printf("Failed to sign deletion event: %v", err)
		return
	}

	// Publish the deletion request
	err = relay.Publish(ctx, delEvent)
	if err != nil {
		log.Printf("Failed to publish deletion request: %v", err)
		return
	}

	log.Printf("Successfully published deletion request for %d events", len(TestEvents.Events))
	// Reset the events list
	TestEvents.Events = make([]string, 0)
}

func TestMain(m *testing.M) {
	// Setup logging
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Println("======= Starting Nostr Channel Tests =======")

	// Run tests
	exitCode := m.Run()

	// Try to clean up any remaining test events
	if len(TestEvents.Events) > 0 {
		log.Printf("Attempting final cleanup of %d remaining test events", len(TestEvents.Events))

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		relay, err := nostr.RelayConnect(ctx, RelayURL)
		if err != nil {
			log.Printf("Failed to connect to relay for cleanup: %v", err)
		} else {
			cleanupTestEvents(ctx, relay)
			relay.Close()
		}
	}

	log.Println("======= Completed Nostr Channel Tests =======")
	os.Exit(exitCode)
}

func TestChannelCreation(t *testing.T) {
	log.Printf("Starting TestChannelCreation")

	// Set timeout for the entire test
	ctx, cancel := context.WithTimeout(context.Background(), TestTimeout)
	defer cancel()

	// Connect to relay
	log.Printf("Connecting to relay at %s", RelayURL)
	relay, err := nostr.RelayConnect(ctx, RelayURL)
	if err != nil {
		t.Fatalf("Failed to connect to relay: %v", err)
	}
	defer func() {
		// Clean up test events before closing connection
		cleanupTestEvents(ctx, relay)
		log.Printf("Closing relay connection")
		relay.Close()
	}()
	log.Printf("Successfully connected to relay")

	// Channel metadata
	channelMetadata := map[string]interface{}{
		"name":    "Demo Channel",
		"about":   "A test channel.",
		"picture": "https://robohash.org/demo-channel?set=set4&size=200x200",
		"relays":  []string{RelayURL},
	}

	// Serialize channel metadata to JSON
	content, err := json.Marshal(channelMetadata)
	if err != nil {
		t.Fatalf("Failed to marshal channel metadata: %v", err)
	}

	// Create channel event (kind 40)
	ev := nostr.Event{
		Kind:      40,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Tags:      nostr.Tags{{"comic-chat", "v0.0.1"}},
		Content:   string(content),
	}

	// Sign the event
	err = ev.Sign(admin.PrivateKey)
	if err != nil {
		t.Fatalf("Failed to sign event: %v", err)
	}

	log.Printf("Publishing event to relay: %s", ev.ID)
	err = publishEvent(ctx, relay, ev)
	if err != nil {
		t.Fatalf("Failed to publish event: %v", err)
	}

	// Subscribe to receive the event back
	log.Printf("Creating subscription for kind 40 events from author %s", admin.PublicKey)
	filters := []nostr.Filter{{
		Kinds:   []int{40},
		Authors: []string{admin.PublicKey},
	}}

	log.Printf("Subscribing to relay with filter: %+v", filters)
	sub, err := relay.Subscribe(ctx, filters)
	if err != nil {
		t.Fatalf("Failed to subscribe: %v", err)
	}
	defer sub.Unsub()

	// Wait for the event or timeout
	log.Printf("Waiting for events...")
	select {
	case ev := <-sub.Events:
		log.Printf("Received event: %s", ev.ID)
		// Parse the channel metadata
		var receivedMetadata map[string]interface{}
		err := json.Unmarshal([]byte(ev.Content), &receivedMetadata)
		if err != nil {
			t.Fatalf("Failed to unmarshal received content: %v", err)
		}

		// Assert the channel properties
		assert.Equal(t, "Demo Channel", receivedMetadata["name"])
		assert.Equal(t, "A test channel.", receivedMetadata["about"])
		assert.Equal(t, "https://robohash.org/demo-channel?set=set4&size=200x200", receivedMetadata["picture"])
		assert.Equal(t, []interface{}{RelayURL}, receivedMetadata["relays"])
		log.Printf("Successfully verified channel creation event")

	case <-ctx.Done():
		t.Fatal("Timeout waiting for channel creation event")
	}
}

func TestChannelUpdate(t *testing.T) {
	log.Printf("Starting TestChannelUpdate")

	// Set timeout for the entire test
	ctx, cancel := context.WithTimeout(context.Background(), TestTimeout)
	defer cancel()

	// Connect to relay
	log.Printf("Connecting to relay at %s", RelayURL)
	relay, err := nostr.RelayConnect(ctx, RelayURL)
	if err != nil {
		t.Fatalf("Failed to connect to relay: %v", err)
	}
	defer func() {
		// Clean up test events before closing connection
		cleanupTestEvents(ctx, relay)
		log.Printf("Closing relay connection")
		relay.Close()
	}()
	log.Printf("Successfully connected to relay")

	// Updated channel metadata
	channelMetadata := map[string]interface{}{
		"name":    "Demo Channel",
		"about":   "A test channel. Updated.",
		"picture": "https://robohash.org/demo-channel?set=set4&size=200x200",
		"relays":  []string{RelayURL},
	}

	// Serialize channel metadata to JSON
	content, err := json.Marshal(channelMetadata)
	if err != nil {
		t.Fatalf("Failed to marshal channel metadata: %v", err)
	}

	// Create channel update event (kind 41)
	ev := nostr.Event{
		Kind:      41,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Tags:      nostr.Tags{{"comic-chat", "v0.0.2"}},
		Content:   string(content),
	}

	// Sign the event
	err = ev.Sign(admin.PrivateKey)
	if err != nil {
		t.Fatalf("Failed to sign event: %v", err)
	}

	log.Printf("Publishing event to relay: %s", ev.ID)
	err = publishEvent(ctx, relay, ev)
	if err != nil {
		t.Fatalf("Failed to publish event: %v", err)
	}

	// Subscribe to receive the event back
	log.Printf("Creating subscription for kind 41 events from author %s", admin.PublicKey)
	filters := []nostr.Filter{{
		Kinds:   []int{41},
		Authors: []string{admin.PublicKey},
	}}

	log.Printf("Subscribing to relay with filter: %+v", filters)
	sub, err := relay.Subscribe(ctx, filters)
	if err != nil {
		t.Fatalf("Failed to subscribe: %v", err)
	}
	defer sub.Unsub()

	// Wait for the event or timeout
	log.Printf("Waiting for events...")
	select {
	case ev := <-sub.Events:
		log.Printf("Received event: %s", ev.ID)
		// Parse the channel metadata
		var receivedMetadata map[string]interface{}
		err := json.Unmarshal([]byte(ev.Content), &receivedMetadata)
		if err != nil {
			t.Fatalf("Failed to unmarshal received content: %v", err)
		}

		// Assert the updated properties
		assert.Equal(t, "A test channel. Updated.", receivedMetadata["about"])

		// Check for the specific tag
		foundTag := false
		for _, tag := range ev.Tags {
			if len(tag) >= 2 && tag[0] == "comic-chat" && tag[1] == "v0.0.2" {
				foundTag = true
				break
			}
		}
		assert.True(t, foundTag, "Expected tag ['comic-chat', 'v0.0.2'] not found")
		log.Printf("Successfully verified channel update event")

	case <-ctx.Done():
		t.Fatal("Timeout waiting for channel update event")
	}
}
