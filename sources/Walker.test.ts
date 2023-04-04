import { assert, assertArrayIncludes, assertEquals, assertNotEquals, assertStrictEquals } from "https://deno.land/std@0.182.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.182.0/path/mod.ts"

import { Walker, NodeKind, defaultJsonLoader, defaultTextLoader } from "./Walker.ts"
import type { DirectoryNode, FileNode, JsonPayload, TextPayload } from "./Walker.ts"

const DATA_BASE_PATH = "tests/data"


Deno.test("basic test, no sorting", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
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

Deno.test("basic test, pathToNode/pathAsStringToNode, directory", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleA" ])
	const node2 = walker.pathAsStringToNode("ModuleA")
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "DIRECTORY")
	assertEquals(node?.name, "ModuleA")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, directory, absolute", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)
	
	const absolutePath = path.resolve(dir, "ModuleA")
	const absolutePathAsParts = absolutePath.split(path.sep).slice(1)

	const node = walker.pathToNode(absolutePathAsParts)
	const node2 = walker.pathAsStringToNode(absolutePath)
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "DIRECTORY")
	assertEquals(node?.name, "ModuleA")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleA", "file1.js" ])
	const node2 = walker.pathAsStringToNode("ModuleA/file1.js")
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "FILE")
	assertEquals(node?.name, "file1.js")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, file, absolute", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const absolutePath = path.resolve(dir, "ModuleA", "file1.js")
	const absolutePathAsParts = absolutePath.split(path.sep).slice(1)
	
	const node = walker.pathToNode(absolutePathAsParts)
	const node2 = walker.pathAsStringToNode(absolutePath)
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "FILE")
	assertEquals(node?.name, "file1.js")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, file, not found", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleC", "file7.js" ])
	const node2 = walker.pathAsStringToNode("ModuleC/file7.js")
	
	assertEquals(node, undefined)
	assertStrictEquals(node, node2)
});

Deno.test("basic test, nodeToPath/nodeToPathAsString, directory", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	const nodes: DirectoryNode[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		onDirectoryNodeEnter (node)
		{
			nodes.push(node)
		}
	},
	{
		sort : true
	})

	const directoryNode = nodes[1]
	const directoryPathAsString = walker.nodeToPathAsString(directoryNode, { absolute : false })
	const directoryPathAsParts = walker.nodeToPath(directoryNode, { absolute : false })
	
	assertEquals(directoryPathAsString, "ModuleA")
	assertEquals(directoryPathAsParts, [ "ModuleA" ])
});

Deno.test("basic test, nodeToPath/nodeToPathAsString, file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	const nodes: FileNode[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		onFileNodeEnter (node)
		{
			nodes.push(node)
		}
	},
	{
		sort : true
	})

	const fileNode = nodes[0]
	const filePathAsString = walker.nodeToPathAsString(fileNode, { absolute : false })
	const filePathAsParts = walker.nodeToPath(fileNode, { absolute : false })
	
	assertEquals(filePathAsString, "ModuleA/file1.js")
	assertEquals(filePathAsParts, [ "ModuleA", "file1.js" ])
});

Deno.test("basic test, with sorting, on enter", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
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
	},
	{
		sort : true
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

Deno.test("basic test, with sorting, on leave", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	const output: string[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
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
	},
	{
		sort : true
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
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	const output: { name: string, isInsideModuleA : boolean }[] = []
	
	const walker = new Walker()
	await walker.init(dir,
	{
		onFileNodeEnter (node)
		{
			const isInsideModuleA = walker.isInsideDirectory(node, [ 'ModuleA' ])
			output.push({ name : node.name, isInsideModuleA })
		}
	},
	{
		sort : true
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

Deno.test("loaders, no loaders", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders", "support")

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		handlers : { /* No loaders specified */ }
	})

	{
		const config = walker.pathAsStringToNode("config.json")
		
		// Ensure we have a valid JsonPayload
		assert(config !== undefined)
		assert(config.kind == "FILE")
		assert(config.payload === null)
	}
	
	{
		const readme = walker.pathAsStringToNode("README.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload === null)
	}
	
	{
		const todo = walker.pathAsStringToNode("TODO")
		
		// Ensure we have a valid TextPayload
		assert(todo !== undefined)
		assert(todo.kind == "FILE")
		assert(todo.payload === null)
	}
});

Deno.test("loaders, default loaders (txt, json)", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders", "support")

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		handlers :
		{
			"" : { loader : defaultTextLoader },
			".txt" : { loader : defaultTextLoader },
			".json" : { loader : defaultJsonLoader },
		}
	})

	{
		const config = walker.pathAsStringToNode("config.json")
		
		// Ensure we have a valid JsonPayload
		assert(config !== undefined)
		assert(config.kind == "FILE")
		assert(config.payload !== null)
		assert(config.payload.type == "json")
		
		// Ensure it has the right content
		assertEquals(config.payload.object,
		{
			"url": "https://whatever.whatever",
			"port": "3000"
		})
	}
	
	{
		const readme = walker.pathAsStringToNode("README.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(
			readme.payload.content,
			"This is only a test\nOf the emergency broadcast system"
		)
	}
	
	{
		const todo = walker.pathAsStringToNode("TODO")
		
		// Ensure we have a valid TextPayload
		assert(todo !== undefined)
		assert(todo.kind == "FILE")
		assert(todo.payload !== null)
		assert(todo.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(
			todo.payload.content,
			"- Start with the 1st thing\n- …\n- $$$"
		)
	}
});

Deno.test("loaders, filter via function", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "filters")
	const files: string[] = []

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		handlers :
		{
			".txt" : { loader : defaultTextLoader },
		}
	},
	{
		filter : (name: string, fullpath: string, kind: NodeKind) =>
		{
			// Exclude directories
			if (kind != NodeKind.FILE)
			{
				return false
			}
			
			// Get the name of the directory containing the file
			const dirname = path.basename( path.dirname(fullpath) )
			
			// Exclude files inside the /logs/ directory
			if (dirname != "logs")
			{
				files.push(name)
				return true
			}
			
			return false
		}
	})

	assertArrayIncludes(files, [ "one.txt", "two.txt" ])
	assert(files.length == 2)
});

Deno.test("loaders, filter via glob", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "filters")
	const files: string[] = []

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		handlers :
		{
			".txt" : { loader : defaultTextLoader },
		},
		
		onFileNodeEnter (node)
		{
			files.push(node.name)
		}
	},
	{
		filter : "!**/logs/**/*.*"
	})

	assertArrayIncludes(files, [ "one.txt", "two.txt" ])
	assert(files.length == 2)
});
