import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { validateBetAmount } from '$lib/utils';
import {
    createShuffledDeck, calculateHandValue, isBust, isBlackjack,
    dealerShouldHit, getCardRank, sanitizeDealerHand,
    getSessionKey, sessionTtl,
    type BlackjackSession, type Hand
} from '$lib/server/games/blackjack';
import type { RequestHandler } from './$types';

function buildClientState(session: BlackjackSession, revealDealer?: boolean) {
    const reveal = session.status === 'done' || revealDealer === true;
    return {
        sessionToken: session.sessionToken,
        status: session.status,
        playerHands: session.playerHands.map(h => ({ ...h, value: calculateHandValue(h.cards) })),
        dealerHand: sanitizeDealerHand(session.dealerHand, reveal),
        dealerValue: reveal ? calculateHandValue(session.dealerHand) : null,
        currentHandIndex: session.currentHandIndex,
        insuranceBet: session.insuranceBet,
        betAmount: session.betAmount
    };
}

function dealCard(session: BlackjackSession): string {
    return session.deck.pop()!;
}

async function settleDealerPlay(session: BlackjackSession, userId: number) {
    while (dealerShouldHit(session.dealerHand)) {
        session.dealerHand.push(dealCard(session));
    }

    const dealerValue = calculateHandValue(session.dealerHand);
    const dealerBust = dealerValue > 21;
    const dealerBj = isBlackjack(session.dealerHand);

    let totalPayout = 0;

    for (const hand of session.playerHands) {
        if (hand.status === 'bust' || hand.status === 'lost') {
            continue;
        }
        if (hand.status === 'blackjack') {
            const payout = hand.bet + Math.floor(hand.bet * 1.5 * 100) / 100;
            totalPayout += payout;
            continue;
        }
        if (hand.status === 'standing') {
            const playerValue = calculateHandValue(hand.cards);
            if (dealerBust || playerValue > dealerValue) {
                hand.status = 'won';
                totalPayout += hand.bet * 2;
            } else if (playerValue === dealerValue) {
                hand.status = 'push';
                totalPayout += hand.bet;
            } else {
                hand.status = 'lost';
            }
        }
    }

    if (session.insuranceBet > 0 && dealerBj) {
        totalPayout += session.insuranceBet * 3;
    }

    session.status = 'done';
    session.lastActivity = Date.now();

    const [userData] = await db
        .select({ baseCurrencyBalance: user.baseCurrencyBalance })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
    const newBalance = currentBalance + totalPayout;

    await db
        .update(user)
        .set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() })
        .where(eq(user.id, userId));

    await redis.set(getSessionKey(session.sessionToken), JSON.stringify(session), { EX: sessionTtl });

    return { session, newBalance };
}

async function advanceOrSettle(session: BlackjackSession, userId: number) {
    const nextIndex = session.playerHands.findIndex(
        (h, i) => i > session.currentHandIndex && h.status === 'active'
    );

    if (nextIndex !== -1) {
        session.currentHandIndex = nextIndex;
        await redis.set(getSessionKey(session.sessionToken), JSON.stringify(session), { EX: sessionTtl });
        return { session, settled: false, newBalance: undefined };
    }

    const { session: settledSession, newBalance } = await settleDealerPlay(session, userId);
    return { session: settledSession, newBalance, settled: true };
}

async function loadSession(sessionToken: string): Promise<BlackjackSession> {
    const raw = await redis.get(getSessionKey(sessionToken));
    if (!raw) throw error(404, 'Session not found');
    return JSON.parse(raw) as BlackjackSession;
}

