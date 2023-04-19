// @ts-ignore Node-specific code
import assertn from "node:assert"

// We can't directly return node's assert function as it will be missing the asserts signature which informs TypeScript of what the function checks
export function assert (expr: unknown, msg = ""): asserts expr
{
	assertn(expr, msg)
}
