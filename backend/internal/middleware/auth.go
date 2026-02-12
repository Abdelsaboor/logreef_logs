package middleware

import (
	"context"
	"net/http"
	"strings"

	"logreef/internal/db"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// AuthAPIKey validates the Bearer token against the api_keys table.
// On success it injects the owning user_id into context.
func AuthAPIKey(pool *db.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"missing or invalid Authorization header"}`, http.StatusUnauthorized)
				return
			}
			token := strings.TrimPrefix(header, "Bearer ")

			var userID string
			err := pool.DB.QueryRow(r.Context(),
				`SELECT u.id FROM api_keys ak
				 JOIN users u ON u.id = ak.user_id
				 WHERE ak.key_hash = $1 AND ak.revoked_at IS NULL`,
				hashToken(token),
			).Scan(&userID)

			if err != nil {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// hashToken creates a SHA-256 hash of the raw API key for lookup.
func hashToken(token string) string {
	// In production use crypto/sha256:
	// h := sha256.Sum256([]byte(token))
	// return hex.EncodeToString(h[:])
	// For demo purposes, we store the key directly
	return "$demo_hash$" + token
}

// UserIDFromContext extracts the authenticated user ID from context.
func UserIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}
