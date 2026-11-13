import type { Attachment } from 'svelte/attachments';

export function longPress(onLongPress: () => void, delay = 450): Attachment<HTMLElement> {
	return (node) => {
		let timer: ReturnType<typeof setTimeout> | null = null;
		let startX = 0;
		let startY = 0;
		let fired = false;

		const cancel = () => {
			if (timer) clearTimeout(timer);
			timer = null;
		};

		function onStart(event: TouchEvent) {
			if (event.touches.length !== 1) return;
			fired = false;
			startX = event.touches[0].clientX;
			startY = event.touches[0].clientY;
			cancel();
			timer = setTimeout(() => {
				timer = null;
				fired = true;
				onLongPress();
			}, delay);
		}

		function onMove(event: TouchEvent) {
			const touch = event.touches[0];
			if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) cancel();
		}

		function onClick(event: MouseEvent) {
			if (!fired) return;
			fired = false;
			event.preventDefault();
			event.stopPropagation();
		}

		function onContextMenu(event: Event) {
			if (fired || timer) event.preventDefault();
		}

		node.addEventListener('touchstart', onStart, { passive: true });
		node.addEventListener('touchmove', onMove, { passive: true });
		node.addEventListener('touchend', cancel);
		node.addEventListener('touchcancel', cancel);
		node.addEventListener('click', onClick, true);
		node.addEventListener('contextmenu', onContextMenu);
		return () => {
			cancel();
			node.removeEventListener('touchstart', onStart);
			node.removeEventListener('touchmove', onMove);
			node.removeEventListener('touchend', cancel);
			node.removeEventListener('touchcancel', cancel);
			node.removeEventListener('click', onClick, true);
			node.removeEventListener('contextmenu', onContextMenu);
		};
	};
}
