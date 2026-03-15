import { config } from 'dotenv';

import { db } from '@onlook/db/src/client';
import { PriceKey, ProductType } from '@onlook/stripe';

import { prices, products } from '@/index';

// Load .env file
config({ path: '../../.env' });

const PRODUCTS = [
    {
        name: 'Onlook Pro',
        type: ProductType.PRO,
        stripeProductId: 'prod_1234567890',
        prices: [
            {
                key: PriceKey.PRO_MONTHLY_TIER_11,
                monthlyMessageLimit: 99999,
                stripePriceId: 'price_1234567890',
            },
        ],
    },
];

export const seedSelfHosted = async () => {
    console.log('Inserting products...');
    const productRows = await db
        .insert(products)
        .values(
            PRODUCTS.map((productData) => ({
                name: productData.name,
                type: productData.type,
                stripeProductId: productData.stripeProductId,
            })),
        )
        .returning();

    console.log('Inserting prices...');
    await db.insert(prices).values(
        PRODUCTS.flatMap((productData, idx) => {
            const productRow = productRows[idx]!;
            return productData.prices.map((priceData) => ({
                productId: productRow.id,
                key: priceData.key,
                monthlyMessageLimit: priceData.monthlyMessageLimit,
                stripePriceId: priceData.stripePriceId,
            }));
        }),
    );
};

(async () => {
    try {
        if (
            !process.env.SUPABASE_DATABASE_URL ||
            !process.env.SUPABASE_URL ||
            !process.env.SUPABASE_SERVICE_ROLE_KEY
        ) {
            const missingVars = [];
            if (!process.env.SUPABASE_DATABASE_URL) missingVars.push('SUPABASE_DATABASE_URL');
            if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
                missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }

        console.log('Seeding self hosted...');
        await seedSelfHosted();
        console.log('Seeded!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();
