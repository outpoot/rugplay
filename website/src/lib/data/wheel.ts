// Shared config for the Wheel of Fortune arcade game.
// Used by the server (/api/arcade/wheel) to resolve outcomes and by the
// client (Wheel.svelte) to draw the wheel. Multipliers sum to 11.5 across 12
// segments for a ~4.2% house edge (95.8% RTP).
export const WHEEL_SEGMENTS = [0, 1.5, 0, 2, 0, 2.5, 0, 0.5, 0, 4, 0, 1];
