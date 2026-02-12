package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"logreef/internal/db"
	"logreef/internal/middleware"
)

type IngestPayload struct {
	Timestamp string          `json:"timestamp,omitempty"`
	Service   string          `json:"service"`
	Host      string          `json:"host"`
	Level     string          `json:"level"`
	Message   string          `json:"message"`
	Raw       json.RawMessage `json:"raw,omitempty"`
}

type IngestHandler struct {
	Pool *db.Pool
}

func (h *IngestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var batch []IngestPayload
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		// Try single object
		var single IngestPayload
		if err2 := json.Unmarshal([]byte(err.Error()), &single); err2 != nil {
			http.Error(w, `{"error":"invalid JSON body"}`, http.StatusBadRequest)
			return
		}
		batch = []IngestPayload{single}
	}

	if len(batch) == 0 {
		http.Error(w, `{"error":"empty batch"}`, http.StatusBadRequest)
		return
	}

	if len(batch) > 1000 {
		http.Error(w, `{"error":"batch size exceeds 1000"}`, http.StatusRequestEntityTooLarge)
		return
	}

	inserted := 0
	for _, entry := range batch {
		ts := time.Now()
		if entry.Timestamp != "" {
			if parsed, err := time.Parse(time.RFC3339, entry.Timestamp); err == nil {
				ts = parsed
			}
		}

		level := entry.Level
		if level == "" {
			level = "info"
		}

		service := entry.Service
		if service == "" {
			service = "default"
		}

		host := entry.Host
		if host == "" {
			host = "unknown"
		}

		_, err := h.Pool.DB.Exec(r.Context(),
			`INSERT INTO logs (user_id, timestamp, service, host, level, message, raw_json)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			userID, ts, service, host, level, entry.Message, entry.Raw,
		)
		if err == nil {
			inserted++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]int{"accepted": inserted})
}
