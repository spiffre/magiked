import * as path from "https://deno.land/std@0.156.0/path/mod.ts"
import { assert } from "https://deno.land/std@0.156.0/testing/asserts.ts";

import { espree, type EspreeParseOptions, type EspreeAst, type WithLocation } from "../dependencies/espree/index.ts";

import { NodeKind } from "./models/DependencyGraph.ts"
import type { DirectoryNode, FileNode, Payload } from "./models/DependencyGraph.ts"

const
{
	readDir : readDirAsync,
	readTextFile : readTextFileAsync,
	stat : statAsync,
	
} = Deno


const ESPREE_PARSE_OPTIONS: EspreeParseOptions =
{
	ecmaVersion : 11,
	sourceType: "commonjs",
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [property: string]: Json }
  | Json[];

type Handler<T> = (filepath: string) => Promise<T>
type HandlerMapping<T extends Payload> =
{
	// fixme: this syntax is utterly incomprehensible
	// Check that U is a type present in T, then get T.extension -- although that's not usually what `as` means in TS...
	[U in T as T['extension']]?: Handler<T>
};

type WalkerOptions<T extends Payload> = WalkerTraversalOptions &
{
	sort?: boolean
	filter?: (name: string, fullpath: string) => boolean
	
	handlers?: HandlerMapping<T>
}

interface WalkerTraversalOptions
{
	onFileNodeEnter?: (node: FileNode) => void
	onDirectoryNodeEnter?: (node: DirectoryNode) => void

	onFileNodeLeave?: (node: FileNode) => void
	onDirectoryNodeLeave?: (node: DirectoryNode) => void
}

export type { FileNode, DirectoryNode, Payload }


export class Walker<T extends Payload>
{
	root: DirectoryNode|null
	rootPath: string[]
	rootPathAsString: string
	
	currentFileId: number
	
	options: WalkerOptions<T>
	errors: string[]
	
	private handlers: Map<string, Handler<T>>

	constructor ()
	{
		this.root = null
		this.currentFileId = 0
		this.rootPathAsString = ''
		this.rootPath = []
		this.options = {}
		this.errors = []
		this.handlers = new Map()
	}
	
	async init (directory: string, options: WalkerOptions<T> = {}): Promise<void>
	{
		// Ensure the path is absolute and normalized
		directory = path.resolve(directory)
		
		const name = path.basename(directory)
		
		this.options = options
		this.rootPathAsString = directory
		this.rootPath = directory.split( path.sep ).slice(1)
		
		// If in-init handlers are provided, initialize a Record<file extension, handler> mapping
		if (this.options.handlers != undefined)
		{
			const extensions = Object.keys(this.options.handlers)
			const handlers = this.options.handlers as Record<string, Handler<T>>
			
			for (const extension of extensions)
			{
				const handler = handlers[extension]
				this.handlers.set(extension, handler)
			}
		}
		
		// Perform the initial walk
		this.root = await this.readDir(name, directory)
	}
	
	async readDir (name: string, dirpath: string, parent: DirectoryNode|null = null): Promise<DirectoryNode>
	{
		const directories: Record<string, DirectoryNode> = {}
		const files: Record<string, FileNode> = {}
		
		// Create a placeholder entry object
		const dirNode: DirectoryNode =
		{
			kind : NodeKind.DIRECTORY,
			uid : this.currentFileId++,
			name,
			parent,
			
			directories,
			files,
			directoryCount	: 0,
			fileCount		: 0,
		}
		
		// Call the onDirectoryNodeEnter callback, if provided
		this.options.onDirectoryNodeEnter?.(dirNode)
		
		// Read the directory's content
		const entries: Deno.DirEntry[] = []
		for await (const fileOrDirectory of await readDirAsync(dirpath))
		{
			entries.push(fileOrDirectory)
		}
		
		// Sort if needed
		if (this.options.sort == true)
		{
			entries.sort( (a: Deno.DirEntry, b: Deno.DirEntry) =>
			{
				return a.name.localeCompare(b.name)
			})
		}
		
		// Iterate on all sub-directories and files
		for (const fileOrDirectory of entries)
		{
			if (fileOrDirectory.name == ".DS_Store")
			{
				continue
			}
			
			const entryFullpath = path.resolve(dirpath, fileOrDirectory.name)
			const stats = await statAsync(entryFullpath)
			
			if (stats.isDirectory)
			{
				const include = typeof this.options.filter == "function"
									? this.options.filter?.(fileOrDirectory.name, entryFullpath)
									: true
				
				if (include)
				{
					// Create a DirectoryNode
					const subdirNode = await this.readDir(fileOrDirectory.name, entryFullpath, dirNode)
					
					// Attach it to its parent DirectoryNode
					dirNode.directories[fileOrDirectory.name] = subdirNode
					
					// Make sure the count is right
					dirNode.directoryCount++
				}
			}
			else if (stats.isFile)
			{
				const include = typeof this.options.filter == "function"
									? this.options.filter?.(fileOrDirectory.name, entryFullpath)
									: true
				
				if (include)
				{
					// Create a FileNode
					const fileNode = await this.readFile(fileOrDirectory.name, entryFullpath, dirNode)
					
					// Attach it to its parent DirectoryNode
					dirNode.files[fileOrDirectory.name] = fileNode
					
					// Make sure the count is right
					dirNode.fileCount++
				}
			}
			else
			{
				throw new Error("What do you mean, neither a file or a directory??")
			}
		}
		
		// Call the onDirectoryNodeLeave callback, if provided
		this.options.onDirectoryNodeLeave?.(dirNode)
		
		return dirNode
	}
	
