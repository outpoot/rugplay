export type MissionCategory = "trading" | "arcade" | "social" | "daily";

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  target: number;
  cashReward: number;
  gemReward: number;
  icon: string;
}

export const MISSIONS: Mission[] = [
  // Trading
  {
    id: "trade_3",
    title: "Active Trader",
    description: "Make 3 trades today (buy or sell)",
    category: "trading",
    target: 3,
    cashReward: 500,
    gemReward: 0,
  },
  {
    id: "buy_1000",
    title: "Big Spender",
    description: "Buy at least $1,000 worth of coins",
    category: "trading",
    target: 1000,
    cashReward: 1000,
    gemReward: 0,
  },
  {
    id: "sell_1000",
    title: "Cashing Out",
    description: "Sell at least $1,000 worth of coins",
    category: "trading",
    target: 1000,
    cashReward: 1000,
    gemReward: 0,
  },
  {
    id: "trade_different_coins_3",
    title: "Diversifier",
    description: "Trade 3 different coins today",
    category: "trading",
    target: 3,
    cashReward: 750,
    gemReward: 5,
  },
  // Arcade
  {
    id: "arcade_play_3",
    title: "Arcade Regular",
    description: "Play 3 arcade games today",
    category: "arcade",
    target: 3,
    cashReward: 300,
    gemReward: 0,
  },
  {
    id: "arcade_win_1",
    title: "Lucky Break",
    description: "Win an arcade game today",
    category: "arcade",
    target: 1,
    cashReward: 500,
    gemReward: 0,
  },
  {
    id: "arcade_wager_500",
    title: "High Roller",
    description: "Wager a total of $500 in arcade games",
    category: "arcade",
    target: 500,
    cashReward: 800,
    gemReward: 5,
  },
  // Social
  {
    id: "comment_1",
    title: "Community Voice",
    description: "Post a comment on any coin",
    category: "social",
    target: 1,
    cashReward: 200,
    gemReward: 0,
  },
  {
    id: "comment_3",
    title: "Town Crier",
    description: "Post 3 comments today",
    category: "social",
    target: 3,
    cashReward: 500,
    gemReward: 5,
  },
  // Daily
  {
    id: "claim_reward",
    title: "Clockwork",
    description: "Claim your daily reward",
    category: "daily",
    target: 1,
    cashReward: 150,
    gemReward: 2,
  },
  {
    id: "trade_10",
    title: "Market Grinder",
    description: "Make 10 trades today",
    category: "trading",
    target: 10,
    cashReward: 2000,
    gemReward: 5,
  },
  {
    id: "buy_5000",
    title: "Whale Buyer",
    description: "Buy at least $5,000 worth of coins",
    category: "trading",
    target: 5000,
    cashReward: 2500,
    gemReward: 10,
  },
  {
    id: "sell_5000",
    title: "Profit Hunter",
    description: "Sell at least $5,000 worth of coins",
    category: "trading",
    target: 5000,
    cashReward: 2500,
    gemReward: 10,
  },
  {
    id: "arcade_play_10",
    title: "Arcade Addict",
    description: "Play 10 arcade games today",
    category: "arcade",
    target: 10,
    cashReward: 1500,
    gemReward: 5,
  },
  {
    id: "arcade_win_3",
    title: "Arcade Champion",
    description: "Win 3 arcade games",
    category: "arcade",
    target: 3,
    cashReward: 2000,
    gemReward: 10,
  },
  {
    id: "comment_5",
    title: "Community Leader",
    description: "Post 5 comments today",
    category: "social",
    target: 5,
    cashReward: 1200,
    gemReward: 5,
  },
  {
    id: "trade_25",
    title: "Market Maniac",
    description: "Make 25 trades today",
    category: "trading",
    target: 25,
    cashReward: 6000,
    gemReward: 25,
  },
  {
    id: "buy_20000",
    title: "Mega Whale",
    description: "Buy $20,000 worth of coins",
    category: "trading",
    target: 20000,
    cashReward: 8000,
    gemReward: 40,
  },
  {
    id: "sell_20000",
    title: "Mass Liquidator",
    description: "Sell $20,000 worth of coins",
    category: "trading",
    target: 20000,
    cashReward: 8000,
    gemReward: 40,
  },
  {
    id: "arcade_wager_5000",
    title: "Arcade Degenerate",
    description: "Wager $5,000 in arcade games",
    category: "arcade",
    target: 5000,
    cashReward: 7000,
    gemReward: 30,
  },
  {
    id: "arcade_win_10",
    title: "Arcade God",
    description: "Win 10 arcade games",
    category: "arcade",
    target: 10,
    cashReward: 9000,
    gemReward: 50,
  },
  {
    id: "comment_10",
    title: "Voice of the Market",
    description: "Post 10 comments today",
    category: "social",
    target: 10,
    cashReward: 3000,
    gemReward: 15,
  },
  {
    id: "trade_100",
    title: "Market Legend",
    description: "Make 100 trades today",
    category: "trading",
    target: 100,
    cashReward: 50000,
    gemReward: 250,
  },
];

export const MISSION_CATEGORIES: Record<
  MissionCategory,
  { label: string; color: string }
> = {
  trading: { label: "Trading", color: "emerald" },
  arcade: { label: "Arcade", color: "purple" },
  social: { label: "Social", color: "blue" },
  daily: { label: "Daily", color: "amber" },
};

// pick 4 random missions for today based on the date seed
export function getDailyMissions(dateStr: string): Mission[] {
  const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...MISSIONS].sort((a, b) => {
    const ha = Math.sin(seed * a.id.length) * 10000;
    const hb = Math.sin(seed * b.id.length) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });

  const selected = shuffled.slice(0, 8);
  console.log('[DEBUG] getDailyMissions for', dateStr, '->', selected.map(m => m.id));
  return selected;
}
