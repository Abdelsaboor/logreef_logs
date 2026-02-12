package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"logreef/internal/db"
	"logreef/internal/middleware"
)

type AlertsHandler struct {
	Pool *db.Pool
}

type CreateAlertRequest struct {
	Name     string `json:"name"`
	RuleType string `json:"rule_type"`
	RuleValue string `json:"rule_value"`
	Channel  string `json:"channel"`
}

// ServeHTTP handles GET and POST on /api/v1/alerts
func (h *AlertsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	switch r.Method {
	case http.MethodGet:
		h.list(w, r, userID)
	case http.MethodPost:
		h.create(w, r, userID)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func (h *AlertsHandler) list(w http.ResponseWriter, r *http.Request, userID string) {
	rows, err := h.Pool.DB.Query(r.Context(),
		`SELECT id, name, rule_type, rule_value, channel, is_enabled, created_at
		 FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Alert struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		RuleType  string `json:"rule_type"`
		RuleValue string `json:"rule_value"`
		Channel   string `json:"channel"`
		IsEnabled bool   `json:"is_enabled"`
		CreatedAt string `json:"created_at"`
	}

	var alerts []Alert
	for rows.Next() {
		var a Alert
		var ts interface{}
		if err := rows.Scan(&a.ID, &a.Name, &a.RuleType, &a.RuleValue, &a.Channel, &a.IsEnabled, &ts); err != nil {
			continue
		}
		a.CreatedAt = fmt.Sprintf("%v", ts)
		alerts = append(alerts, a)
	}
	if alerts == nil {
		alerts = []Alert{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}

func (h *AlertsHandler) create(w http.ResponseWriter, r *http.Request, userID string) {
	var req CreateAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.RuleType == "" || req.RuleValue == "" {
		http.Error(w, `{"error":"name, rule_type, and rule_value are required"}`, http.StatusBadRequest)
		return
	}

	validTypes := map[string]bool{"KEYWORD_CONTAINS": true, "VOLUME_THRESHOLD": true}
	if !validTypes[strings.ToUpper(req.RuleType)] {
		http.Error(w, `{"error":"rule_type must be KEYWORD_CONTAINS or VOLUME_THRESHOLD"}`, http.StatusBadRequest)
		return
	}

	channel := req.Channel
	if channel == "" {
		channel = "EMAIL"
	}

	var id string
	err := h.Pool.DB.QueryRow(r.Context(),
		`INSERT INTO alerts (user_id, name, rule_type, rule_value, channel)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID, req.Name, strings.ToUpper(req.RuleType), req.RuleValue, channel,
	).Scan(&id)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}
