import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDailyMissions, MISSIONS, type Mission } from "$lib/data/missions";
import { createNotification } from "./notification";

function getPrestigeMultiplier(prestigeLevel: number): number {
  const PRESTIGE_MULTIPLIERS: Record<number, number> = {
    0: 1.0,
    1: 1.04,
    2: 1.22,
    3: 2.0,
    4: 6.4,
    5: 42.0,
  };
  return PRESTIGE_MULTIPLIERS[prestigeLevel] ?? 1.0;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  if (!missionId || typeof missionId !== 'string' || missionId.length > 100) return null;

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return null;

  const today = getTodayStr();

  const rowsResult = await db.execute(sql`
    SELECT progress, completed, claimed
    FROM user_daily_mission
    WHERE user_id = ${userId} AND mission_id = ${missionId} AND date = ${today}::date
    FOR UPDATE
  `);

  const rows = (rowsResult && (rowsResult as any).rows)
    ? (rowsResult as any).rows
    : (rowsResult as any);

  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  if (!row.completed || row.claimed) return null;

  await db.execute(sql`
    UPDATE user_daily_mission
    SET claimed = true
    WHERE user_id = ${userId} AND mission_id = ${missionId} AND date = ${today}::date AND claimed = false
  `);

  const [userRow] = await db
    .select({ prestigeLevel: user.prestigeLevel })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const prestigeLevel = Number(userRow?.prestigeLevel ?? 0);
  const multiplier = getPrestigeMultiplier(prestigeLevel);

  const finalCashReward = Math.floor(mission.cashReward * multiplier);
  const finalGemReward = Math.floor(mission.gemReward * multiplier);

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
  await db.execute(sql`
    DELETE FROM user_daily_mission
    WHERE date < (CURRENT_DATE - INTERVAL '2 days')
  `);
}