import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userPortfolio, coin, transaction } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface TransferRequest {
    recipientUsername: string;
    type: 'CASH' | 'COIN';
    amount: number;
    coinSymbol?: string;
}

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }    try {
        const { recipientUsername, type, amount, coinSymbol }: TransferRequest = await request.json();

        if (!recipientUsername || !type || !amount || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
            throw error(400, 'Invalid transfer parameters');
        }

        if (amount > Number.MAX_SAFE_INTEGER) {
            throw error(400, 'Transfer amount too large');
        }

        if (type === 'CASH' && amount < 10) {
            throw error(400, 'Cash transfers require a minimum of $10.00');
        }

        if (type === 'COIN' && !coinSymbol) {
            throw error(400, 'Coin symbol required for coin transfers');
        }

        const senderId = Number(session.user.id);

        return await db.transaction(async (tx) => {
            const [senderData] = await tx
                .select({
                    id: user.id,
                    username: user.username,
                    baseCurrencyBalance: user.baseCurrencyBalance
                })
                .from(user)
                .where(eq(user.id, senderId))
                .for('update')
                .limit(1);

            if (!senderData) {
                throw error(404, 'Sender not found');
            }

            const [recipientData] = await tx
                .select({
                    id: user.id,
                    username: user.username,
                    baseCurrencyBalance: user.baseCurrencyBalance
                })
                .from(user)
                .where(eq(user.username, recipientUsername))
                .for('update')
                .limit(1);

            if (!recipientData) {
                throw error(404, 'Recipient not found');
            }

            if (senderData.id === recipientData.id) {
                throw error(400, 'Cannot transfer to yourself');
            }

            if (type === 'CASH') {
                const senderBalance = Number(senderData.baseCurrencyBalance);
                if (senderBalance < amount) {
                    throw error(400, `Insufficient funds. You have $${senderBalance.toFixed(2)} but trying to send $${amount.toFixed(2)}`);
                }

                const recipientBalance = Number(recipientData.baseCurrencyBalance);

                await tx
                    .update(user)
                    .set({
                        baseCurrencyBalance: (senderBalance - amount).toFixed(8),
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, senderId));

                await tx
                    .update(user)
                    .set({
                        baseCurrencyBalance: (recipientBalance + amount).toFixed(8),
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, recipientData.id));

                await tx.insert(transaction).values({
                    userId: senderId,
                    coinId: 1,
                    type: 'TRANSFER_OUT',
                    quantity: '0',
                    pricePerCoin: '1',
                    totalBaseCurrencyAmount: amount.toString(),
                    timestamp: new Date(),
                    senderUserId: senderId,
                    recipientUserId: recipientData.id
                });

                await tx.insert(transaction).values({
                    userId: recipientData.id,
                    coinId: 1,
                    type: 'TRANSFER_IN',
                    quantity: '0',
                    pricePerCoin: '1',
                    totalBaseCurrencyAmount: amount.toString(),
                    timestamp: new Date(),
                    senderUserId: senderId,
                    recipientUserId: recipientData.id
                });

                return json({
                    success: true,
                    type: 'CASH',
                    amount,
                    recipient: recipientData.username,
                    newBalance: senderBalance - amount
                });

            } else {
                const normalizedSymbol = coinSymbol!.toUpperCase();

                const [coinData] = await tx
                    .select({ id: coin.id, symbol: coin.symbol, name: coin.name, currentPrice: coin.currentPrice })
                    .from(coin)
                    .where(eq(coin.symbol, normalizedSymbol))
                    .limit(1);

                if (!coinData) {
                    throw error(404, 'Coin not found');
                }

                const coinPrice = Number(coinData.currentPrice) || 0;
                const estimatedValue = amount * coinPrice;

                if (estimatedValue < 10) {
                    throw error(400, `Coin transfers require a minimum estimated value of $10.00. ${amount.toFixed(6)} ${coinData.symbol} is worth approximately $${estimatedValue.toFixed(2)}`);
                }

                const [senderHolding] = await tx
                    .select({
                        quantity: userPortfolio.quantity
                    })
                    .from(userPortfolio)
                    .where(and(
                        eq(userPortfolio.userId, senderId),
                        eq(userPortfolio.coinId, coinData.id)
                    ))
                    .for('update')
                    .limit(1);

                if (!senderHolding || Number(senderHolding.quantity) < amount) {
                    const availableAmount = senderHolding ? Number(senderHolding.quantity) : 0;
                    throw error(400, `Insufficient ${coinData.symbol}. You have ${availableAmount.toFixed(6)} but trying to send ${amount.toFixed(6)}`);
                }

                const [recipientHolding] = await tx
                    .select({ quantity: userPortfolio.quantity })
                    .from(userPortfolio)
                    .where(and(
                        eq(userPortfolio.userId, recipientData.id),
                        eq(userPortfolio.coinId, coinData.id)
                    ))
                    .for('update')
                    .limit(1);

                const totalValue = amount * coinPrice;

                const newSenderQuantity = Number(senderHolding.quantity) - amount;
                if (newSenderQuantity > 0.000001) {
                    await tx
                        .update(userPortfolio)
                        .set({
                            quantity: newSenderQuantity.toString(),
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(userPortfolio.userId, senderId),
                            eq(userPortfolio.coinId, coinData.id)
                        ));
                } else {
                    await tx
                        .delete(userPortfolio)
                        .where(and(
                            eq(userPortfolio.userId, senderId),
                            eq(userPortfolio.coinId, coinData.id)
                        ));
                }

                if (recipientHolding) {
                    const newRecipientQuantity = Number(recipientHolding.quantity) + amount;
                    await tx
                        .update(userPortfolio)
                        .set({
                            quantity: newRecipientQuantity.toString(),
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(userPortfolio.userId, recipientData.id),
                            eq(userPortfolio.coinId, coinData.id)
                        ));
                } else {
                    await tx
                        .insert(userPortfolio)
                        .values({
                            userId: recipientData.id,
                            coinId: coinData.id,
                            quantity: amount.toString()
                        });
                }

                await tx.insert(transaction).values({
                    userId: senderId,
                    coinId: coinData.id,
                    type: 'TRANSFER_OUT',
                    quantity: amount.toString(),
                    pricePerCoin: coinPrice.toString(),
                    totalBaseCurrencyAmount: totalValue.toString(),
                    timestamp: new Date(),
                    senderUserId: senderId,
                    recipientUserId: recipientData.id
                });

                await tx.insert(transaction).values({
                    userId: recipientData.id,
                    coinId: coinData.id,
                    type: 'TRANSFER_IN',
                    quantity: amount.toString(),
                    pricePerCoin: coinPrice.toString(),
                    totalBaseCurrencyAmount: totalValue.toString(),
                    timestamp: new Date(),
                    senderUserId: senderId,
                    recipientUserId: recipientData.id
                });

                return json({
                    success: true,
                    type: 'COIN',
                    amount,
                    coinSymbol: coinData.symbol,
                    coinName: coinData.name,
                    recipient: recipientData.username,
                    newQuantity: newSenderQuantity
                });
            }
        });

    } catch (e) {
        console.error('Transfer error:', e);
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        return json({ error: 'Transfer failed' }, { status: 500 });
    }
};
