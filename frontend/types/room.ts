import { Stroke } from "./canvas";
import { Player, PlayerRole } from "./player";

export enum RoomEventType {
	START_GAME = "START_GAME",
	STATE = "STATE",
	STROKE = "STROKE",
	STROKE_POINT = "STROKE_POINT",
	CLEAR_STATE = "CLEAR_STATE",
	CLEAR_STROKES = "CLEAR_STROKES",
	UNDO_STROKE = "UNDO_STROKE",
}
export type RoomState = {
	role: PlayerRole;
	status: RoomStatus;
	code: string;
	players: Player[];
	game: GameState;
};

export type GameState = {
	strokes: Stroke[];
};

export enum RoomStatus {
	WAITING = "WAITING",
	PLAYING = "PLAYING",
	UNINITIALIZED = "UNINITIALIZED",
	FINISHED = "FINISHED",
}

export type RoomEvent =
	| StateEvent
	| StrokeEvent
	| StrokePointEvent
	| StartGameEvent
	| ClearStateEvent
	| ClearStrokesEvent
	| UndoStrokeEvent;

export type StateEvent = {
	type: RoomEventType.STATE;
	payload: RoomState;
};

export type StrokeEvent = {
	type: RoomEventType.STROKE;
	payload: Stroke;
};

export type StrokePointEvent = {
	type: RoomEventType.STROKE_POINT;
	payload: number[];
};

export type StartGameEvent = {
	type: RoomEventType.START_GAME;
	payload: {
		rounds: number;
		timeLimit: number;
	};
};

export type ClearStateEvent = {
	type: RoomEventType.CLEAR_STATE;
};

export type ClearStrokesEvent = {
	type: RoomEventType.CLEAR_STROKES;
};
export type UndoStrokeEvent = {
	type: RoomEventType.UNDO_STROKE;
};
