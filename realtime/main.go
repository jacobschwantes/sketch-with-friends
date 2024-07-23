package main

import (
	"context"
	"os"
	"os/signal"
	"log/slog"
	"time"

	"github.com/lmittmann/tint"
)

func init() {
	w := os.Stderr

	// set global logger with custom options
	slog.SetDefault(slog.New(
		tint.NewHandler(w, &tint.Options{
			Level:      slog.LevelInfo,
			TimeFormat: time.Kitchen,
		}),
	))
}

func run(ctx context.Context) error {
	slog.Info("Realtime server starting")
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt)
	defer cancel()

	port := os.Getenv("PORT")
	host := os.Getenv("HOST")

	if port == "" {
		slog.Warn("PORT not specified, defaulting to 8080")
		port = "8080"
	}
	if host == "" {
		slog.Warn("HOST not specified, defaulting to localhost")
		host = "localhost"
	}

	cfg := &HTTPConfig{
		Host: host,
		Port: port,
	}
	rm := NewRoomManager()
	go rm.Run(ctx)

	ServeHTTP(ctx, cfg, rm)
	return nil
}

func main() {
	ctx := context.Background()
	if err := run(ctx); err != nil {
		slog.Error("error running realtime server", "error", err)
		os.Exit(1)
	}
}
