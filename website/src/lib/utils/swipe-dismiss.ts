type Direction = 'down' | 'left';

interface Options {
	direction: Direction;
	onDismiss: () => void;
	getBackdrop?: () => HTMLElement | null;
	enabled?: () => boolean;
}

const DISTANCE_RATIO = 0.3;
const FLICK_VELOCITY = 0.4; // px per ms
const LOCK_THRESHOLD = 6; // px moved before locking the gesture's axis

function canScrollTowardStart(target: EventTarget | null, root: HTMLElement, direction: Direction) {
	let el = target instanceof Element ? target : null;
	while (el && el !== root.parentElement) {
		if (el instanceof HTMLElement) {
			const style = getComputedStyle(el);
			if (direction === 'down') {
				const scrollable = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
				if (scrollable && el.scrollTop > 0) return true;
			} else {
				const scrollable = /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth;
				if (scrollable) return true;
			}
		}
		if (el === root) break;
		el = el.parentElement;
	}
	return false;
}

function isFormControl(target: EventTarget | null) {
	return target instanceof Element && !!target.closest('input[type="range"], [role="slider"], textarea');
}

export function swipeToDismiss(node: HTMLElement, options: Options) {
	let startX = 0;
	let startY = 0;
	let startTime = 0;
	let tracking = false;
	let dragging = false;
	let offset = 0;
	let samples: { offset: number; time: number }[] = [];

	const size = () => (options.direction === 'down' ? node.offsetHeight : node.offsetWidth);

	function apply(px: number, animate: boolean) {
		node.style.transition = animate ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none';
		node.style.transform =
			options.direction === 'down' ? `translate3d(0, ${px}px, 0)` : `translate3d(${-px}px, 0, 0)`;
		const backdrop = options.getBackdrop?.();
		if (backdrop) {
			backdrop.style.transition = node.style.transition.replace('transform', 'opacity');
			backdrop.style.opacity = String(Math.max(0, 1 - px / size()));
		}
	}

	function reset() {
		delete node.dataset.swipeDismissed;
		node.style.transition = '';
		node.style.transform = '';
		const backdrop = options.getBackdrop?.();
		if (backdrop) {
			backdrop.style.transition = '';
			backdrop.style.opacity = '';
		}
	}

	function onTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1 || (options.enabled && !options.enabled())) return;
		if (isFormControl(event.target) || canScrollTowardStart(event.target, node, options.direction)) return;
		const touch = event.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		startTime = performance.now();
		tracking = true;
		dragging = false;
		offset = 0;
	}

	function onTouchMove(event: TouchEvent) {
		if (!tracking) return;
		const touch = event.touches[0];
		const dx = touch.clientX - startX;
		const dy = touch.clientY - startY;
		const along = options.direction === 'down' ? dy : -dx;
		const across = options.direction === 'down' ? dx : dy;

		if (!dragging) {
			if (Math.abs(along) < LOCK_THRESHOLD && Math.abs(across) < LOCK_THRESHOLD) return;
			if (Math.abs(across) > Math.abs(along) || along <= 0) {
				tracking = false;
				return;
			}
			dragging = true;
			// Restart from here so the sheet doesn't jump by the lock threshold
			startX = touch.clientX;
			startY = touch.clientY;
			startTime = performance.now();
			samples = [];
		}

		event.preventDefault();
		const raw = options.direction === 'down' ? touch.clientY - startY : startX - touch.clientX;
		offset = raw >= 0 ? raw : raw / 4;
		const now = performance.now();
		samples.push({ offset, time: now });
		while (samples.length > 2 && now - samples[0].time > 100) samples.shift();
		apply(Math.max(offset, -12), false);
	}

	function onTouchEnd() {
		if (!tracking) return;
		tracking = false;
		if (!dragging) return;
		dragging = false;
		const first = samples[0] ?? { offset: 0, time: startTime };
		const last = samples[samples.length - 1] ?? first;
		const velocity = (last.offset - first.offset) / Math.max(1, last.time - first.time);
		if (offset > size() * DISTANCE_RATIO || (velocity > FLICK_VELOCITY && offset > 24)) {
			apply(size(), true);
			node.dataset.swipeDismissed = '';
			setTimeout(() => {
				options.onDismiss();
				setTimeout(reset, 50);
			}, 200);
		} else {
			apply(0, true);
			setTimeout(reset, 230);
		}
	}

	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchmove', onTouchMove, { passive: false });
	node.addEventListener('touchend', onTouchEnd);
	node.addEventListener('touchcancel', onTouchEnd);

	return () => {
		node.removeEventListener('touchstart', onTouchStart);
		node.removeEventListener('touchmove', onTouchMove);
		node.removeEventListener('touchend', onTouchEnd);
		node.removeEventListener('touchcancel', onTouchEnd);
		reset();
	};
}
