"use client";

import { useRoom } from "@/hooks/use-room";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { RoomEvent, RoomEventType, RoomState, RoomStatus } from "@/types/room";
import {
	CanvasAction,
	CanvasToolSettings,
	SettingActionType,
	Stroke,
	Tool,
} from "@/types/canvas";
import { Player, PlayerRole } from "@/types/player";

interface RoomContextType {
	handleEvent: (event: RoomEvent) => void;
	handleRoomFormSubmit: (username: string) => void;
	room: RoomState;
	settings: CanvasToolSettings;
	updateSettings: (action: CanvasAction) => void;
}
const defaultContext: RoomContextType = {
	updateSettings: () => {},
	handleEvent: () => {},
	handleRoomFormSubmit: () => {},
	settings: {
		color: "#000000",
		strokeWidth: 18,
		tool: Tool.BRUSH,
	},
	room: {
		role: PlayerRole.PLAYER,
		code: "",
		players: [] as Player[],
		status: RoomStatus.UNINITIALIZED,
		game: {
			strokes: [] as Stroke[],
		},
	} as RoomState,
};
const RoomContext = createContext<RoomContextType>(defaultContext);
export const useRoomContext = () => useContext(RoomContext);

const roomReducer = (state: RoomState, event: RoomEvent) => {
	switch (event.type) {
		case RoomEventType.STROKE:
			return {
				...state,
				game: {
					...state.game,
					strokes: [...state.game.strokes, event.payload],
				},
			};
		case RoomEventType.STROKE_POINT:
			if (state.game.strokes.length === 0) {
				return state;
			}
			const copy = [...state.game.strokes];
			copy[copy.length - 1].points.push(event.payload);
			return { ...state, game: { ...state.game, strokes: copy } };
		case RoomEventType.STATE:
			return { ...state, ...event.payload };
		case RoomEventType.CLEAR_STATE:
			return defaultContext.room;
		case RoomEventType.CLEAR_STROKES:
			return { ...state, game: { ...state.game, strokes: [] } };
		case RoomEventType.UNDO_STROKE:
			return {
				...state,
				game: { ...state.game, strokes: state.game.strokes.slice(0, -1) },
			};
		default:
			return state;
	}
};

const settingsReducer = (state: CanvasToolSettings, action: CanvasAction) => {
	switch (action.type) {
		case SettingActionType.CHANGE_COLOR:
			return { ...state, color: action.payload };
		case SettingActionType.CHANGE_STROKE_WIDTH:
			return { ...state, strokeWidth: action.payload };
		case SettingActionType.CHANGE_TOOL:
			return { ...state, tool: action.payload };
		default:
			return state;
	}
};

const getRealtimeHref = () => {
	const protocol = process.env.NODE_ENV === "development" ? "ws" : "wss";
	const host =
		process.env.NEXT_PUBLIC_SOCKET_HOST || "realtime-" + window.location.host;
	return `${protocol}://${host}`;
};

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
	const [socketUrl, setSocketUrl] = useState<string | null>(null);

	const [room, updateRoom] = useReducer(roomReducer, defaultContext.room);

	const [settings, updateSettings] = useReducer(
		settingsReducer,
		defaultContext.settings
	);

	const searchParams = useSearchParams();

	const roomOptions = useMemo(
		() => ({
			onClose: () => {
				if (!room.code) return;
				const url = new URL(window.location.href);
				url.searchParams.delete("room");
				history.pushState({}, "", url.toString());
				setSocketUrl(null);
				updateRoom({ type: RoomEventType.CLEAR_STATE });
			},
			onMessage: (event: MessageEvent) => {
				console.log(event);
				const { type, payload } = JSON.parse(event.data);
				updateRoom({ type, payload });
			},
			onConnect: () => toast.success("Connected to room"),
			onError: () => {
				toast.error("Failed to connect to room");
				setSocketUrl(null);
			},
		}),
		[]
	);

	const [sendEvent] = useRoom(socketUrl, roomOptions);

	const handleEvent = useCallback(
		(event: RoomEvent) => {
			updateRoom(event);
			sendEvent(event);
		},
		[sendEvent]
	);

	const handleRoomFormSubmit = useCallback(
		(username: string) => {
			const roomCode = searchParams.get("room");
			if (roomCode) {
				setSocketUrl(getRealtimeHref() + "/join/" + roomCode);
			} else {
				setSocketUrl(getRealtimeHref() + "/host");
			}
		},
		[searchParams]
	);

	const contextValue = useMemo(
		() => ({
			room,
			handleEvent,
			handleRoomFormSubmit,
			settings,
			updateSettings,
		}),
		[room, handleEvent, handleRoomFormSubmit, settings]
	);

	return (
		<RoomContext.Provider value={contextValue}>{children}</RoomContext.Provider>
	);
};
