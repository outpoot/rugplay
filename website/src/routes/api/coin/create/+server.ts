import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { coin, user, priceHistory } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { uploadCoinIcon } from '$lib/server/s3';
import { CREATION_FEE, FIXED_SUPPLY, STARTING_PRICE, INITIAL_LIQUIDITY, TOTAL_COST, MAX_FILE_SIZE } from '$lib/data/constants';
import { isNameAppropriate } from '$lib/server/moderation';

async function validateInputs(name: string, symbol: string, iconFile: File | null) {
    if (!name || name.length < 2 || name.length > 255) {
        throw error(400, 'Name must be between 2 and 255 characters');
    }

    if (!symbol || symbol.length < 2 || symbol.length > 10) {
        throw error(400, 'Symbol must be between 2 and 10 characters');
    }

    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(name)) {
        throw error(400, 'Coin name must contain only letters and numbers');
    }

    if (!alphanumericRegex.test(symbol)) {
        throw error(400, 'Coin symbol must contain only letters and numbers');
    }

    const nameAppropriate = await isNameAppropriate(name);
    if (!nameAppropriate) {
        throw error(400, 'Coin name contains inappropriate content');
    }

    const symbolAppropriate = await isNameAppropriate(symbol);
    if (!symbolAppropriate) {
        throw error(400, 'Coin symbol contains inappropriate content');
    }

    if (iconFile && iconFile.size > MAX_FILE_SIZE) {
        throw error(400, 'Icon file must be smaller than 1MB');
    }
}

async function handleIconUpload(iconFile: File | null, symbol: string): Promise<string | null> {
    if (!iconFile || iconFile.size === 0) {
        return null;
    }

    const arrayBuffer = await iconFile.arrayBuffer();
    return await uploadCoinIcon(
        symbol,
        new Uint8Array(arrayBuffer),
        iconFile.type
    );
}

export async function POST({ request }) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const symbol = formData.get('symbol') as string;
    const iconFile = formData.get('icon') as File | null;

    const normalizedSymbol = symbol?.toUpperCase();
    const userId = Number(session.user.id);

    await validateInputs(name, normalizedSymbol, iconFile);

    let createdCoin: any;
    let iconKey: string | null = null;

    await db.transaction(async (tx) => {
        const existingCoin = await tx.select().from(coin).where(eq(coin.symbol, normalizedSymbol)).limit(1);
        if (existingCoin.length > 0) {
            throw error(400, 'A coin with this symbol already exists');
        }

        const [userData] = await tx
            .select({ baseCurrencyBalance: user.baseCurrencyBalance })
            .from(user)
            .where(eq(user.id, userId))
            .for('update')
            .limit(1);

        if (!userData) {
            throw error(404, 'User not found');
        }

        const currentBalance = Number(userData.baseCurrencyBalance);
        if (currentBalance < TOTAL_COST) {
            throw error(400, `Insufficient funds. You need $${TOTAL_COST.toFixed(2)} but only have $${currentBalance.toFixed(2)}.`);
        }

        await tx.update(user)
            .set({
                baseCurrencyBalance: (currentBalance - TOTAL_COST).toString(),
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        const [newCoin] = await tx.insert(coin).values({
            name,
            symbol: normalizedSymbol,
            icon: null,
            creatorId: userId,
            initialSupply: FIXED_SUPPLY.toString(),
            circulatingSupply: FIXED_SUPPLY.toString(),
            currentPrice: STARTING_PRICE.toString(),
            marketCap: (FIXED_SUPPLY * STARTING_PRICE).toString(),
            poolCoinAmount: FIXED_SUPPLY.toString(),
            poolBaseCurrencyAmount: INITIAL_LIQUIDITY.toString()
        }).returning();

        createdCoin = newCoin;

        await tx.insert(priceHistory).values({
            coinId: newCoin.id,
            price: STARTING_PRICE.toString()
        });
    });

    if (iconFile && iconFile.size > 0) {
        try {
            iconKey = await handleIconUpload(iconFile, normalizedSymbol);

            await db.update(coin)
                .set({ icon: iconKey })
                .where(eq(coin.id, createdCoin.id));

            createdCoin.icon = iconKey;
        } catch (e) {
            console.error('Icon upload failed after coin creation:', e);
            // coin is still created successfully, just without icon
        }
    }

    return json({
        success: true,
        coin: {
            id: createdCoin.id,
            name: createdCoin.name,
            symbol: createdCoin.symbol,
            icon: createdCoin.icon
        },
        feePaid: CREATION_FEE,
        liquidityDeposited: INITIAL_LIQUIDITY,
        initialPrice: STARTING_PRICE,
        supply: FIXED_SUPPLY,
        message: "Coin created! All tokens are in the liquidity pool. Buy some if you want to hold them."
    });
}