	async readFile (name: string, filepath: string, parent: DirectoryNode): Promise<FileNode>
	{
		const fileNode: FileNode =
		{
			kind : NodeKind.FILE,
			uid : this.currentFileId++,
			name,
			parent,
			payload : null
		}
		
		// Call the onFileNodeEnter callback, if provided
		this.options.onFileNodeEnter?.(fileNode)

		// If a handker is provided, use it to load the file's content and process it
		const extension = path.extname(name)
		const handler = this.handlers.get(extension)
		if (handler)
		{
			fileNode.payload = await handler(filepath)
		}
		
		// Call the onFileNodeLeave callback, if provided
		this.options.onFileNodeLeave?.(fileNode)
		
		return fileNode
	}
	
	// NAVIGATION
	
	async traverse (options: WalkerTraversalOptions)
	{
		async function traverse (directory: DirectoryNode)
		{
			// Pre callback for files
			if (typeof options.onFileNodeEnter == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const file of Object.values(directory.files))
				{
					// When we iterate over `files` we know nothing's `undefined`
					assert(file)
					
					await options.onFileNodeEnter(file)
				}
			}
			
			// Pre callback for directories
			if (typeof options.onDirectoryNodeEnter == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const subdirectory of Object.values(directory.directories))
				{
					// When we iterate over `directories` we know nothing's `undefined`
					assert(subdirectory)
					
					await options.onDirectoryNodeEnter(subdirectory)
				}
			}
			
			// Process all the subdirectories // Object.values(directory.directories).forEach(traverse)
			for (const subdirectory of Object.values(directory.directories))
			{
				// When we iterate over `directories` we know nothing's `undefined`
				assert(subdirectory)
				
				await traverse(subdirectory)
			}
			
