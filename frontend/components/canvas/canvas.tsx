"use client";
import * as React from "react";
import { getStroke } from "perfect-freehand";

import { useRoomContext } from "@/components/room/room-provider";
import { RoomEventType } from "@/types/room";
import { CanvasTools, CopyRoomLink } from "@/components/canvas/canvas-tools";
import { useWindowSize } from "@/hooks/use-window-size";
import { Button } from "@/components/ui/button";
import { Stroke } from "@/types/canvas";

// make canvas less pixelated
const CANVAS_SCALE = 2;

// perfect-freehand options
const strokeOptions = {
	size: 18,
	thinning: 0.5,
	smoothing: 0.5,
	streamline: 0.5,
	easing: (t: number) => t,
	start: {
		taper: 0,
		easing: (t: number) => t,
		cap: true,
	},
	end: {
		taper: 100,
		easing: (t: number) => t,
		cap: true,
	},
};

// Constructs svg path from stroke
function getSvgPathFromStroke(stroke: number[][]) {
	if (!stroke.length) return "";

	const d = stroke.reduce(
		(acc, [x0, y0], i, arr) => {
			const [x1, y1] = arr[(i + 1) % arr.length];
			acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
			return acc;
		},
		["M", ...stroke[0], "Q"]
	);

	d.push("Z");
	return d.join(" ");
}

function Canvas() {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const strokeCountRef = React.useRef(0);

	const { handleEvent, room, settings } = useRoomContext();
	const [windowWidth, windowHeight] = useWindowSize();

	const fillCanvasWithStroke = React.useCallback(
		(ctx: CanvasRenderingContext2D, stroke: Stroke) => {
			const myStroke = getStroke(stroke.points, {
				...strokeOptions,
				size: stroke.width,
			});
			const pathData = getSvgPathFromStroke(myStroke);
			const myPath = new Path2D(pathData);
			ctx.fillStyle = stroke.color;
			ctx.fill(myPath);
		},
		[]
	);

	const clearCanvas = React.useCallback(
		(ctx: CanvasRenderingContext2D) => {
			ctx.clearRect(
				0,
				0,
				windowWidth * CANVAS_SCALE,
				windowHeight * CANVAS_SCALE
			);
		},
		[windowWidth, windowHeight]
	);

	const drawAllStrokes = React.useCallback(() => {
		const ctx = canvasRef.current?.getContext("2d");

		if (ctx) {
			clearCanvas(ctx);
			for (const stroke of room.game.strokes) {
				fillCanvasWithStroke(ctx, stroke);
			}
		}
	}, [fillCanvasWithStroke, room.game.strokes]);

	const drawMostRecentStroke = React.useCallback(() => {
		const canvasContext = canvasRef.current?.getContext("2d");
		const strokeCount = room.game.strokes.length;

		if (canvasContext && strokeCount) {
			const stroke = room.game.strokes[strokeCount - 1];
			fillCanvasWithStroke(canvasContext, stroke);
		}
	}, [fillCanvasWithStroke, room.game.strokes]);

	// Draws all strokes on first load and when window size changes
	React.useEffect(() => {
		const isWindowInitialized = windowWidth !== 0 && windowHeight !== 0;

		if (isWindowInitialized) {
			drawAllStrokes();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [windowWidth, windowHeight]);

	// Only draws most recent stroke unless canvas is cleared or a stroke is undone
	React.useEffect(() => {
		const isWindowInitialized = windowWidth !== 0 && windowHeight !== 0;
		const newStrokeCount = room.game.strokes.length;

		if (
			strokeCountRef.current > newStrokeCount ||
			room.game.strokes.length === 0
		) {
			// Undo stroke or clear canvas
			drawAllStrokes();
		} else if (room.game.strokes.length > 0 && isWindowInitialized) {
			drawMostRecentStroke();
		}

		strokeCountRef.current = newStrokeCount;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [room.game.strokes]);

	const handleNewStroke = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			handleEvent({
				type: RoomEventType.STROKE,
				payload: {
					color: settings.color,
					width: settings.strokeWidth,
					points: [[e.pageX * CANVAS_SCALE, e.pageY * CANVAS_SCALE]],
				},
			});
		},
		[handleEvent, settings.color, settings.strokeWidth]
	);

	const handleStrokePoint = React.useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			// Only draw when left click is held down
			if (e.buttons !== 1) return;

			handleEvent({
				type: RoomEventType.STROKE_POINT,
				payload: [e.pageX * CANVAS_SCALE, e.pageY * CANVAS_SCALE],
			});
		},
		[handleEvent]
	);

	return (
		<div className="w-screen h-screen relative overflow-hidden">
			<div className="absolute top-3 right-3">
				<CopyRoomLink />
			</div>

			<canvas
				style={{
					width: windowWidth,
					height: windowHeight,
				}}
				width={windowWidth * CANVAS_SCALE}
				height={windowHeight * CANVAS_SCALE}
				onMouseDown={handleNewStroke}
				onMouseMove={handleStrokePoint}
				ref={canvasRef}
			/>
			<CanvasTools />
		</div>
	);
}

export default Canvas;
