import * as colors from "https://deno.land/std@0.156.0/fmt/colors.ts"
import * as path from "https://deno.land/std@0.156.0/path/mod.ts"
import { parse } from "https://deno.land/std@0.157.0/flags/mod.ts"
import { assert } from "https://deno.land/std@0.156.0/testing/asserts.ts";

import { NodeKind } from "./models/DependencyGraph.ts";
import { Walker, FileNode, DirectoryNode } from "./Walker.ts"


/**
 * Commands:
 *   - stats
 *   - migrate Updates all calls to files that have been migrated to directly use the @platform/core or /facade packages
 *   - remove Deletes all files that have been migrated 
 *   - sort-imports Groups imports and sorts them
 */

;(async function run ()
{
	const args = parse(Deno.args)
	const command = args["_"][0]
	
	console.log('Hello', command)
	
})()
