import { expect } from 'chai';
import LRU from 'lru-cache';
import {DocSzCache, DocSzCacheItem} from "./doc-sz-cache";

describe('DocSize Cache', () => {
    describe('DocSzCache', () => {

        it('should correctly instantiate the constructor', () => {
            const cache = new DocSzCache(5, 10);
            expect(cache.items).to.be.instanceOf(LRU);
            expect(cache.items.max).to.equal(5);
            expect(cache.maxValues).to.equal(10);
            expect(cache.cpuUsage).to.equal(0);
        });

        it('should correctly set CPU usage', () => {
            const cache = new DocSzCache(5, 10);
            cache.setPcpu(5);
            expect(cache.cpuUsage).to.equal(5);
        });

        it('should correctly generate a key', () => {
            const cache = new DocSzCache(5, 10);
            const hash = cache.getKey('c1', 'q1', 'o1');
            expect(hash).to.be.a('string').and.equal('["c1","q1","o1"]');
        });

        it('should generate different keys for different input combinations', () => {
            const cache = new DocSzCache(5, 10);
            const hash1 = cache.getKey('c1', 'q1', 'o1');
            const hash2 = cache.getKey('c1', 'q2', 'o1');
            expect(hash1).to.not.equal(hash2);
        });

        it('should correctly retrieve size', () => {
            const cache = new DocSzCache(5, 3);
            let size = cache.getSize('c1', 'q1', 'o1', []);
            expect(size).to.equal(0);
        });

        it('should correctly score item based on CPU usage', () => {
            const cache = new DocSzCache(5, 10);
            let item = new DocSzCacheItem(10);
            item.values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            item.updated = Date.now();
            cache.cpuUsage = 100;

            let score = cache.getItemScore(item);
            expect(score).to.be.within(0, 0.001);
        });

        it('should determine if an update is needed based on item score', () => {
            const cache = new DocSzCache(5, 10);
            let item = new DocSzCacheItem(10);
            item.values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            item.updated = Date.now();

            let score = 0;
            cache.getItemScore = function () {
                return score;
            };

            expect(cache.needsUpdate(item)).to.be.false;
        });

    });

    describe('DocSzCacheItem', () => {

        it('should correctly instantiate the constructor', () => {
            const item = new DocSzCacheItem(10);
            expect(item.maxValues).to.equal(10);
            expect(item.updated).to.equal(0);
            expect(item.values).to.eql([]);
        });

        it('should correctly add data in a normal situation', () => {
            const item = new DocSzCacheItem(10);
            const rand = Math.random();
            item.addData(rand);
            expect(item.values).to.eql([rand]);
            expect(Date.now() - item.updated).to.be.lessThan(100);
        });

        it('should handle data overflow correctly when adding data', () => {
            const item = new DocSzCacheItem(10);
            item.values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const rand = Math.random();
            item.addData(rand);
            expect(item.values).to.eql([2, 3, 4, 5, 6, 7, 8, 9, 10, rand]);
            expect(Date.now() - item.updated).to.be.lessThan(100);
        });

        it('should correctly retrieve the median value for even number of data points', () => {
            const item = new DocSzCacheItem(10);
            item.values = [2, 4, 6, 8, 1, 3, 5, 7];
            expect(item.getValue()).to.equal(4.5);
        });

        it('should correctly retrieve the median value for odd number of data points', () => {
            const item = new DocSzCacheItem(10);
            item.values = [2, 4, 6, 8, 1, 3, 5, 7, 9];
            expect(item.getValue()).to.equal(5);
        });
    });
});
