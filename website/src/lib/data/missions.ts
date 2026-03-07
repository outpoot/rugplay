export type MissionCategory = "trading" | "arcade";

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  target: number;
  cashReward: number;
  gemReward: number;
}

export const MISSIONS: Mission[] = [
  {
    id: "trade_3",
    title: "Active Trader",
    description: "Make 8 trades today (buy or sell)",
    category: "trading",
    target: 8,
    cashReward: 100,
    gemReward: 0,
  },
  {
    id: "buy_1000",
    title: "Big Spender",
    description: "Buy at least $1,000 worth of coins",
    category: "trading",
    target: 1000,
    cashReward: 300,
    gemReward: 0,
  },
  {
    id: "sell_1000",
    title: "Cashing Out",
    description: "Sell at least $1,000 worth of coins",
    category: "trading",
    target: 1000,
    cashReward: 300,
    gemReward: 0,
  },
  {
    id: "trade_different_coins_3",
    title: "Diversifier",
    description: "Trade 6 different coins today",
    category: "trading",
    target: 6,
    cashReward: 200,
    gemReward: 2,
  },
  {
    id: "arcade_play_3",
    title: "Arcade Regular",
    description: "Play 8 arcade games today",
    category: "arcade",
    target: 8,
    cashReward: 75,
    gemReward: 0,
  },
  {
    id: "arcade_win_1",
    title: "Lucky Break",
    description: "Win 3 arcade games today",
    category: "arcade",
    target: 3,
    cashReward: 100,
    gemReward: 0,
  },
  {
    id: "arcade_wager_500",
    title: "High Roller",
    description: "Wager a total of $500 in arcade games",
    category: "arcade",
    target: 500,
    cashReward: 150,
    gemReward: 1,
  },
  {
    id: "trade_10",
    title: "Market Grinder",
    description: "Make 10 trades today",
    category: "trading",
    target: 10,
    cashReward: 400,
    gemReward: 2,
  },
  {
    id: "buy_5000",
    title: "Whale Buyer",
    description: "Buy at least $5,000 worth of coins",
    category: "trading",
    target: 5000,
    cashReward: 800,
    gemReward: 3,
  },
  {
    id: "sell_5000",
    title: "Profit Hunter",
    description: "Sell at least $5,000 worth of coins",
    category: "trading",
    target: 5000,
    cashReward: 800,
    gemReward: 3,
  },
  {
    id: "arcade_play_10",
    title: "Arcade Addict",
    description: "Play 10 arcade games today",
    category: "arcade",
    target: 10,
    cashReward: 200,
    gemReward: 1,
  },
  {
    id: "arcade_win_3",
    title: "Arcade Champion",
    description: "Win 3 arcade games",
    category: "arcade",
    target: 3,
    cashReward: 300,
    gemReward: 2,
  },
  {
    id: "trade_25",
    title: "Market Maniac",
    description: "Make 25 trades today",
    category: "trading",
    target: 25,
    cashReward: 1000,
    gemReward: 5,
  },
  {
    id: "buy_20000",
    title: "Mega Whale",
    description: "Buy $20,000 worth of coins",
    category: "trading",
    target: 20000,
    cashReward: 2000,
    gemReward: 8,
  },
  {
    id: "sell_20000",
    title: "Mass Liquidator",
    description: "Sell $20,000 worth of coins",
    category: "trading",
    target: 20000,
    cashReward: 1000,
    gemReward: 8,
  },
  {
    id: "arcade_wager_5000",
    title: "Arcade Degenerate",
    description: "Wager $5,000 in arcade games",
    category: "arcade",
    target: 5000,
    cashReward: 800,
    gemReward: 5,
  },
  {
    id: "arcade_win_10",
    title: "Arcade God",
    description: "Win 10 arcade games",
    category: "arcade",
    target: 10,
    cashReward: 1000,
    gemReward: 8,
  },
  {
    id: "trade_100",
    title: "Market Legend",
    description: "Make 100 trades today",
    category: "trading",
    target: 100,
    cashReward: 5000,
    gemReward: 25,
  },
];

export const MISSION_CATEGORIES: Record<
  MissionCategory,
  { label: string; color: string }
> = {
  trading: { label: "Trading", color: "emerald" },
  arcade: { label: "Arcade", color: "purple" },
};

export function getDailyMissions(dateStr: string): Mission[] {
  const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...MISSIONS].sort((a, b) => {
    const ha = Math.sin(seed * a.id.length) * 10000;
    const hb = Math.sin(seed * b.id.length) * 10000;
    return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
  });
  return shuffled.slice(0, 8);
}