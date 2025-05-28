package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/fiatjaf/eventstore/sqlite3"
	"github.com/fiatjaf/khatru"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	db := sqlite3.SQLite3Backend{
		DatabaseURL: "./db.sqlite",
	}
	if err := db.Init(); err != nil {
		panic(err)
	}

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

	// Set up storage handlers
	relay.StoreEvent = append(relay.StoreEvent, func(ctx context.Context, event *nostr.Event) error {
		log.Printf("Event saved: %s (kind: %d)", event.ID, event.Kind)

		return db.SaveEvent(ctx, event)
	})
	relay.QueryEvents = append(relay.QueryEvents, db.QueryEvents)
	relay.CountEvents = append(relay.CountEvents, db.CountEvents)
	relay.DeleteEvent = append(relay.DeleteEvent, db.DeleteEvent)
	relay.ReplaceEvent = append(relay.ReplaceEvent, db.ReplaceEvent)

	fmt.Println("Nostr Comic Chat Relay running on :3334")
	if err := http.ListenAndServe(":3334", relay); err != nil {
		log.Fatal(err)
	}
}
