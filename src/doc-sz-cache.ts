import { LRUCache } from 'lru-cache';
import jsonStringify from 'json-stringify-safe';

interface IData {
    length?: number;
    size?: () => number;
    get?: () => any;
    forEach?: (callback: (element: any) => boolean) => void;
}

export class DocSzCache {
    public items: LRUCache<string, DocSzCacheItem>;
    public maxValues: number;
    cpuUsage: number;

    constructor(maxItems: number, maxValues: number) {
        this.items = new LRUCache({ max: maxItems });
        this.maxValues = maxValues;
        this.cpuUsage = 0;
    }

    public setPcpu(pcpu: number): void {
        this.cpuUsage = pcpu;
    }

    public getSize(coll: any, query: any, opts: any, data: IData): number {
        if (!(data && (data.length || (typeof data.size === 'function' && data.size())))) {
            return 0;
        }

        const key = this.getKey(coll, query, opts);
        let item = this.items.get(key);

        if (!item) {
            item = new DocSzCacheItem(this.maxValues);
            this.items.set(key, item);
        }

        if (this.needsUpdate(item)) {
            let doc = {};
            if (typeof data.get === 'function' && data.forEach) {
                // This is an IdMap
                data.forEach((element: any) => {
                    doc = element;
                    return true;
                });
            } else {
                doc = data[0];
            }
            const size = Buffer.byteLength(jsonStringify(doc), 'utf8');
            item.addData(size);
        }

        return item.getValue();
    }

    public getKey(coll: any, query: any, opts: any): string {
        return jsonStringify([coll, query, opts]);
    }

    public getItemScore(item: DocSzCacheItem): number {
        return [
            (item.maxValues - item.values.length) / item.maxValues,
            (Date.now() - item.updated) / 60000,
            (100 - this.cpuUsage) / 100,
        ].map(score => (score > 1 ? 1 : score))
            .reduce((total, score) => total + score, 0) / 3;
    }

    public needsUpdate(item: DocSzCacheItem): boolean {
        if (!item.values.length) {
            return true;
        }

        const currentTime = Date.now();
        const timeSinceUpdate = currentTime - item.updated;
        if (timeSinceUpdate > 1000 * 60) {
            return true;
        }

        return this.getItemScore(item) > 0.5;
    }
}

export class DocSzCacheItem {
    maxValues: number;
    updated: number;
    values: number[];

    constructor(maxValues: number) {
        this.maxValues = maxValues;
        this.updated = 0;
        this.values = [];
    }

    addData(value: number): void {
        this.values.push(value);
        this.updated = Date.now();

        if (this.values.length > this.maxValues) {
            this.values.shift();
        }
    }

    getValue(): number {
        const sorted = [...this.values].sort((a, b) => a - b);
        let median = 0;
        let idx;

        if (sorted.length % 2 === 0) {
            idx = sorted.length / 2;
            median = (sorted[idx] + sorted[idx - 1]) / 2;
        } else {
            idx = Math.floor(sorted.length / 2);
            median = sorted[idx];
        }

        return median;
    }
}