			// Post callback for files
			if (typeof options.onFileNodeLeave == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const file of Object.values(directory.files))
				{
					// When we iterate over `file` we know nothing's `undefined`
					assert(file)
				
					await options.onFileNodeLeave(file)
				}
			}
			
			// Post callback for directories
			if (typeof options.onDirectoryNodeLeave == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const subdirectory of Object.values(directory.directories))
				{
					// When we iterate over `directories` we know nothing's `undefined`
					assert(subdirectory)
				
					await options.onDirectoryNodeLeave(subdirectory)
				}
			}
		}
		
		if (this.root == null)
		{
			throw new Error(`Uninitialized Walker`)
		}
		
		await traverse(this.root)
	}
	
	// PATH/NODE and NODE/PATH CONVERSION
	
	nodeToPath (startNode: FileNode | DirectoryNode, options = { absolute : false }): string[]
	{
		let node = startNode
		const buffer = []
		
		while (node.parent != null)
		{
			buffer.unshift(node.name)
			node = node.parent
		}
		
		return options.absolute
				? [ ...this.rootPath, ...buffer ]
				: buffer
	}
	
	pathToNode (filepath: string[]): FileNode | DirectoryNode | undefined
	{
		if (this.root == null)
		{
			throw new Error(`Uninitialized Walker`)
		}
		
		// Actually we should check here if filepath[last] has an extension or not
		// Whether it has or not determines if we go to the last part with a DirectoryNode
		// Or if we have to stop one before and switch to a FileNode
		
		let dirNode: DirectoryNode = this.root
		
		// If filepath starts with ./, we want to skip over that because the logic below already assumes a path
		// relative to Walker.rootPathAsString (and therefore does not need the ./ prefix)
		let i = 0
		
		for (; i < filepath.length - 1; i++)
		{
			const part = filepath[i]
			const temp = dirNode.directories[part]
			
			if (temp == undefined)
			{
				return undefined
			}
			
			dirNode = temp
		}
		
		const last = filepath[i]
		const isFile = path.extname(last) != ''
		
		if (isFile)
		{
			const fileFoundOrNot = dirNode.files[last]
			return fileFoundOrNot
		}
		else
		{
			const directoryFoundOrNot = dirNode.directories[last]
			return directoryFoundOrNot
		}
	}
	
	nodeToPathAsString (startNode: FileNode | DirectoryNode, options = { absolute : false }): string
	{
		const separator = path.sep
		
		let node = startNode
		let buffer = ""
		
		while (node.parent != null)
		{
			buffer = node.name + (buffer.length > 0 ? separator : "") + buffer
			node = node.parent
		}
		
		// If the buffer is empty, we're looking at the root directory
		//if (buffer == '')
		//{
		//	// We return ./ instead of an empty string
		//	buffer = './'
		//}
		
		// Be aware that buffer can be an empty string (for the root directory)
		return options.absolute
				? path.join(this.rootPathAsString, buffer)
				: buffer
	}
	
	pathAsStringToNode (filepath: string, separator = path.sep): FileNode | DirectoryNode | undefined
	{
		return this.pathToNode( filepath.split(separator) )
	}
	
	// HELPERS
	
	normalizedPath (resourcePath: string, scope: string): string
	{
		const absoluteImportPath = path.resolve(scope, resourcePath)
		return path.relative(this.rootPathAsString, absoluteImportPath)
	}

	isInsideDirectory (node: FileNode|DirectoryNode, fragments: string[]): boolean
	{
		// Track the parent
		let parent: FileNode|DirectoryNode|null = node
		
		// Track the current fragment we're trying to match
		let i = fragments.length - 1
		
		// Track whether or not we have started matching
		let matching = false
		
		// Walk back the path
		while (parent != null)
		{
			// If the current directory name matches the current fragment
			if (parent.name == fragments[i])
			{
				// If we hadn't yet started matching, we have now
				if (matching == false)
				{
					matching = true
				}
				// Otherwise, we are still on track to match
				
				
				// Get to the next fragment we're attempting to match
				i--
				
				// If we ran out of fragment, it means we have contiguously matched all fragments
				if (i < 0)
				{
					// We are indeed below the path fragment(s)
					return true
				}
			}
			// Otherwise
			else
			{
				// If we had started matching and we no longer do, then we're not under the specified fragments (which *must* be contiguous !)
				if (matching == true)
				{
					// Early out because there's simply no match // fixme: actually, it could still match up the chain if we have nested directories of the same name
					return false
				}
				
				// Otherwise, do nothing and keep going up
			}
			
			parent = parent.parent
		}
		
		// No match was found
		return false
	}
}


export interface TextPayload extends Payload
{
  // fixme: How to force type and extension to be re-defined ?
  type : 'text'
  extension : '.txt' | ''

  content : string
}

export async function defaultTextLoader (filepath: string): Promise<TextPayload>
{
	const content = await readTextFileAsync(filepath)

	return {
		type : 'text',
		extension : '.txt',
		content
	}
}

export interface JsonPayload extends Payload
{
	// fixme: How to force type and extension to be re-defined ?
	type: 'json'
	extension: '.json'

	object: Json
}

export async function defaultJsonLoader (filepath: string): Promise<JsonPayload>
{
	const content = await readTextFileAsync(filepath)
	const object = JSON.parse(content)

	return {
		type : 'json',
		extension : '.json',
		object
	}
}


// fixme: todo: there's something odd about normalized path
// - They are expressed as paths relative to Walker.rootPathAsString
// - We ensure they start with ./
// - In most situations, that's just noise
// - We do need it when we want to re-write those paths because siblings end up without the ./ prefix and we would like to have it
// - Except at this stage it's impossible to differentiate btw a package name (ie @platform/core, which does not need the prefix)
//   and a relative path (ie client/core/System/System.js, which does need the ./ prefix)
// - Maybe we should instead store this information when it's easy to deduce
