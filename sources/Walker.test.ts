import { assertArrayIncludes, assertEquals } from "https://deno.land/std@0.156.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.156.0/path/mod.ts"

import { Walker } from "./Walker.ts"

const DATA_BASE_PATH = "tests/data"


Deno.test("base-test, no sorting", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const output: string[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		onDirectoryNodeEnter (node)
		{
			const filepath = walker.nodeToPathAsString(node, { absolute : false })
			output.push(filepath)
		},
		
		onFileNodeEnter (node)
		{
			const filepath = walker.nodeToPathAsString(node, { absolute : false })
			output.push(filepath)
		}
	})

	const expected =
	[
		"",  // The walker's root directory
		"ModuleA",
		"ModuleB",
		"ModuleA/file1.js",
		"ModuleA/file2.js",
		"ModuleB/file3.js",
		"ModuleB/file4.js",
	]
	
	// Compare without any expectation regarding the order inside `output`
	assertArrayIncludes(output, expected)
	assertEquals(output.length, expected.length)
});