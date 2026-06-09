import {
	type Data,
	type IfAny,
	arrayable,
	isNumber,
	kebabCase,
} from '@andrew_l/toolkit';
import { InvalidArgumentError, Option } from 'commander';

/**
 * Declaration for a single typed app prop.
 * @group Props
 */
export interface PropOptions<T = any> {
	type: PropType<T> | null;
	description?: string;
	alias?: string;
	required?: boolean;
	env?: string | string[];
	default?: () => InferPropType<T>;
	parser?: (value: string) => InferPropType<T>;
	enum?: string[];
}

/**
 * @group Props
 */
export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

/**
 * Map of prop declarations keyed by name — passed as `props` in `defineApp`.
 * @group Props
 */
export type ObjectPropsOptions<P = Data> = {
	[K in keyof P]: PropOptions<P[K]>;
};

type PropConstructor<T = any> =
	| { new (...args: any[]): T & {} }
	| { (): T }
	| PropMethod<T>;

type PropMethod<T, TConstructor = any> = [T] extends [
	((...args: any) => any) | undefined,
] // if is function with args, allowing non-required functions
	? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
	: never;

type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

type RequiredKeys<T> = {
	[K in keyof T]: T[K] extends { required: true } ? K : never;
}[keyof T];

type InferPropType<T> = [T] extends [null]
	? any // null & true would fail to infer
	: [T] extends [{ type: null }]
	? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
	: [T] extends [ObjectConstructor | { type: ObjectConstructor }]
	? Record<string, any>
	: [T] extends [BooleanConstructor | { type: BooleanConstructor }]
	? boolean
	: [T] extends [DateConstructor | { type: DateConstructor }]
	? Date
	: [T] extends [DateConstructor | { type: DateConstructor }]
	? Date
	: [T] extends [StringConstructor | { type: StringConstructor }]
	? string
	: [T] extends [(infer U)[] | { type: (infer U)[] }]
	? U extends DateConstructor
		? Date | InferPropType<U>
		: InferPropType<U>
	: [T] extends [PropOptions<infer V>]
	? unknown extends V
		? IfAny<V, V, V>
		: V
	: T;

/**
 * Resolve the concrete prop value types from an `ObjectPropsOptions` declaration.
 * @group Props
 */
export type ExtractPropTypes<O> = {
	// use `keyof Pick<O, RequiredKeys<O>>` instead of `RequiredKeys<O>` to support IDE features
	[K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>;
} & {
	// use `keyof Pick<O, OptionalKeys<O>>` instead of `OptionalKeys<O>` to support IDE features
	[K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>;
};

const TYPE_TO_PLACEHOLDER = new Map<any, string>([
	[String, '<string>'],
	[Boolean, '<boolean>'],
	[Number, '<number>'],
	[Date, '<date>'],
	[Array, '<array>'],
]);

/**
 * Convert an `ObjectPropsOptions` map into Commander `Option` instances.
 * @group Internals
 */
export function propsToOptions(props: ObjectPropsOptions): Option[] {
	const result: Option[] = [];

	for (const [
		name,
		{
			description,
			type,
			default: defaultValue,
			required,
			enum: variants,
			alias,
			env,
			parser,
		},
	] of Object.entries(props)) {
		const flagName = kebabCase(name);

		const typePlaceholder = TYPE_TO_PLACEHOLDER.get(type);

		const envVariables = arrayable(env);

		const option = new Option(
			[alias ? `-${alias}, ` : '', `--${flagName}`, typePlaceholder]
				.filter(Boolean)
				.join(' '),
			description,
		);

		if (variants?.length) {
			option.choices(variants);
		}

		if (envVariables.length) {
			option.env(envVariables.join(', '));
			option.default(getEnv(envVariables) || defaultValue?.());
		} else if (defaultValue) {
			option.default(defaultValue());
		}

		if (required) {
			option.mandatory = true;
		}

		option.attributeName();

		switch (type) {
			case Boolean: {
				option.isBoolean();
				break;
			}

			case Number: {
				option.argParser(parseNumberArgument);
			}
		}

		if (parser) {
			option.argParser(parser);
		}

		result.push(option);
	}

	return result;
}

function getEnv(variables: string[]): string | undefined {
	for (const env of variables) {
		const value = process.env[env];
		if (value) {
			return value;
		}
	}
}

function parseNumberArgument(value: string) {
	const parsedValue = parseInt(value, 10);
	if (!isNumber(parsedValue)) {
		throw new InvalidArgumentError('Not a number.');
	}
	return parsedValue;
}
