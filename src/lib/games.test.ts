import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by single category', async () => {
        const [cat1] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat1' })
            .returning({ id: categories.id });
        const [cat2] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat2' })
            .returning({ id: categories.id });
        const [pub] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Game A', description: 'Desc A', categoryId: cat1.id, publisherId: pub.id, starRating: 4.0 },
            { title: 'Game B', description: 'Desc B', categoryId: cat2.id, publisherId: pub.id, starRating: 4.0 },
            { title: 'Game C', description: 'Desc C', categoryId: cat1.id, publisherId: pub.id, starRating: 4.0 },
        ]);

        const filtered = await getGamesByFilters(db, { categoryIds: [cat1.id] });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title)).toEqual(['Game A', 'Game C']);
    });

    it('filters games by multiple categories (OR logic)', async () => {
        const [cat1] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat1' })
            .returning({ id: categories.id });
        const [cat2] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat2' })
            .returning({ id: categories.id });
        const [cat3] = await db
            .insert(categories)
            .values({ name: 'Adventure', description: 'cat3' })
            .returning({ id: categories.id });
        const [pub] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Game A', description: 'Desc A', categoryId: cat1.id, publisherId: pub.id, starRating: 4.0 },
            { title: 'Game B', description: 'Desc B', categoryId: cat2.id, publisherId: pub.id, starRating: 4.0 },
            { title: 'Game C', description: 'Desc C', categoryId: cat3.id, publisherId: pub.id, starRating: 4.0 },
        ]);

        const filtered = await getGamesByFilters(db, { categoryIds: [cat1.id, cat2.id] });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title)).toEqual(['Game A', 'Game B']);
    });

    it('filters games by publisher', async () => {
        const [cat] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [pub1] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub1' })
            .returning({ id: publishers.id });
        const [pub2] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'pub2' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Game A', description: 'Desc A', categoryId: cat.id, publisherId: pub1.id, starRating: 4.0 },
            { title: 'Game B', description: 'Desc B', categoryId: cat.id, publisherId: pub2.id, starRating: 4.0 },
            { title: 'Game C', description: 'Desc C', categoryId: cat.id, publisherId: pub1.id, starRating: 4.0 },
        ]);

        const filtered = await getGamesByFilters(db, { publisherId: pub1.id });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title)).toEqual(['Game A', 'Game C']);
    });

    it('filters games by both category and publisher', async () => {
        const [cat1] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat1' })
            .returning({ id: categories.id });
        const [cat2] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat2' })
            .returning({ id: categories.id });
        const [pub1] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub1' })
            .returning({ id: publishers.id });
        const [pub2] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'pub2' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Game A', description: 'Desc A', categoryId: cat1.id, publisherId: pub1.id, starRating: 4.0 },
            { title: 'Game B', description: 'Desc B', categoryId: cat2.id, publisherId: pub1.id, starRating: 4.0 },
            { title: 'Game C', description: 'Desc C', categoryId: cat1.id, publisherId: pub2.id, starRating: 4.0 },
            { title: 'Game D', description: 'Desc D', categoryId: cat2.id, publisherId: pub2.id, starRating: 4.0 },
        ]);

        const filtered = await getGamesByFilters(db, { categoryIds: [cat1.id, cat2.id], publisherId: pub1.id });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title)).toEqual(['Game A', 'Game B']);
    });

    it('returns all games when no filters provided', async () => {
        await seedGames(db, 3);
        const filtered = await getGamesByFilters(db);
        expect(filtered.length).toBe(3);
    });

    it('returns all categories ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Puzzle', description: 'cat1' },
            { name: 'Adventure', description: 'cat2' },
            { name: 'Strategy', description: 'cat3' },
        ]);

        const cats = await getAllCategories(db);
        expect(cats.length).toBe(3);
        expect(cats.map((c) => c.name)).toEqual(['Adventure', 'Puzzle', 'Strategy']);
    });

    it('returns all publishers ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Pub B', description: 'pub2' },
            { name: 'Pub A', description: 'pub1' },
            { name: 'Pub C', description: 'pub3' },
        ]);

        const pubs = await getAllPublishers(db);
        expect(pubs.length).toBe(3);
        expect(pubs.map((p) => p.name)).toEqual(['Pub A', 'Pub B', 'Pub C']);
    });
});
