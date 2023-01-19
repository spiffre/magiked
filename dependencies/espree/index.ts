import type * as EspreeAst from "./ast.d.ts"

import { parse } from "https://esm.sh/v94/espree@9.4.0/es2022/espree.js";

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
