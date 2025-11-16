import { parseNumber } from './parse-number';

describe('parseNumber', () => {
  it('should parse numbers with commas', () => {
    expect(parseNumber('1,234,567')).toBe(1234567);
    expect(parseNumber('13,034,431')).toBe(13034431);
    expect(parseNumber('1,000')).toBe(1000);
  });

  it('should parse numbers without commas', () => {
    expect(parseNumber('1234567')).toBe(1234567);
    expect(parseNumber('1000')).toBe(1000);
    expect(parseNumber('0')).toBe(0);
  });

  it('should handle numbers with whitespace', () => {
    expect(parseNumber('  1,234,567  ')).toBe(1234567);
    expect(parseNumber(' 1234567 ')).toBe(1234567);
    expect(parseNumber('\t1000\n')).toBe(1000);
  });

  it('should handle single digit numbers', () => {
    expect(parseNumber('1')).toBe(1);
    expect(parseNumber('9')).toBe(9);
    expect(parseNumber('0')).toBe(0);
  });

  it('should handle large numbers', () => {
    expect(parseNumber('4,600,000,000')).toBe(4600000000);
    expect(parseNumber('999,999,999')).toBe(999999999);
  });

  it('should handle numbers with multiple commas', () => {
    expect(parseNumber('1,2,3,4,5')).toBe(12345);
    expect(parseNumber(',1,234,567,')).toBe(1234567);
  });

  it('should parse negative numbers', () => {
    expect(parseNumber('-1,234')).toBe(-1234);
    expect(parseNumber('-1000')).toBe(-1000);
  });

  it('should handle empty string', () => {
    expect(parseNumber('')).toBeNaN();
  });

  it('should handle whitespace-only string', () => {
    expect(parseNumber('   ')).toBeNaN();
    expect(parseNumber('\t\n')).toBeNaN();
  });

  it('should handle invalid input', () => {
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('12abc34')).toBe(12);
    expect(parseNumber('abc123')).toBeNaN();
  });
});
