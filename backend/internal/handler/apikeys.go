package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	"logreef/internal/db"
	"logreef/internal/middleware"
)

type APIKeysHandler struct {
	Pool *db.Pool
}

type CreateKeyRequest struct {
	Label string `json:"label"`
}

// ServeHTTP handles GET (list) and POST (create) on /api/v1/api-keys
func (h *APIKeysHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

func (h *APIKeysHandler) list(w http.ResponseWriter, r *http.Request, userID string) {
	rows, err := h.Pool.DB.Query(r.Context(),
		`SELECT id, last4, label, created_at, revoked_at
		 FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Key struct {
		ID        string  `json:"id"`
		Last4     string  `json:"last4"`
		Label     string  `json:"label"`
		CreatedAt string  `json:"created_at"`
		RevokedAt *string `json:"revoked_at"`
	}

	var keys []Key
	for rows.Next() {
		var k Key
		var ts, rts interface{}
		if err := rows.Scan(&k.ID, &k.Last4, &k.Label, &ts, &rts); err != nil {
			continue
		}
		k.CreatedAt = fmt.Sprintf("%v", ts)
		if rts != nil {
			s := fmt.Sprintf("%v", rts)
			k.RevokedAt = &s
		}
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []Key{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(keys)
}

func (h *APIKeysHandler) create(w http.ResponseWriter, r *http.Request, userID string) {
	var req CreateKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON body"}`, http.StatusBadRequest)
		return
	}

	// Generate a random API key with "lr_" prefix
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		http.Error(w, `{"error":"failed to generate key"}`, http.StatusInternalServerError)
		return
	}
	rawKey := "lr_" + hex.EncodeToString(rawBytes)
	last4 := rawKey[len(rawKey)-4:]

	// Hash for storage
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var id string
	err := h.Pool.DB.QueryRow(r.Context(),
		`INSERT INTO api_keys (user_id, key_hash, last4, label)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, keyHash, last4, req.Label,
	).Scan(&id)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"id":      id,
		"key":     rawKey, // Only shown once
		"last4":   last4,
		"label":   req.Label,
		"warning": "Store this key securely. It will not be shown again.",
	})
}
