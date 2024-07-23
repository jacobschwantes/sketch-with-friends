"use client";
import { useRoomContext } from "@/components/room/room-provider";
import Canvas from "@/components/canvas/canvas";
import { RoomForm } from "@/components/room/room-form";
import { RoomStatus } from "@/types/room";
import { Button } from "@/components/ui/button";
import Waiting from "@/components/room/waiting";

const roomComponents = {
	[RoomStatus.PLAYING]: Canvas,
	[RoomStatus.WAITING]: Waiting,
	[RoomStatus.UNINITIALIZED]: RoomForm,
};

export default function Home() {
	const { room } = useRoomContext();

	const RoomComponent =
		roomComponents[room.status as keyof typeof roomComponents];

	// TODO: useMemo on room.status to render form or room view
	// TODO: use roomRole to render player or host view
	// TODO: use gameRole to render drawing or guessing view

	return (
		<main className="flex min-h-screen flex-col items-center justify-between">
			<RoomComponent />
		</main>
	);
}
