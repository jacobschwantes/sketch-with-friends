package main

import (
	"context"
	"encoding/json"
	"log/slog"

	"time"

	"github.com/mitchellh/mapstructure"
)

type Game interface {
	Run(ctx context.Context, r Room)
	EnqueueEvent(e *RoomEvent)
	State() *game
}

type Stroke struct {
	Points [][]int `json:"points"`
	Color  string  `json:"color"` // hex color
	Width  int     `json:"width"`
}

type game struct {
	Strokes       []Stroke `json:"strokes"`
	event         chan *RoomEvent
	RoundDuration int `json:"round_duration"`
	TotalRounds   int `json:"total_rounds"`
	CurrentRound  int `json:"current_round"`
}

func NewGame() Game {
	return &game{
		Strokes:       make([]Stroke, 0),
		event:         make(chan *RoomEvent, 5), // event buffer size of 5
		RoundDuration: 10,
		TotalRounds:   3,
		CurrentRound:  1,
	}
}

func (g *game) State() *game {
	return g
}

func (g *game) Run(ctx context.Context, r Room) {
	slog.Info("Game routine started: ")
	roundTimer := time.NewTimer(time.Duration(g.RoundDuration+7) * time.Second)
	judgeTimer := time.NewTimer(time.Duration(g.RoundDuration+2) * time.Second)

	defer func() {
		slog.Info("Game routine exited")
		roundTimer.Stop()
		judgeTimer.Stop()
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case e := <-g.event:
			g.handleEvent(e)
			json, err := json.Marshal(e)
			if err != nil {
				slog.Error("error marshalling event", "error", err)
			}
			// Rebroadcast the event to all players except the one who sent it
			r.BroadcastExcept(json, e.Player)
		case <-judgeTimer.C:
			slog.Info("judge timer")
		case <-roundTimer.C:
			slog.Info("round timer")

			if g.CurrentRound == g.TotalRounds {
				return
			}

			roundTimer.Reset(time.Duration(g.RoundDuration+7) * time.Second)
			judgeTimer.Reset(time.Duration(g.RoundDuration+2) * time.Second)
		}
	}
}

// This method is used by the room to pass events to the game
func (g *game) EnqueueEvent(e *RoomEvent) {
	select {
	case g.event <- e:
	default:
		// If the channel is full, instead of blocking, the event just gets dropped
		// Not sure if this is the best way to handle this, in practice it shouldn't happen
		slog.Warn("game event channel full, dropping event", "event", e)
	}
}

// Routes an event to a corresponding handler method
func (g *game) handleEvent(e *RoomEvent) {
	switch e.Type {
	case STROKE:
		g.handleNewStroke(e.Payload)
	case STROKE_POINT:
		g.handleStrokePoint(e.Payload)
	case CLEAR_STROKES:
		g.clearStrokes()
	case UNDO_STROKE:
		g.undoStroke()
	default:
		slog.Warn("unhandled event", "event", e)
	}
}

// Decodes a stroke payload and adds it to the strokes slice
func (g *game) handleNewStroke(payload interface{}) {
	stroke, err := decodePayload[Stroke](payload)
	if err != nil {
		slog.Warn("failed to decode stroke", "error", err)
		return
	}
	g.Strokes = append(g.Strokes, stroke)
}

// Decodes a stroke point payload and appends it to the most recent stroke
func (g *game) handleStrokePoint(payload interface{}) {
	point, err := decodePayload[[]int](payload)
	if err != nil {
		slog.Warn("failed to decode stroke point", "error", err)
		return
	}
	g.Strokes[len(g.Strokes)-1].Points = append(g.Strokes[len(g.Strokes)-1].Points, point)
}

// Removes all strokes from the strokes slice by creating a new empty slice
func (g *game) clearStrokes() {
	g.Strokes = make([]Stroke, 0)
}

// Removes the most recent stroke from the strokes slice
func (g *game) undoStroke() {
	if len(g.Strokes) > 0 {
		g.Strokes = g.Strokes[:len(g.Strokes)-1]
	}
}

// Generic helper function to decode event payloads into a target type
func decodePayload[T any](payload interface{}) (T, error) {
	var target T
	err := mapstructure.Decode(payload, &target)
	if err != nil {
		slog.Warn("failed to decode payload", "error", err)
		return target, err
	}
	return target, nil
}
