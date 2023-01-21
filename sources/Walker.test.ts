import { assert, assertArrayIncludes, assertEquals, assertNotEquals, assertStrictEquals } from "https://deno.land/std@0.156.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.156.0/path/mod.ts"

import { Walker, defaultJsonLoader, defaultTextLoader } from "./Walker.ts"
import type { DirectoryNode, FileNode, JsonPayload, TextPayload } from "./Walker.ts"

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

Deno.test("base-test, pathToNode/pathAsStringToNode, directory", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleA" ])
	const node2 = walker.pathAsStringToNode("ModuleA")
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "DIRECTORY")
	assertEquals(node?.name, "ModuleA")
});

Deno.test("base-test, pathToNode/pathAsStringToNode, file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleA", "file1.js" ])
	const node2 = walker.pathAsStringToNode("ModuleA/file1.js")
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "FILE")
	assertEquals(node?.name, "file1.js")
});

Deno.test("base-test, pathToNode/pathAsStringToNode, not found", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleC", "file7.js" ])
	const node2 = walker.pathAsStringToNode("ModuleC/file7.js")
	
	assertEquals(node, undefined)
	assertStrictEquals(node, node2)
});

Deno.test("base-test, nodeToPath/nodeToPathAsString, directory", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const nodes: DirectoryNode[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		sort : true,
		
		onDirectoryNodeEnter (node)
		{
			nodes.push(node)
		}
	})

	const directoryNode = nodes[1]
	const directoryPathAsString = walker.nodeToPathAsString(directoryNode, { absolute : false })
	const directoryPathAsParts = walker.nodeToPath(directoryNode, { absolute : false })
	
	assertEquals(directoryPathAsString, "ModuleA")
	assertEquals(directoryPathAsParts, [ "ModuleA" ])
});

Deno.test("base-test, nodeToPath/nodeToPathAsString, file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const nodes: FileNode[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		sort : true,
		
		onFileNodeEnter (node)
		{
			nodes.push(node)
		}
	})

	const fileNode = nodes[0]
	const filePathAsString = walker.nodeToPathAsString(fileNode, { absolute : false })
	const filePathAsParts = walker.nodeToPath(fileNode, { absolute : false })
	
	assertEquals(filePathAsString, "ModuleA/file1.js")
	assertEquals(filePathAsParts, [ "ModuleA", "file1.js" ])
});

Deno.test("base-test, with sorting, on enter", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const output: string[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		sort : true,
		
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
		"ModuleA/file1.js",
		"ModuleA/file2.js",
		"ModuleB",
		"ModuleB/file3.js",
		"ModuleB/file4.js",
	]
	
	// Compare with the expectation that the order is correct
	assertEquals(output, expected)
});

Deno.test("base-test, with sorting, on leave", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const output: string[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		sort : true,
		
		onDirectoryNodeLeave (node)
		{
			const filepath = walker.nodeToPathAsString(node, { absolute : false })
			output.push(filepath)
		},
		
		onFileNodeLeave (node)
		{
			const filepath = walker.nodeToPathAsString(node, { absolute : false })
			output.push(filepath)
		}
	})

	const expected =
	[
		"ModuleA/file1.js",
		"ModuleA/file2.js",
		"ModuleA",
		"ModuleB/file3.js",
		"ModuleB/file4.js",
		"ModuleB",
		"",  // The walker's root directory
	]
	
	// Compare with the expectation that the order is correct
	assertEquals(output, expected)
});

Deno.test("helper, isInsideDirectory", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "base-test")
	const output: { name: string, isInsideModuleA : boolean }[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		
		sort : true,
		
		onFileNodeEnter (node)
		{
			const isInsideModuleA = walker.isInsideDirectory(node, [ 'ModuleA' ])
			output.push({ name : node.name, isInsideModuleA })
		}
	})

	const expected =
	[
		{ name : "file1.js", isInsideModuleA : true },
		{ name : "file2.js", isInsideModuleA : true },
		{ name : "file3.js", isInsideModuleA : false },
		{ name : "file4.js", isInsideModuleA : false },
	]
	
	// Compare with the expectation that the order is correct
	assertEquals(output, expected)
});


Deno.test("loaders, default loaders", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders")

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		
		sort : true,
		
		handlers :
		{
			"" : defaultTextLoader,
			".txt" : defaultTextLoader,
			".json" : defaultJsonLoader,
		}
	})

	{
		const config = walker.pathAsStringToNode("samples/config.json")
		
		// Ensure we have a valid JsonPayload
		assert(config !== undefined)
		assert(config.kind == "FILE")
		assert(config.payload !== null)
		assert(config.payload.type == "json")
		
		// Ensure it has the right content
		//const payload = config.payload
		//if (payload.type == "json")
		//{
		//	payload
		//}
	}
	
	{
		const readme = walker.pathAsStringToNode("samples/README.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
	}
	
	{
		const todo = walker.pathAsStringToNode("samples/README.txt")
		
		// Ensure we have a valid TextPayload
		assert(todo !== undefined)
		assert(todo.kind == "FILE")
		assert(todo.payload !== null)
		assert(todo.payload.type == "text")
	}
});
