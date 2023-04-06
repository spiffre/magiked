import { assert, assertArrayIncludes, assertEquals, assertNotEquals, assertStrictEquals } from "https://deno.land/std@0.182.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.182.0/path/mod.ts"

import { Walker, NodeKind, processorForJson, processorForText } from "./Walker.ts"
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
		"ModuleA/file1.txt",
		"ModuleA/file2.txt",
		"ModuleB/file3.txt",
		"ModuleB/file4.txt",
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

	const node = walker.pathToNode([ "ModuleA", "file1.txt" ])
	const node2 = walker.pathAsStringToNode("ModuleA/file1.txt")
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "FILE")
	assertEquals(node?.name, "file1.txt")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, file, absolute", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const absolutePath = path.resolve(dir, "ModuleA", "file1.txt")
	const absolutePathAsParts = absolutePath.split(path.sep).slice(1)
	
	const node = walker.pathToNode(absolutePathAsParts)
	const node2 = walker.pathAsStringToNode(absolutePath)
	
	assertNotEquals(node, undefined)
	assertStrictEquals(node, node2)
	
	assertEquals(node?.kind, "FILE")
	assertEquals(node?.name, "file1.txt")
});

Deno.test("basic test, pathToNode/pathAsStringToNode, file, not found", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "basic-test")
	
	const walker = new Walker()
	await walker.init(dir)

	const node = walker.pathToNode([ "ModuleC", "file7.txt" ])
	const node2 = walker.pathAsStringToNode("ModuleC/file7.txt")
	
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
	
	assertEquals(filePathAsString, "ModuleA/file1.txt")
	assertEquals(filePathAsParts, [ "ModuleA", "file1.txt" ])
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
		"ModuleA/file1.txt",
		"ModuleA/file2.txt",
		"ModuleB",
		"ModuleB/file3.txt",
		"ModuleB/file4.txt",
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
		"ModuleA/file1.txt",
		"ModuleA/file2.txt",
		"ModuleA",
		"ModuleB/file3.txt",
		"ModuleB/file4.txt",
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
		{ name : "file1.txt", isInsideModuleA : true },
		{ name : "file2.txt", isInsideModuleA : true },
		{ name : "file3.txt", isInsideModuleA : false },
		{ name : "file4.txt", isInsideModuleA : false },
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
		//handlers : { /* No loaders specified */ }
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

Deno.test("payloads, initial pass (txt, json)", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders", "support")

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)
			
			if (Walker.matches.extension(filepath, ""))
			{
				node.payload = processorForText(content)
			}
			else if (Walker.matches.glob(filepath, "**/*.txt"))
			{
				node.payload = processorForText(content)
			}
			else if (Walker.matches.glob(filepath, "**/*.json"))
			{
				node.payload = processorForJson(content)
			}
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

Deno.test("payloads, initial pass, filter via function", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "filters")
	const files: string[] = []

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)
			
			if (Walker.matches.glob(filepath, "**/*.txt"))
			{
				node.payload = processorForText(content)
			}
		}
	},
	{
		filter (name: string, fullpath: string, kind: NodeKind)
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
	
	{
		const readme = walker.pathAsStringToNode("one.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(readme.payload.content, '1')
	}
	
	{
		const readme = walker.pathAsStringToNode("two.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(readme.payload.content, '2')
	}
});

Deno.test("payloads, initial pass, filter via glob", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "filters")
	const files: string[] = []

	const walker = new Walker<JsonPayload|TextPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)
			
			if (Walker.matches.glob(filepath, "**/*.txt"))
			{
				node.payload = processorForText(content)
			}
			
			files.push(node.name)
		}
	},
	{
		filter : "!**/logs/**/*.*"
	})

	assertArrayIncludes(files, [ "one.txt", "two.txt" ])
	assert(files.length == 2)
	
	{
		const readme = walker.pathAsStringToNode("one.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(readme.payload.content, '1')
	}
	
	{
		const readme = walker.pathAsStringToNode("two.txt")
		
		// Ensure we have a valid TextPayload
		assert(readme !== undefined)
		assert(readme.kind == "FILE")
		assert(readme.payload !== null)
		assert(readme.payload.type == "text")
		
		// Ensure it has the right content
		assertEquals(readme.payload.content, '2')
	}
});
