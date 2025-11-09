import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transaction, coin, user } from '$lib/server/db/schema';
import { eq, desc, asc, and, or, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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

    // Validate page parameter
    const pageParam = url.searchParams.get('page') || '1';
    const page = parseInt(pageParam);
    if (isNaN(page) || page < 1) {
        throw error(400, 'Invalid page parameter');
    }

    // Validate limit parameter
    const limitParam = url.searchParams.get('limit') || '20';
    const parsedLimit = parseInt(limitParam);
    const limit = isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 50); const recipientUser = alias(user, 'recipientUser');

    const senderUser = alias(user, 'senderUser');

    const conditions = [eq(transaction.userId, userId)];

    if (searchQuery) {
        conditions.push(
            or(
                ilike(coin.name, `%${searchQuery}%`),
                ilike(coin.symbol, `%${searchQuery}%`)
            )!
        );
    }

    if (typeFilter !== 'all') {
        const validTypes = ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;
        if (validTypes.includes(typeFilter as any)) {
            conditions.push(eq(transaction.type, typeFilter as typeof validTypes[number]));
        } else {
            throw error(400, `Invalid type parameter. Allowed: ${validTypes.join(', ')}`);
        }
    }

    const whereConditions = conditions.length === 1 ? conditions[0] : and(...conditions);

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

    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn); const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(transaction)
        .innerJoin(coin, eq(transaction.coinId, coin.id))
        .where(whereConditions);

    const transactions = await db
        .select({
            id: transaction.id,
            type: transaction.type,
            quantity: transaction.quantity,
            pricePerCoin: transaction.pricePerCoin,
            totalBaseCurrencyAmount: transaction.totalBaseCurrencyAmount,
            timestamp: transaction.timestamp,
            recipientUserId: transaction.recipientUserId,
            senderUserId: transaction.senderUserId,
            coin: {
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                icon: coin.icon
            },
            recipientUser: {
                id: recipientUser.id,
                username: recipientUser.username
            },
            senderUser: {
                id: senderUser.id,
                username: senderUser.username
            }
        }).from(transaction)
        .innerJoin(coin, eq(transaction.coinId, coin.id))
        .leftJoin(recipientUser, eq(transaction.recipientUserId, recipientUser.id))
        .leftJoin(senderUser, eq(transaction.senderUserId, senderUser.id))
        .where(whereConditions)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit);

    const formattedTransactions = transactions.map(tx => {
        const isTransfer = tx.type.startsWith('TRANSFER_');
        const isIncoming = tx.type === 'TRANSFER_IN';
        const isCoinTransfer = isTransfer && Number(tx.quantity) > 0;

        let actualSenderUsername = null;
        let actualRecipientUsername = null;

        if (isTransfer) {
            actualSenderUsername = tx.senderUser?.username;
            actualRecipientUsername = tx.recipientUser?.username;
        }

        return {
            ...tx,
            quantity: Number(tx.quantity),
            pricePerCoin: Number(tx.pricePerCoin),
            totalBaseCurrencyAmount: Number(tx.totalBaseCurrencyAmount),
            isTransfer,
            isIncoming,
            isCoinTransfer,
            recipient: actualRecipientUsername,
            sender: actualSenderUsername,
            transferInfo: isTransfer ? {
                isTransfer: true,
                isIncoming,
                isCoinTransfer,
                otherUser: isIncoming ?
                    (tx.senderUser ? { id: tx.senderUser.id, username: actualSenderUsername } : null) :
                    (tx.recipientUser ? { id: tx.recipientUser.id, username: actualRecipientUsername } : null)
            } : null
        };
    });

    return json({
        transactions: formattedTransactions,
        total: count,
        page,
        limit
    });
}