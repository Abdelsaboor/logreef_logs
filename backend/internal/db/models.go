package db

import (
	"encoding/json"
	"time"
)

type User struct {
	ID          string    `json:"id"`
	WorkOSUserID string   `json:"workos_user_id"`
	Email       string    `json:"email"`
	CreatedAt   time.Time `json:"created_at"`
}

type APIKey struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	KeyHash   string     `json:"-"`
	Last4     string     `json:"last4"`
	Label     string     `json:"label"`
	CreatedAt time.Time  `json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at"`
}

type LogEntry struct {
	ID        int64           `json:"id"`
	UserID    string          `json:"user_id"`
	Timestamp time.Time       `json:"timestamp"`
	Service   string          `json:"service"`
	Host      string          `json:"host"`
	Level     string          `json:"level"`
	Message   string          `json:"message"`
	RawJSON   json.RawMessage `json:"raw_json,omitempty"`
}

type Alert struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	RuleType  string    `json:"rule_type"`
	RuleValue string    `json:"rule_value"`
	Channel   string    `json:"channel"`
	IsEnabled bool      `json:"is_enabled"`
	CreatedAt time.Time `json:"created_at"`
}

type AlertEvent struct {
	ID           string    `json:"id"`
	AlertID      string    `json:"alert_id"`
	MatchedLogID *int64    `json:"matched_log_id,omitempty"`
	TriggeredAt  time.Time `json:"triggered_at"`
	Status       string    `json:"status"`
	EmailTo      string    `json:"email_to"`
	ProviderID   *string   `json:"provider_id,omitempty"`
}

type Subscription struct {
	ID                  string     `json:"id"`
	UserID              string     `json:"user_id"`
	PolarCustomerID     string     `json:"polar_customer_id"`
	PolarSubscriptionID string     `json:"polar_subscription_id"`
	Status              string     `json:"status"`
	CurrentPeriodEnd    *time.Time `json:"current_period_end"`
	CreatedAt           time.Time  `json:"created_at"`
}
