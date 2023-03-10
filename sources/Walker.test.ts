import { assert, assertArrayIncludes, assertEquals, assertExists, assertNotEquals, assertRejects, assertStrictEquals } from "https://deno.land/std@0.156.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.156.0/path/mod.ts"

import { Walker, defaultJsonLoader, defaultTextLoader, defaultJavascriptLoader } from "./Walker.ts"
import type { DirectoryNode, FileNode, JsonPayload, TextPayload, JavascriptPayload } from "./Walker.ts"

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
			"- Start with the 1st thing\n- ???\n- $$$"
		)
	}
});

Deno.test("loaders, default loaders (js, es modules)", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders/sources")

	const walker = new Walker<JavascriptPayload>()
	await walker.init(dir,
	{
		handlers :
		{
			".js" :
			{
				loader : defaultJavascriptLoader,
				options : { sourceType : "module" },
			}
		}
	})

	{
		const libraryFile = walker.pathAsStringToNode("lib.js")
		
		// Ensure we have a valid JsonPayload
		assert(libraryFile !== undefined)
		assert(libraryFile.kind == "FILE")
		assert(libraryFile.payload !== null)
		assert(libraryFile.payload.type == "javascript")
		
		assert(libraryFile.payload.rootAst?.body)
		
		const [ addExport, subtractExport ] = libraryFile.payload.rootAst.body

		assertExists(addExport)
		assert(addExport.type == "ExportNamedDeclaration")
		assertExists(addExport.declaration)
		assert(addExport.declaration.type == "FunctionDeclaration")
		assertExists(addExport.declaration.id)
		assert(addExport.declaration.id.name == "add")
		
		assertExists(subtractExport)
		assert(subtractExport.type == "ExportNamedDeclaration")
		assertExists(subtractExport.declaration)
		assert(subtractExport.declaration.type == "FunctionDeclaration")
		assertExists(subtractExport.declaration.id)
		assert(subtractExport.declaration.id.name == "subtract")
	}
	
	{
		const mainFile = walker.pathAsStringToNode("main.js")
		
		// Ensure we have a valid JsonPayload
		assert(mainFile !== undefined)
		assert(mainFile.kind == "FILE")
		assert(mainFile.payload !== null)
		assert(mainFile.payload.type == "javascript")
		
		const [ libraryImport ] = mainFile.payload.rootAst.body
		
		assertExists(libraryImport)
		assert(libraryImport.type == "ImportDeclaration")
		assertExists(libraryImport.specifiers)
		assert(libraryImport.specifiers[0]?.type == "ImportSpecifier")
		assert(libraryImport.specifiers[0].imported.name == "a")
		assert(libraryImport.specifiers[1]?.type == "ImportSpecifier")
		assert(libraryImport.specifiers[1].imported.name == "b")
	}
});

Deno.test("loaders, default loaders (js, es modules but with wrong options)", () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders/sources")

	const walker = new Walker<JavascriptPayload>()
	
	assertRejects( async () =>
	{
		await walker.init(dir,
		{
			
			handlers :
			{
				".js" :
				{
					loader : defaultJavascriptLoader,
					options : { sourceType : "commonjs" },  // With sourceType : "commonjs" Espree cannot parse import/export statements
				}
			}
		})
	})
});

Deno.test("loaders, default loaders (js, cjs modules)", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH, "default-loaders/node")

	const walker = new Walker<JavascriptPayload>()
	await walker.init(dir,
	{
		
		handlers :
		{
			".js" :
			{
				loader : defaultJavascriptLoader,
				options : { sourceType : "commonjs" },
			}
		}
	})

	{
		const libraryFile = walker.pathAsStringToNode("lib.js")
		
		// Ensure we have a valid JsonPayload
		assert(libraryFile !== undefined)
		assert(libraryFile.kind == "FILE")
		assert(libraryFile.payload !== null)
		assert(libraryFile.payload.type == "javascript")
		
		const topLevelStatementsOrExpressions = libraryFile.payload.rootAst.body
		const last = topLevelStatementsOrExpressions.pop()!
		
		assert(last.type == "ExpressionStatement")
		
		assert(last.expression.type == "AssignmentExpression")
		assert(last.expression.left.type == "MemberExpression")
		assert(last.expression.left.property.type == "Identifier")
		assert(last.expression.left.property.name == "exports")

		assert(last.expression.left.object.type == "Identifier")
		assert(last.expression.left.object.name == "module")
	}
	
	{
		const mainFile = walker.pathAsStringToNode("main.js")
		
		// Ensure we have a valid JsonPayload
		assert(mainFile !== undefined)
		assert(mainFile.kind == "FILE")
		assert(mainFile.payload !== null)
		assert(mainFile.payload.type == "javascript")
		
		const topLevelStatementsOrExpressions = mainFile.payload.rootAst.body
		const first = topLevelStatementsOrExpressions.shift()!
		
		assert(first.type == "VariableDeclaration")
		assert(first.declarations[0].type == "VariableDeclarator")
		assertExists(first.declarations[0].init)
		assert(first.declarations[0].init.type == "CallExpression")
		assert(first.declarations[0].init.callee.type == "Identifier")
		assert(first.declarations[0].init.callee.name == "require")
	}
});