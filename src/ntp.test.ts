import { expect } from 'chai';
import { Ntp } from '@/ntp';

describe('Ntp', () => {
  describe('Ntp._now()', () => {
    it('should return correct Date.now', () => {
      const now = Ntp._now();
      expect(now).to.be.greaterThan(0);
      expect(typeof now).to.equal('number');
    });

    it('should handle Date.now as Date object', () => {
      const oldDateNow = Date.now;

      Date.now = function (): any {
        return new Date();
      };

      // @ts-ignore
      expect(typeof Date.now().getTime()).to.equal('number');

      const now = Ntp._now();
      expect(now).to.be.greaterThan(0);
      expect(typeof now).to.equal('number');

      Date.now = oldDateNow;
    });
  });
});
