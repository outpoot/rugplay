// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Add Watchlist to the sidebar nav
// File: src/lib/components/self/AppSidebar.svelte
//
// Find the import block for icons and add:
//   Star01Icon
// from '@hugeicons/core-free-icons'
//
// Then find your navItems array (or wherever the sidebar links are defined)
// and add this entry alongside the existing ones:
//
//   {
//     title: 'Watchlist',
//     url: '/watchlist',
//     icon: Star01Icon,
//   },
//
// Suggested placement: after 'Portfolio', before 'Leaderboard'.
// ─────────────────────────────────────────────────────────────────────────────

// Example of what the updated nav items section should look like:
// (copy only the relevant addition — do NOT replace the entire file)

/*
import {
    ...existing imports...,
    Star01Icon,   // ← ADD THIS
} from '@hugeicons/core-free-icons';

const navItems = [
    { title: 'Home',        url: '/',            icon: Home01Icon },
    { title: 'Market',      url: '/market',      icon: ChartIcon },
    { title: 'Portfolio',   url: '/portfolio',   icon: PieChartIcon },
    { title: 'Watchlist',   url: '/watchlist',   icon: Star01Icon },  // ← ADD THIS
    { title: 'Leaderboard', url: '/leaderboard', icon: TrophyIcon },
    { title: 'Hopium',      url: '/hopium',      icon: BubbleIcon },
    { title: 'Arcade',      url: '/arcade',      icon: GamepadIcon },
    { title: 'Live',        url: '/live',        icon: LiveIcon },
    { title: 'Prestige',    url: '/prestige',    icon: StarIcon },
    // ...rest of items
];
*/
