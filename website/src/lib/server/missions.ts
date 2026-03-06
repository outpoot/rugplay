import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDailyMissions, MISSIONS, type Mission } from "$lib/data/missions";
import { createNotification } from "./notification";

function getPrestigeMultiplier(prestigeLevel: number): number {
  const PRESTIGE_MULTIPLIERS = {
    0: 1.0,
    1: 1.25,
    2: 1.5,
    3: 1.75,
    4: 2.0,
    5: 2.5,
  };

  return (
    PRESTIGE_MULTIPLIERS[prestigeLevel as keyof typeof PRESTIGE_MULTIPLIERS] ||
    1.0
  );
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface MissionWithProgress extends Mission {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export async function getUserDailyMissions(
  userId: number,
): Promise<MissionWithProgress[]> {
  const today = getTodayStr();
  const todayMissions = getDailyMissions(today);

  // Ensure rows exist for today's missions
  for (const mission of todayMissions) {
    await db.execute(sql`
            INSERT INTO user_daily_mission (user_id, mission_id, progress, completed, claimed, date)
            VALUES (${userId}, ${mission.id}, 0, false, false, ${today}::date)
            ON CONFLICT (user_id, mission_id, date) DO NOTHING
        `);
  }

  const rows = await db.execute(sql`
        SELECT mission_id, progress, completed, claimed
        FROM user_daily_mission
        WHERE user_id = ${userId} AND date = ${today}::date
    `);

  const rowMap = new Map<
    string,
    { progress: number; completed: boolean; claimed: boolean }
  >();
  for (const row of rows) {
    rowMap.set(row.mission_id as string, {
      progress: Number(row.progress),
      completed: Boolean(row.completed),
      claimed: Boolean(row.claimed),
    });
  }

  return todayMissions.map((m) => {
    const data = rowMap.get(m.id) ?? {
      progress: 0,
      completed: false,
      claimed: false,
    };
    return { ...m, ...data };
  });
}

export async function incrementMissionProgress(
  userId: number,
  missionId: string,
  amount: number = 1,
): Promise<void> {
  const today = getTodayStr();
  const todayMissions = getDailyMissions(today);

  // Only track if this mission is active today
  if (!todayMissions.find((m) => m.id === missionId)) return;

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return;

  await db.execute(sql`
        INSERT INTO user_daily_mission (user_id, mission_id, progress, completed, claimed, date)
        VALUES (${userId}, ${missionId}, ${amount}, ${amount >= mission.target}, false, ${today}::date)
        ON CONFLICT (user_id, mission_id, date) DO UPDATE
        SET
            progress = LEAST(user_daily_mission.progress + ${amount}, ${mission.target * 10}),
            completed = (user_daily_mission.progress + ${amount}) >= ${mission.target}
        WHERE NOT user_daily_mission.claimed
    `);
}

// update a mission that tracks an absolute value (e.g. total buy amount today)
export async function setMissionProgressIfHigher(
  userId: number,
  missionId: string,
  newTotal: number,
): Promise<void> {
  const today = getTodayStr();
  const todayMissions = getDailyMissions(today);
  if (!todayMissions.find((m) => m.id === missionId)) return;

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return;

  await db.execute(sql`
        INSERT INTO user_daily_mission (user_id, mission_id, progress, completed, claimed, date)
        VALUES (${userId}, ${missionId}, ${Math.floor(newTotal)}, ${newTotal >= mission.target}, false, ${today}::date)
        ON CONFLICT (user_id, mission_id, date) DO UPDATE
        SET
            progress = GREATEST(user_daily_mission.progress, ${Math.floor(newTotal)}),
            completed = GREATEST(user_daily_mission.progress, ${Math.floor(newTotal)}) >= ${mission.target}
        WHERE NOT user_daily_mission.claimed
    `);
}

export async function claimMissionReward(
  userId: number,
  missionId: string,
): Promise<{ cashReward: number; gemReward: number } | null> {
  const today = getTodayStr();

  // lock the row for today
  const rowsResult = await db.execute(sql`
    SELECT progress, completed, claimed
    FROM user_daily_mission
    WHERE user_id = ${userId} AND mission_id = ${missionId} AND date = ${today}::date
    FOR UPDATE
  `);

  // support both possible return shapes (driver differences)
  const rows = (rowsResult && (rowsResult as any).rows) ? (rowsResult as any).rows : (rowsResult as any);

  if (!rows || rows.length === 0) return null;

  const row = rows[0];

  if (!row.completed || row.claimed) return null;

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return null;

  // mark claimed
  await db.execute(sql`
    UPDATE user_daily_mission
    SET claimed = true
    WHERE user_id = ${userId} AND mission_id = ${missionId} AND date = ${today}::date
  `);

  // fetch prestige level using drizzle ORM (consistent with other code)
  const [userRow] = await db
    .select({ prestigeLevel: user.prestigeLevel })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const prestigeLevel = Number(userRow?.prestigeLevel ?? 0);
  const multiplier = getPrestigeMultiplier(prestigeLevel);

  const finalCashReward = Math.floor(mission.cashReward * multiplier);
  const finalGemReward = Math.floor(mission.gemReward * multiplier);

  // apply rewards
  await db.execute(sql`
    UPDATE "user"
    SET
      base_currency_balance = base_currency_balance + ${finalCashReward},
      gems = gems + ${finalGemReward},
      updated_at = NOW()
    WHERE id = ${userId}
  `);

  await createNotification(
    userId.toString(),
    "SYSTEM",
    "🎯 Daily Mission Completed",
    `You completed "${mission.title}" and earned rewards!`,
    "/missions",
  );

  return { cashReward: finalCashReward, gemReward: finalGemReward };
}

export async function resetExpiredMissions(): Promise<void> {
  // delete entries older than 2 days to keep the table clean
  await db.execute(sql`
        DELETE FROM user_daily_mission
        WHERE date < (CURRENT_DATE - INTERVAL '2 days')
    `);
  console.log("🎯 Daily missions cleaned up");
}


// File: src/lib/data/missions.ts
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
