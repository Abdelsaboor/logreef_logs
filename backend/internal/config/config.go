package config

import "os"

type Config struct {
	Port            string
	DatabaseURL     string
	ValkeyURL       string
	ResendAPIKey    string
	WorkOSClientID  string
	WorkOSAPIKey    string
	PolarWebhookSecret string
	PolarAPIKey     string
	JWTSecret       string
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/logreef?sslmode=disable"),
		ValkeyURL:       getEnv("VALKEY_URL", "localhost:6379"),
		ResendAPIKey:    getEnv("RESEND_API_KEY", ""),
		WorkOSClientID:  getEnv("WORKOS_CLIENT_ID", ""),
		WorkOSAPIKey:    getEnv("WORKOS_API_KEY", ""),
		PolarWebhookSecret: getEnv("POLAR_WEBHOOK_SECRET", ""),
		PolarAPIKey:     getEnv("POLAR_API_KEY", ""),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
