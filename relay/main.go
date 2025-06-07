package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"nostr-relay/kinds"

	"github.com/fiatjaf/eventstore/sqlite3"
	"github.com/fiatjaf/khatru"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	// Set up logging to include timestamps
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Printf("Starting Nostr Comic Chat Relay...")

	// Log the database path for diagnostic purposes
	dbPath := "./db.sqlite"
	absPath, err := filepath.Abs(dbPath)
	if err == nil {
		log.Printf("Using database at: %s (absolute: %s)", dbPath, absPath)
	} else {
		log.Printf("Using database at: %s (could not resolve absolute path)", dbPath)
	}

	db := sqlite3.SQLite3Backend{
		DatabaseURL: dbPath,
	}

	// Add more diagnostic information for initialization
	log.Printf("Initializing database connection...")
	if err := db.Init(); err != nil {
		log.Printf("Database initialization error: %v", err)
		panic(err)
	}
	log.Printf("Database initialized successfully")

	relay := khatru.NewRelay()

	// Add connection logging
	relay.OnConnect = append(relay.OnConnect, func(ctx context.Context) {
		log.Printf("New client connected")
	})

	relay.OnDisconnect = append(relay.OnDisconnect, func(ctx context.Context) {
		log.Printf("Client disconnected")
	})

	// Add event logging
	relay.OnEventSaved = append(relay.OnEventSaved, func(ctx context.Context, event *nostr.Event) {
		log.Printf("Event saved: %s (kind: %d)", event.ID, event.Kind)
	})

	relay.OnEphemeralEvent = append(relay.OnEphemeralEvent, func(ctx context.Context, event *nostr.Event) {
		log.Printf("Ephemeral event received: %s (kind: %d)", event.ID, event.Kind)
	})

	// Set up storage handlers with detailed logging
	relay.StoreEvent = append(relay.StoreEvent, func(ctx context.Context, event *nostr.Event) error {
		log.Printf("Attempting to store event: %s (kind: %d)", event.ID, event.Kind)
		startTime := time.Now()

		err := db.SaveEvent(ctx, event)

		duration := time.Since(startTime)
		if err != nil {
			log.Printf("Error storing event %s: %v (took %v)", event.ID, err, duration)
		} else {
			log.Printf("Successfully stored event %s (took %v)", event.ID, duration)
		}

		return err
	})

	relay.QueryEvents = append(relay.QueryEvents, db.QueryEvents)
	relay.CountEvents = append(relay.CountEvents, db.CountEvents)
	relay.DeleteEvent = append(relay.DeleteEvent, db.DeleteEvent)
	relay.ReplaceEvent = append(relay.ReplaceEvent, db.ReplaceEvent)

	relay.RejectEvent = append(
		relay.RejectEvent,
		kinds.ValidateCreateChannel,
		func(ctx context.Context, event *nostr.Event) (bool, string) {
			return kinds.ValidateUpdateChannel(ctx, &db, event)
		},
	)

	fmt.Println("Nostr Comic Chat Relay running on :3334")
	if err := http.ListenAndServe(":3334", relay); err != nil {
		log.Fatal(err)
	}
}
