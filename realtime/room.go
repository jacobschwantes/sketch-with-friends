package main

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/gorilla/websocket"
)

type Room interface {
	Player(userID string) Player
	Players() []*PlayerInfo
	Close()
	Connect(conn *websocket.Conn, role PlayerRole, name string) error
	Run(rm RoomManager)
	Broadcast(msg []byte)
	BroadcastExcept(msg []byte, excludePlayer Player)
}

type RoomStatus string

const (
	WAITING  RoomStatus = "WAITING"
	PLAYING  RoomStatus = "PLAYING"
	FINISHED RoomStatus = "FINISHED"
)

type RoomState struct {
	Status  RoomStatus `json:"status,omitempty"`
	Code    string     `json:"code,omitempty"`
	Players []Player   `json:"players,omitempty"`
	Strokes []Stroke   `json:"strokes,omitempty"`
}

type RoomEventType string

const (
	START_GAME    RoomEventType = "START_GAME"
	STATE         RoomEventType = "STATE"
	STROKE        RoomEventType = "STROKE"
	STROKE_POINT  RoomEventType = "STROKE_POINT"
	CLEAR_STROKES RoomEventType = "CLEAR_STROKES"
	UNDO_STROKE   RoomEventType = "UNDO_STROKE"
)

type RoomEvent struct {
	Type    RoomEventType `json:"type"`
	Payload interface{}   `json:"payload"`
	Player  Player
}

type room struct {
	code       string
	players    map[Player]*client
	broadcast  chan []byte
	connect    chan *client
	disconnect chan *client
	event      chan *RoomEvent
	game       Game
	status     RoomStatus
	cancel     context.CancelFunc
}

type RoomInfo struct {
	Status  RoomStatus    `json:"status"`
	Code    string        `json:"code"`
	Players []*PlayerInfo `json:"players"`
	Strokes []*Stroke     `json:"strokes"`
}

func (r *room) Info() *RoomInfo {
	return &RoomInfo{
		Status:  r.status,
		Code:    r.code,
		Players: r.Players(),
		// Strokes: r.game.Strokes(),
	}
}

func NewRoom(code string) Room {
	return &room{
		code:       code,
		status:     WAITING,
		players:    make(map[Player]*client),
		broadcast:  make(chan []byte),
		connect:    make(chan *client),
		disconnect: make(chan *client),
		event:      make(chan *RoomEvent),
	}
}

// ? tbh this really should just be a struct instead of interface
func (r *room) Player(id string) Player {
	for p := range r.players {
		if p.Info().ID == id {
			return p
		}
	}
	return nil
}

func (r *room) Players() []*PlayerInfo {
	playerList := []*PlayerInfo{}
	for player := range r.players {
		playerList = append(playerList, player.Info())
	}
	return playerList
}

func (r *room) Connect(conn *websocket.Conn, role PlayerRole, name string) error {
	p := NewPlayer(role, name)
	r.connect <- newClient(conn, r, p)

	return nil
}

func (r *room) Disconnect(p Player) {
	r.disconnect <- r.players[p]
}

func (r *room) Broadcast(msg []byte) {
	r.broadcast <- msg
}

func (r *room) Close() {
	r.cancel()
}

func (r *room) Run(rm RoomManager) {
	slog.Info("Room routine started", "code", r.code)
	ctx, cancel := context.WithCancel(context.Background())
	r.cancel = cancel
	defer cancel()

	defer func() {
		slog.Info("Room routine exited", "code", r.code)
		rm.ShutdownRoom(r.code, "Room closed")
	}()
	for {
		select {
		case <-ctx.Done():
			for _, c := range r.players {
				c.Close()
			}
			return
		case client := <-r.connect:
			client.Run(ctx)
			r.players[client.Player] = client

			slog.Info("player connected", "player", client.Player.Info().ID)

			msg := r.state(client.Player.Role())
			client.Send(msg)
		case client := <-r.disconnect:
			delete(r.players, client.Player)
			if len(r.players) == 0 {
				r.cancel()
			}
		case msg := <-r.broadcast:
			for _, client := range r.players {
				client.Send(msg)
			}
		case e := <-r.event:
			switch e.Type {
			case START_GAME:
				if e.Player.Role() == RoleHost && r.status == WAITING {
					r.game = NewGame()
					go r.game.Run(ctx, r)
					r.status = PLAYING
					for player, client := range r.players {
						client.Send(r.state(player.Role()))
					}
				}
			default:
				if r.status == PLAYING {
					r.game.EnqueueEvent(e)
				}
			}
		}

	}
}

func encodeEvent(e *RoomEvent) []byte {
	jsonBytes, err := json.Marshal(e)
	if err != nil {
		slog.Error("error marshalling event", "error", err)
	}
	return jsonBytes
}

func (r *room) BroadcastExcept(msg []byte, excludePlayer Player) {
	for player, client := range r.players {
		if player.Info().ID != excludePlayer.Info().ID {
			client.Send(msg)
		}
	}
}

// * opportunity for generic ? or veratic
func (r *room) state(role PlayerRole) []byte {
	type stateUpdate struct {
		Role    PlayerRole    `json:"role"`
		Status  RoomStatus    `json:"status"`
		Players []*PlayerInfo `json:"players"`
		Code    string        `json:"code"`
		Game    *game         `json:"game"`
	}

	msg := &stateUpdate{
		Players: r.Players(),
		Code:    r.code,
		Status:  r.status,
		Role:    role,
	}

	if r.game != nil {
		msg.Game = r.game.State()
	} 

	msgBytes, _ := json.Marshal(&RoomEvent{
		Type:    STATE,
		Payload: msg,
	})

	return msgBytes
}
