package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"logreef/internal/db"
	"logreef/internal/middleware"
)

type LogsHandler struct {
	Pool *db.Pool
}

// ServeHTTP handles GET /api/v1/logs/search
func (h *LogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	q := r.URL.Query()

	// Build query with filters
	where := []string{"user_id = $1"}
	args := []interface{}{userID}
	argIdx := 2

	if svc := q.Get("service"); svc != "" {
		where = append(where, fmt.Sprintf("service = $%d", argIdx))
		args = append(args, svc)
		argIdx++
	}

	if lvl := q.Get("level"); lvl != "" {
		where = append(where, fmt.Sprintf("level = $%d", argIdx))
		args = append(args, lvl)
		argIdx++
	}

	if search := q.Get("q"); search != "" {
		where = append(where, fmt.Sprintf("to_tsvector('english', message) @@ plainto_tsquery('english', $%d)", argIdx))
		args = append(args, search)
		argIdx++
	}

	if from := q.Get("from"); from != "" {
		where = append(where, fmt.Sprintf("timestamp >= $%d", argIdx))
		args = append(args, from)
		argIdx++
	}

	if to := q.Get("to"); to != "" {
		where = append(where, fmt.Sprintf("timestamp <= $%d", argIdx))
		args = append(args, to)
		argIdx++
	}

	limit := 100
	if l := q.Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 1000 {
			limit = parsed
		}
	}

	offset := 0
	if o := q.Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	query := fmt.Sprintf(
		`SELECT id, timestamp, service, host, level, message, raw_json
		 FROM logs WHERE %s
		 ORDER BY timestamp DESC
		 LIMIT %d OFFSET %d`,
		strings.Join(where, " AND "), limit, offset,
	)

	rows, err := h.Pool.DB.Query(r.Context(), query, args...)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type LogEntry struct {
		ID        int64           `json:"id"`
		Timestamp string          `json:"timestamp"`
		Service   string          `json:"service"`
		Host      string          `json:"host"`
		Level     string          `json:"level"`
		Message   string          `json:"message"`
		RawJSON   json.RawMessage `json:"raw_json,omitempty"`
	}

	var results []LogEntry
	for rows.Next() {
		var entry LogEntry
		var ts interface{}
		if err := rows.Scan(&entry.ID, &ts, &entry.Service, &entry.Host, &entry.Level, &entry.Message, &entry.RawJSON); err != nil {
			continue
		}
		entry.Timestamp = fmt.Sprintf("%v", ts)
		results = append(results, entry)
	}

	if results == nil {
		results = []LogEntry{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":   results,
		"count":  len(results),
		"limit":  limit,
		"offset": offset,
	})
}
