import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transaction, coin } from '$lib/server/db/schema';
import { eq, desc, asc, and, or, ilike, sql } from 'drizzle-orm';

export async function GET({ request, url }) {
    const authSession = await auth.api.getSession({
        headers: request.headers
    });

    if (!authSession?.user) {
        throw error(401, 'Not authenticated');
    }

    const userId = Number(authSession.user.id);
    const searchQuery = url.searchParams.get('search') || '';
    const typeFilter = url.searchParams.get('type') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'timestamp';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

    let whereConditions = and(eq(transaction.userId, userId));

    if (searchQuery) {
        whereConditions = and(
            whereConditions,
            or(
                ilike(coin.name, `%${searchQuery}%`),
                ilike(coin.symbol, `%${searchQuery}%`)
            )
        );
    }

    if (typeFilter !== 'all') {
        whereConditions = and(whereConditions, eq(transaction.type, typeFilter as 'BUY' | 'SELL'));
    }

    let sortColumn;
    switch (sortBy) {
        case 'totalBaseCurrencyAmount':
            sortColumn = transaction.totalBaseCurrencyAmount;
            break;
        case 'quantity':
            sortColumn = transaction.quantity;
            break;
        case 'pricePerCoin':
            sortColumn = transaction.pricePerCoin;
            break;
        default:
            sortColumn = transaction.timestamp;
    }

    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(transaction)
        .leftJoin(coin, eq(transaction.coinId, coin.id))
        .where(whereConditions);

    const transactions = await db
        .select({
            id: transaction.id,
            type: transaction.type,
            quantity: transaction.quantity,
            pricePerCoin: transaction.pricePerCoin,
            totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount,
            timestamp: transaction.timestamp,
            coin: {
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                icon: coin.icon
            }
        })
        .from(transaction)
        .leftJoin(coin, eq(transaction.coinId, coin.id))
        .where(whereConditions)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit);

    const formattedTransactions = transactions.map(tx => ({
        ...tx,
        quantity: Number(tx.quantity),
        pricePerCoin: Number(tx.pricePerCoin),
        totalBaseCurrencyAmount: Number(tx.totalBaseCurrencyAmount)
    }));

    return json({
        transactions: formattedTransactions,
        total: count,
        page,
        limit
    });
}
