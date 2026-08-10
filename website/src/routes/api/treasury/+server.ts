import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { treasury, treasuryLedger, coin, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateTreasury } from '$lib/server/treasury';

export async function GET() {
    try {
        const treasuryRow = await getOrCreateTreasury();

        const recentLedger = await db
            .select({
                id: treasuryLedger.id,
                direction: treasuryLedger.direction,
                source: treasuryLedger.source,
                amount: treasuryLedger.amount,
                balanceAfter: treasuryLedger.balanceAfter,
                description: treasuryLedger.description,
                createdAt: treasuryLedger.createdAt,
                username: user.username
            })
            .from(treasuryLedger)
            .leftJoin(user, eq(treasuryLedger.userId, user.id))
            .orderBy(desc(treasuryLedger.createdAt))
            .limit(25);

        const [bankCoin] = await db
            .select({
                symbol: coin.symbol,
                name: coin.name,
                icon: coin.icon,
                currentPrice: coin.currentPrice,
                marketCap: coin.marketCap,
                change24h: coin.change24h,
                circulatingSupply: coin.circulatingSupply,
                maxHolderPercent: coin.maxHolderPercent
            })
            .from(coin)
            .where(eq(coin.isOfficial, true))
            .limit(1);

        return json({
            treasury: {
                balance: Number(treasuryRow.balance),
                totalInflow: Number(treasuryRow.totalInflow),
                totalOutflow: Number(treasuryRow.totalOutflow),
                updatedAt: treasuryRow.updatedAt
            },
            ledger: recentLedger.map((entry) => ({
                id: entry.id,
                direction: entry.direction,
                source: entry.source,
                amount: Number(entry.amount),
                balanceAfter: Number(entry.balanceAfter),
                description: entry.description,
                createdAt: entry.createdAt,
                username: entry.username
            })),
            bankCoin: bankCoin
                ? {
                        symbol: bankCoin.symbol,
                        name: bankCoin.name,
                        icon: bankCoin.icon,
                        currentPrice: Number(bankCoin.currentPrice),
                        marketCap: Number(bankCoin.marketCap),
                        change24h: Number(bankCoin.change24h),
                        circulatingSupply: Number(bankCoin.circulatingSupply),
                        maxHolderPercent: bankCoin.maxHolderPercent ? Number(bankCoin.maxHolderPercent) : null
                    }
                : null
        });
    } catch (e) {
        console.error('Error fetching treasury data:', e);
        return json({ error: 'Failed to fetch treasury data' }, { status: 500 });
    }
}
