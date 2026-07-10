import { Option } from 'commander';
import { describe, expect, it } from 'vitest';
import { type PropType, propsToOptions } from './props.js';

describe('propsToOptions', () => {
  it('returns an Option for each prop', () => {
    const options = propsToOptions({
      name: { type: String },
      age: { type: Number },
    });
    expect(options).toHaveLength(2);
    expect(options.every(o => o instanceof Option)).toBe(true);
  });

  it('converts camelCase prop names to kebab-case flags', () => {
    const [option] = propsToOptions({ myPropName: { type: String } });
    expect(option.long).toBe('--my-prop-name');
  });

  it('sets the description', () => {
    const [option] = propsToOptions({
      host: { type: String, description: 'Server host' },
    });
    expect(option.description).toBe('Server host');
  });

  it('adds a short alias flag', () => {
    const [option] = propsToOptions({ port: { type: Number, alias: 'p' } });
    expect(option.short).toBe('-p');
  });

  it('sets mandatory when required is true', () => {
    const [option] = propsToOptions({
      token: { type: String, required: true },
    });
    expect(option.mandatory).toBe(true);
  });

  it('does not set mandatory when required is false', () => {
    const [option] = propsToOptions({
      token: { type: String, required: false },
    });
    expect(option.mandatory).toBe(false);
  });

  it('applies choices when enum is provided', () => {
    const [option] = propsToOptions({
      level: { type: String, enum: ['info', 'warn', 'error'] },
    });
    expect(option.argChoices).toEqual(['info', 'warn', 'error']);
  });

  it('sets default value from the default factory', () => {
    const [option] = propsToOptions({
      timeout: { type: Number, default: () => 30 },
    });
    expect(option.defaultValue).toBe(30);
  });

  it('marks Boolean type as boolean option', () => {
    const [option] = propsToOptions({ verbose: { type: Boolean } });
    expect(option.isBoolean()).toBe(true);
  });

  it('parses Number type as integer', () => {
    const [option] = propsToOptions({ workers: { type: Number } });
    expect(option.parseArg?.('4', '')).toBe(4);
  });

  it('throws InvalidArgumentError for non-numeric Number input', () => {
    const [option] = propsToOptions({ workers: { type: Number } });
    expect(() => option.parseArg?.('abc', '')).toThrow('Not a number.');
  });

  it('parses BigInt type', () => {
    const [option] = propsToOptions({
      bigNum: { type: BigInt as any as PropType<bigint> },
    });
    expect(option.parseArg?.('9007199254740993', '')).toBe(9007199254740993n);
  });

  it('throws InvalidArgumentError for non-BigInt input', () => {
    const [option] = propsToOptions({
      bigNum: { type: BigInt as any as PropType<bigint> },
    });
    expect(() => option.parseArg?.('not-a-bigint', '')).toThrow(
      'Not a big number.',
    );
  });

  it('uses a custom parser when provided', () => {
    const parser = (v: string) => v.trim().toUpperCase();
    const [option] = propsToOptions({ label: { type: String, parser } });
    expect(option.parseArg?.('  hello  ', '')).toBe('HELLO');
  });

  it('handles empty props map', () => {
    expect(propsToOptions({})).toEqual([]);
  });
});
