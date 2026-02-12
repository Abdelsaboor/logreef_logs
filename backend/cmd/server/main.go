package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/logreef/logreef/backend/internal/cache"
	"github.com/logreef/logreef/backend/internal/config"
	"github.com/logreef/logreef/backend/internal/db"
	"github.com/logreef/logreef/backend/internal/email"
	"github.com/logreef/logreef/backend/internal/handler"
	"github.com/logreef/logreef/backend/internal/middleware"
	"github.com/logreef/logreef/backend/internal/worker"
)

func main() {
	cfg := config.Load()

	// Database
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Cache layers
	mokeCache := cache.NewMoke(1000, 30*time.Second)
	valkeyClient, err := cache.NewValkey(cfg.ValkeyURL)
	if err != nil {
		log.Printf("WARN: valkey connection failed, running without distributed cache: %v", err)
	}

	cacheLayer := cache.NewTiered(mokeCache, valkeyClient)

	// Email
	emailClient := email.NewResendClient(cfg.ResendAPIKey)

	// Handlers
	h := handler.New(pool, cacheLayer, emailClient, cfg)

	// Router
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth
	mux.HandleFunc("GET /api/v1/me", middleware.RequireAuth(cfg, h.GetMe))
	mux.HandleFunc("POST /api/v1/logout", middleware.RequireAuth(cfg, h.Logout))

	// API Keys
	mux.HandleFunc("POST /api/v1/api-keys", middleware.RequireAuth(cfg, h.CreateAPIKey))
	mux.HandleFunc("GET /api/v1/api-keys", middleware.RequireAuth(cfg, h.ListAPIKeys))
	mux.HandleFunc("POST /api/v1/api-keys/{id}/revoke", middleware.RequireAuth(cfg, h.RevokeAPIKey))

	// Ingestion (API key auth)
	mux.HandleFunc("POST /api/v1/ingest", middleware.RequireAPIKey(pool, middleware.RateLimit(cacheLayer, h.IngestLogs)))

	// Search & Viz
	mux.HandleFunc("GET /api/v1/logs/search", middleware.RequireAuth(cfg, h.SearchLogs))
	mux.HandleFunc("GET /api/v1/logs/volume", middleware.RequireAuth(cfg, h.LogVolume))

	// Alerts
	mux.HandleFunc("POST /api/v1/alerts", middleware.RequireAuth(cfg, h.CreateAlert))
	mux.HandleFunc("GET /api/v1/alerts", middleware.RequireAuth(cfg, h.ListAlerts))
	mux.HandleFunc("PATCH /api/v1/alerts/{id}", middleware.RequireAuth(cfg, h.UpdateAlert))
	mux.HandleFunc("DELETE /api/v1/alerts/{id}", middleware.RequireAuth(cfg, h.DeleteAlert))

	// Billing
	mux.HandleFunc("POST /api/v1/billing/checkout-session", middleware.RequireAuth(cfg, h.CreateCheckoutSession))
	mux.HandleFunc("POST /api/v1/billing/webhook", h.PolarWebhook)
	mux.HandleFunc("GET /api/v1/billing/status", middleware.RequireAuth(cfg, h.BillingStatus))

	// Middleware stack
	wrapped := middleware.Chain(mux,
		middleware.CORS,
		middleware.Logging,
		middleware.Recovery,
	)

	// Background worker
	w := worker.New(pool, cacheLayer, emailClient)
	go w.Start(context.Background())

	// Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      wrapped,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("LogReef API listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
