import type * as EspreeAst from "./ast.ts"

import { parse } from "./espree-and-evk.js";

export interface EspreeParseOptions
{
	ecmaVersion?: 3 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
	sourceType?: "commonjs" | "script" | "module",
}

export const espree =
{
	parse (content: string, options: EspreeParseOptions): EspreeAst.Program
	{
		return parse(content, options)
	}
}

export { EspreeAst }


// Add some custom types
export type WithLocation<T> = T & { start: number, end: number }