export const POST: RequestHandler = async ({ request }) => {
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) throw error(401, 'Not authenticated');

    const userId = Number(authSession.user.id);

    try {
        const body = await request.json();
        const action: string = body.action;

        if (action === 'deal') {
            const roundedBet = validateBetAmount(body.betAmount);

            const result = await db.transaction(async (tx) => {
                const [userData] = await tx
                    .select({
                        baseCurrencyBalance: user.baseCurrencyBalance,
                        arcadeLosses: user.arcadeLosses,
                        arcadeWins: user.arcadeWins,
                        totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
                        arcadeWinStreak: user.arcadeWinStreak,
                        arcadeBestWinStreak: user.arcadeBestWinStreak,
                        totalArcadeWagered: user.totalArcadeWagered
                    })
                    .from(user)
                    .where(eq(user.id, userId))
                    .for('update')
                    .limit(1);

                const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;

                if (roundedBet > currentBalance) {
                    throw new Error(`Insufficient funds. You need $${roundedBet.toFixed(2)} but only have $${currentBalance.toFixed(2)}`);
                }

                const deck = createShuffledDeck();

                const p0 = deck.pop()!;
                const d0 = deck.pop()!;
                const p1 = deck.pop()!;
                const d1 = deck.pop()!;

                const bytes = new Uint8Array(8);
                crypto.getRandomValues(bytes);
                const sessionToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

                const now = Date.now();

                const session: BlackjackSession = {
                    sessionToken,
                    userId,
                    betAmount: roundedBet,
                    insuranceBet: 0,
                    deck,
                    playerHands: [{
                        cards: [p0, p1],
                        bet: roundedBet,
                        status: 'active',
                        doubled: false
                    }],
                    dealerHand: [d0, d1],
                    currentHandIndex: 0,
                    status: 'active',
                    startTime: now,
                    lastActivity: now,
                    version: 0
                };

                const dealerHasAce = getCardRank(d0) === 'A';
                const playerBj = isBlackjack([p0, p1]);
                const dealerBj = isBlackjack([d0, d1]);

                if (dealerHasAce) {
                    session.status = 'insurance_pending';
                    const newBalance = currentBalance - roundedBet;

                    const updateData: Record<string, unknown> = {
                        baseCurrencyBalance: newBalance.toFixed(8),
                        updatedAt: new Date(),
                        totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
                        totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + roundedBet}`
                    };

                    await tx.update(user).set(updateData).where(eq(user.id, userId));
                    await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                    return { session, newBalance, requiresInsurance: true, settled: false };
                }

                if (playerBj && dealerBj) {
                    session.playerHands[0].status = 'push';
                    session.status = 'done';
                    session.lastActivity = Date.now();

                    const updateData: Record<string, unknown> = {
                        baseCurrencyBalance: currentBalance.toFixed(8),
                        updatedAt: new Date(),
                        totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
                        totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + roundedBet}`
                    };

                    await tx.update(user).set(updateData).where(eq(user.id, userId));
                    await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                    return { session, newBalance: currentBalance, requiresInsurance: false, settled: true };
                }

                if (playerBj) {
                    const bjPayout = roundedBet + Math.floor(roundedBet * 1.5 * 100) / 100;
                    session.playerHands[0].status = 'blackjack';
                    session.status = 'done';
                    session.lastActivity = Date.now();

                    const newBalance = currentBalance - roundedBet + bjPayout;
                    const netResult = bjPayout - roundedBet;
                    const newWinStreak = (userData.arcadeWinStreak || 0) + 1;

                    const updateData: Record<string, unknown> = {
                        baseCurrencyBalance: newBalance.toFixed(8),
                        updatedAt: new Date(),
                        totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
                        totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + roundedBet}`,
                        arcadeWins: `${Number(userData.arcadeWins || 0) + netResult}`,
                        arcadeWinStreak: newWinStreak,
                        arcadeBestWinStreak: Math.max(newWinStreak, userData.arcadeBestWinStreak || 0)
                    };

                    await tx.update(user).set(updateData).where(eq(user.id, userId));
                    await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                    return { session, newBalance, requiresInsurance: false, settled: true };
                }

                const newBalance = currentBalance - roundedBet;

                const updateData: Record<string, unknown> = {
                    baseCurrencyBalance: newBalance.toFixed(8),
                    updatedAt: new Date(),
                    totalArcadeGamesPlayed: (userData.totalArcadeGamesPlayed || 0) + 1,
                    totalArcadeWagered: `${Number(userData.totalArcadeWagered || 0) + roundedBet}`
                };

                await tx.update(user).set(updateData).where(eq(user.id, userId));
                await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                return { session, newBalance, requiresInsurance: false, settled: false };
            });

            if (result.settled) {
                const won = result.session.playerHands.some(h => h.status === 'won' || h.status === 'blackjack');
                await publishArcadeActivity(userId, result.session.betAmount, won, 'blackjack', 2500);
                await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: result.session.betAmount });
            }

            return json({
                ...buildClientState(result.session),
                newBalance: result.newBalance,
                requiresInsurance: result.requiresInsurance ?? false
            });
        }

        if (action === 'insurance') {
            const sessionToken: string = body.sessionToken;
            const session = await loadSession(sessionToken);

            if (session.userId !== userId) throw error(403, 'Forbidden');
            if (session.status !== 'insurance_pending') {
                return json({ error: 'Invalid session state for insurance' }, { status: 400 });
            }

            const takingInsurance = body.take === true;
            let newBalance: number | undefined;

            if (takingInsurance) {
                const halfBet = Math.floor(session.betAmount * 0.5 * 100) / 100;

                const [userData] = await db
                    .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                    .from(user)
                    .where(eq(user.id, userId))
                    .limit(1);

                const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;

                if (halfBet > currentBalance) {
                    throw new Error(`Insufficient funds. You need $${halfBet.toFixed(2)} but only have $${currentBalance.toFixed(2)}`);
                }

                session.insuranceBet = halfBet;
                newBalance = currentBalance - halfBet;

                await db
                    .update(user)
                    .set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() })
                    .where(eq(user.id, userId));
            }

            const dealerBj = isBlackjack(session.dealerHand);
            const playerBj = isBlackjack(session.playerHands[0].cards);

            if (dealerBj) {
                if (playerBj) {
                    session.playerHands[0].status = 'push';
                } else {
                    session.playerHands[0].status = 'lost';
                }

                let totalPayout = 0;

                if (session.playerHands[0].status === 'push') {
                    totalPayout += session.betAmount;
                }

                if (session.insuranceBet > 0) {
                    totalPayout += session.insuranceBet * 3;
                }

                session.status = 'done';
                session.lastActivity = Date.now();

                const [userData] = await db
                    .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                    .from(user)
                    .where(eq(user.id, userId))
                    .limit(1);

                const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
                newBalance = currentBalance + totalPayout;

                await db
                    .update(user)
                    .set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() })
                    .where(eq(user.id, userId));

                await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                const won = session.playerHands[0].status === 'push' || totalPayout > session.betAmount;
                await publishArcadeActivity(userId, session.betAmount, won, 'blackjack', 2500);
                await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: session.betAmount });

                return json({ ...buildClientState(session), newBalance });
            }

            if (playerBj) {
                const bjPayout = session.betAmount + Math.floor(session.betAmount * 1.5 * 100) / 100;
                session.playerHands[0].status = 'blackjack';
                session.status = 'done';
                session.lastActivity = Date.now();

                const [userData] = await db
                    .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                    .from(user)
                    .where(eq(user.id, userId))
                    .limit(1);

                const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
                newBalance = currentBalance + bjPayout;

                await db
                    .update(user)
                    .set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() })
                    .where(eq(user.id, userId));

                await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

                await publishArcadeActivity(userId, session.betAmount, true, 'blackjack', 2500);
                await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: true, arcadeWager: session.betAmount });

                return json({ ...buildClientState(session), newBalance });
            }

            session.status = 'active';
            await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

            return json({ ...buildClientState(session), newBalance });
        }

        if (action === 'hit') {
            const sessionToken: string = body.sessionToken;
            const session = await loadSession(sessionToken);

            if (session.userId !== userId) throw error(403, 'Forbidden');
            if (session.status !== 'active') {
                return json({ error: 'Invalid session state' }, { status: 400 });
            }

            const currentHand = session.playerHands[session.currentHandIndex];
            currentHand.cards.push(dealCard(session));

            const value = calculateHandValue(currentHand.cards);

            if (isBust(currentHand.cards)) {
                currentHand.status = 'bust';
                const { session: updatedSession, newBalance, settled } = await advanceOrSettle(session, userId);

                if (settled) {
                    const won = updatedSession.playerHands.some(h => h.status === 'won' || h.status === 'blackjack');
                    await publishArcadeActivity(userId, updatedSession.betAmount, won, 'blackjack', 2500);
                    await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: updatedSession.betAmount });
                    return json({ ...buildClientState(updatedSession), newBalance });
                }

                return json({ ...buildClientState(updatedSession) });
            }

            if (value === 21) {
                currentHand.status = 'standing';
                const { session: updatedSession, newBalance, settled } = await advanceOrSettle(session, userId);

                if (settled) {
                    const won = updatedSession.playerHands.some(h => h.status === 'won' || h.status === 'blackjack');
                    await publishArcadeActivity(userId, updatedSession.betAmount, won, 'blackjack', 2500);
                    await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: updatedSession.betAmount });
                    return json({ ...buildClientState(updatedSession), newBalance });
                }

                return json({ ...buildClientState(updatedSession) });
            }

            await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });
            return json({ ...buildClientState(session) });
        }

        if (action === 'stand') {
            const sessionToken: string = body.sessionToken;
            const session = await loadSession(sessionToken);

            if (session.userId !== userId) throw error(403, 'Forbidden');
            if (session.status !== 'active') {
                return json({ error: 'Invalid session state' }, { status: 400 });
            }

            const currentHand = session.playerHands[session.currentHandIndex];
            currentHand.status = 'standing';

            const { session: updatedSession, newBalance, settled } = await advanceOrSettle(session, userId);

            if (settled) {
                const won = updatedSession.playerHands.some(h => h.status === 'won' || h.status === 'blackjack');
                await publishArcadeActivity(userId, updatedSession.betAmount, won, 'blackjack', 2500);
                await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: updatedSession.betAmount });
                return json({ ...buildClientState(updatedSession), newBalance });
            }

            return json({ ...buildClientState(updatedSession) });
        }

        if (action === 'double') {
            const sessionToken: string = body.sessionToken;
            const session = await loadSession(sessionToken);

            if (session.userId !== userId) throw error(403, 'Forbidden');
            if (session.status !== 'active') {
                return json({ error: 'Invalid session state' }, { status: 400 });
            }

            const currentHand = session.playerHands[session.currentHandIndex];

            if (currentHand.cards.length !== 2) {
                return json({ error: 'Can only double on initial two cards' }, { status: 400 });
            }

            const extraBet = currentHand.bet;

            const [userData] = await db
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);

            const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;

            if (extraBet > currentBalance) {
                throw new Error(`Insufficient funds. You need $${extraBet.toFixed(2)} but only have $${currentBalance.toFixed(2)}`);
            }

            const balanceAfterDouble = currentBalance - extraBet;

            await db
                .update(user)
                .set({ baseCurrencyBalance: balanceAfterDouble.toFixed(8), updatedAt: new Date() })
                .where(eq(user.id, userId));

            currentHand.bet *= 2;
            currentHand.doubled = true;
            currentHand.cards.push(dealCard(session));

            if (isBust(currentHand.cards)) {
                currentHand.status = 'bust';
            } else {
                currentHand.status = 'standing';
            }

            const { session: updatedSession, newBalance, settled } = await advanceOrSettle(session, userId);

            if (settled) {
                const won = updatedSession.playerHands.some(h => h.status === 'won' || h.status === 'blackjack');
                await publishArcadeActivity(userId, updatedSession.betAmount, won, 'blackjack', 2500);
                await checkAndAwardAchievements(userId, ['arcade', 'wealth'], { arcadeWon: won, arcadeWager: updatedSession.betAmount });
                return json({ ...buildClientState(updatedSession), newBalance });
            }

            return json({ ...buildClientState(updatedSession) });
        }

        if (action === 'split') {
            const sessionToken: string = body.sessionToken;
            const session = await loadSession(sessionToken);

            if (session.userId !== userId) throw error(403, 'Forbidden');
            if (session.status !== 'active') {
                return json({ error: 'Invalid session state' }, { status: 400 });
            }

            const currentHand = session.playerHands[session.currentHandIndex];

            if (currentHand.cards.length !== 2) {
                return json({ error: 'Can only split two-card hands' }, { status: 400 });
            }

            if (getCardRank(currentHand.cards[0]) !== getCardRank(currentHand.cards[1])) {
                return json({ error: 'Can only split matching ranks' }, { status: 400 });
            }

            if (session.playerHands.length >= 2) {
                return json({ error: 'Cannot split more than once' }, { status: 400 });
            }

            const splitBet = currentHand.bet;

            const [userData] = await db
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);

            const currentBalance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;

            if (splitBet > currentBalance) {
                throw new Error(`Insufficient funds. You need $${splitBet.toFixed(2)} but only have $${currentBalance.toFixed(2)}`);
            }

            await db
                .update(user)
                .set({ baseCurrencyBalance: (currentBalance - splitBet).toFixed(8), updatedAt: new Date() })
                .where(eq(user.id, userId));

            const card1 = currentHand.cards[0];
            const card2 = currentHand.cards[1];

            const hand1: Hand = {
                cards: [card1, dealCard(session)],
                bet: splitBet,
                status: 'active',
                doubled: false
            };

            const hand2: Hand = {
                cards: [card2, dealCard(session)],
                bet: splitBet,
                status: 'active',
                doubled: false
            };

            session.playerHands = [hand1, hand2];
            session.currentHandIndex = 0;

            await redis.set(getSessionKey(sessionToken), JSON.stringify(session), { EX: sessionTtl });

            return json({ ...buildClientState(session) });
        }

        return json({ error: 'Invalid action' }, { status: 400 });

    } catch (e) {
        if (e instanceof Error && e.message.startsWith('Insufficient funds')) {
            return json({ error: e.message }, { status: 400 });
        }
        if (typeof e === 'object' && e !== null && 'status' in e) {
            throw e;
        }
        console.error('Blackjack API error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};