import { describe, expect, it } from 'vitest';
import { TimeSpan } from './TimeSpan';

describe('TimeSpan', () => {
  describe('Constructor', () => {
    it('should create a new instance with provided value and unit', () => {
      const ts = new TimeSpan(5, 'h');
      expect(ts.value).toBe(5);
      expect(ts.unit).toBe('h');
    });
  });

  describe('milliseconds()', () => {
    it('should return the correct milliseconds for 1 second', () => {
      const ts = new TimeSpan(1, 's');
      expect(ts.milliseconds()).toBe(1000);
    });

    it('should return the correct milliseconds for 2 minutes', () => {
      const ts = new TimeSpan(2, 'm');
      expect(ts.milliseconds()).toBe(120000);
    });

    it('should return the correct milliseconds for 1 hour', () => {
      const ts = new TimeSpan(1, 'h');
      expect(ts.milliseconds()).toBe(3600000);
    });

    it('should return the correct milliseconds for 1 day', () => {
      const ts = new TimeSpan(1, 'd');
      expect(ts.milliseconds()).toBe(86400000);
    });

    it('should return the correct milliseconds for 1 week', () => {
      const ts = new TimeSpan(1, 'w');
      expect(ts.milliseconds()).toBe(604800000);
    });
  });

  describe('seconds()', () => {
    it('should return the correct number of seconds', () => {
      const ts = new TimeSpan(1000, 'ms');
      expect(ts.seconds()).toBe(1);
    });

    it('should return the correct number of seconds for 3 minutes', () => {
      const ts = new TimeSpan(3, 'm');
      expect(ts.seconds()).toBe(180);
    });
  });

  describe('minutes()', () => {
    it('should return the correct number of minutes', () => {
      const ts = new TimeSpan(60000, 'ms');
      expect(ts.minutes()).toBe(1);
    });
  });

  describe('hours()', () => {
    it('should return the correct number of hours', () => {
      const ts = new TimeSpan(2, 'h');
      expect(ts.hours()).toBe(2);
    });
  });

  describe('days()', () => {
    it('should return the correct number of days', () => {
      const ts = new TimeSpan(1, 'd');
      expect(ts.days()).toBe(1);
    });
  });

  describe('weeks()', () => {
    it('should return the correct number of weeks', () => {
      const ts = new TimeSpan(14, 'd');
      expect(ts.weeks()).toBe(2);
    });
  });

  describe('add()', () => {
    it('should add the correct amount of milliseconds', () => {
      const ts = new TimeSpan(1, 'h');
      const newTs = ts.add(30, 'm');
      expect(newTs.milliseconds()).toBe(5400000); // 1 hour + 30 minutes = 5400000 ms
    });
  });

  describe('subtract()', () => {
    it('should subtract the correct amount of milliseconds', () => {
      const ts = new TimeSpan(2, 'h');
      const newTs = ts.subtract(30, 'm');
      expect(newTs.milliseconds()).toBe(5400000); // 2 hours - 30 minutes = 5400000 ms
    });
  });
});
