package kinds

import (
	"context"
	"encoding/json"

	"github.com/nbd-wtf/go-nostr"
)

type Channel struct {
	Name    string   `json:"name"`
	About   string   `json:"about"`
	Picture string   `json:"picture"`
	Relays  []string `json:"relays"`
}

func ValidateCreateChannel(ctx context.Context, event *nostr.Event) (reject bool, msg string) {
	if event.Kind != 40 {
		return false, ""
	}

	content := Channel{}
	if err := json.Unmarshal([]byte(event.Content), &content); err != nil {
		return true, "Invalid content"
	}

	return false, ""
}
