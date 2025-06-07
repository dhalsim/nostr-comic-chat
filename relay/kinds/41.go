package kinds

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/fiatjaf/eventstore/sqlite3"
	"github.com/nbd-wtf/go-nostr"
)

func ValidateUpdateChannel(
	ctx context.Context,
	db *sqlite3.SQLite3Backend,
	event *nostr.Event,
) (reject bool, msg string) {
	if event.Kind != 41 {
		return false, ""
	}

	// get event tag
	eventTag := nostr.Tag{}
	for _, tag := range event.Tags {
		if tag[0] == "e" {
			eventTag = tag
			break
		}
	}

	eventId := eventTag[1]

	// we need to check if the channel is already created and it exists in the database
	var count int
	err := db.Get(&count, "SELECT COUNT(*) FROM event WHERE kind = 40 AND pubkey = ? AND id = ?", event.PubKey, eventId)
	if err != nil {
		return true, "41 channel select error: " + err.Error()
	}

	// if the channel is found in database, we still need to validate content
	if count == 0 {
		// Channel not in database, check remote relays
		relayToCheck := eventTag[2]
		_, err = getCreateEvent(ctx, event, relayToCheck, eventId)
		if err != nil {
			return true, "failed to get create event: " + err.Error()
		}
	}

	// try to unmarshal the update channel event content
	content := Channel{}
	if err := json.Unmarshal([]byte(event.Content), &content); err != nil {
		return true, "Invalid content"
	}

	// everything is fine
	return false, ""
}

func getCreateEvent(
	ctx context.Context,
	updateEvent *nostr.Event,
	relayToCheck string,
	eventId string,
) (*nostr.Event, error) {
	if relayToCheck != "" {
		relay := nostr.NewRelay(ctx, relayToCheck)

		if err := relay.Connect(ctx); err != nil {
			return nil, err
		}

		defer relay.Close()

		events, err := relay.QuerySync(ctx, nostr.Filter{
			Kinds:   []int{40},
			Authors: []string{updateEvent.PubKey},
			IDs:     []string{eventId},
		})
		if err != nil {
			return nil, err
		}

		if len(events) != 1 {
			return nil, errors.New("40 channel not found")
		}

		return events[0], nil
	} else {
		// next, check from bunch of relays
		relays := []string{
			"wss://purplepag.es",
			"wss://relay.nos.social",
			"wss://user.kindpag.es",
			"wss://relay.nostr.band",
			"wss://relay.damus.io",
			"wss://relay.snort.net",
		}

		pool := nostr.NewSimplePool(ctx)

		createEvent := pool.QuerySingle(ctx, relays, nostr.Filter{
			Kinds:   []int{40},
			Authors: []string{updateEvent.PubKey},
			IDs:     []string{eventId},
		})

		if createEvent == nil {
			return nil, errors.New("40 channel not found")
		}

		return createEvent.Event, nil
	}
}
