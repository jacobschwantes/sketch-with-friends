"use client";

import { RoomEventType } from "@/types/room";
import { Button } from "../ui/button";
import { useRoomContext } from "./room-provider";

function Waiting() {
	const { handleEvent } = useRoomContext();
	return (
		<div className="w-full h-full relative">
			<div className="absolute top-3 left-3">
				<Button
					onClick={() =>
						handleEvent({
							type: RoomEventType.START_GAME,
							payload: {
								rounds: 5,
								timeLimit: 60,
							},
						})
					}
				>
					Start Game
				</Button>
			</div>
			<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
				Waiting for host to start
			</div>
		</div>
	);
}

export default Waiting;
