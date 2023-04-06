import * as path from "https://deno.land/std@0.182.0/path/mod.ts"
import { assert } from "https://deno.land/std@0.182.0/testing/asserts.ts";

import micromatch from "https://esm.sh/micromatch@4.0.5"

import { NodeKind } from "./Graph.ts"
import type { DirectoryNode, FileNode, Payload, FileExtension } from "./Graph.ts"


type FilterFunction = (name: string, fullpath: string, kind: NodeKind) => boolean

type Json =
  | string
  | number
  | boolean
  | null
  | { [property: string]: Json }
  | Json[]

type WalkerOptions<T extends Payload> =
{
	sort?: boolean
	filter?: FilterFunction | string  // A glob pattern
}

interface WalkerTraversalOptions<T extends Payload>
{
	onFileNodeEnter?: (node: FileNode<T>, walker: Walker<T>, filepath?: string) => void
	onDirectoryNodeEnter?: (node: DirectoryNode<T>, walker: Walker<T>, dirpath?: string) => void

	onFileNodeLeave?: (node: FileNode<T>, walker: Walker<T>, filepath?: string) => void
	onDirectoryNodeLeave?: (node: DirectoryNode<T>, walker: Walker<T>, dirpath?: string) => void
}

export type { FileNode, DirectoryNode, Payload }
export { NodeKind }


export class Walker<T extends Payload>
{
	root: DirectoryNode<T>|null
	rootPath: string[]
	rootPathAsString: string
	
	currentFileId: number
	
	hooks: WalkerTraversalOptions<T>
	options: WalkerOptions<T>
	errors: string[]


	constructor ()
	{
		this.root = null
		this.currentFileId = 0
		this.rootPathAsString = ''
		this.rootPath = []
		this.hooks = {}
		this.options = {}
		this.errors = []
	}
	
	async init (directory: string, hooks: WalkerTraversalOptions<T> = {}, options: WalkerOptions<T> = {}): Promise<void>
	{
		// Ensure the path is absolute and normalized
		directory = path.resolve(directory)
		
		const name = path.basename(directory)
		
		this.hooks = hooks
		this.options = options
		this.rootPathAsString = directory
		this.rootPath = directory.split( path.sep ).slice(1)
		
		// Perform the initial walk
		this.root = await this.readDir(name, directory)
	}
	
	async readDir (name: string, dirpath: string, parent: DirectoryNode<T>|null = null): Promise<DirectoryNode<T>>
	{
		const directories: Record<string, DirectoryNode<T>> = {}
		const files: Record<string, FileNode<T>> = {}
		
		// Create a placeholder entry object
		const dirNode: DirectoryNode<T> =
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
		await this.hooks.onDirectoryNodeEnter?.(dirNode, this, dirpath)
		
		// Read the directory's content
		const entries: Deno.DirEntry[] = []
		for await (const fileOrDirectory of await Deno.readDir(dirpath))
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
			const stats = await Deno.stat(entryFullpath)
			
			if (stats.isDirectory)
			{
				let include = true
				
				if (typeof this.options.filter == "function")
				{
					include = this.options.filter(fileOrDirectory.name, entryFullpath, NodeKind.DIRECTORY)
				}
				else if (typeof this.options.filter == "string")  // A glob pattern
				{
					include = micromatch.isMatch(entryFullpath, this.options.filter)
				}
				
				if (include)
				{
					// Create a DirectoryNode<T>
					const subdirNode = await this.readDir(fileOrDirectory.name, entryFullpath, dirNode)
					
					// Attach it to its parent DirectoryNode<T>
					dirNode.directories[fileOrDirectory.name] = subdirNode
					
					// Make sure the count is right
					dirNode.directoryCount++
				}
			}
			else if (stats.isFile)
			{
				let include = true
				
				if (typeof this.options.filter == "function")
				{
					include = this.options.filter(fileOrDirectory.name, entryFullpath, NodeKind.FILE)
				}
				else if (typeof this.options.filter == "string")  // A glob pattern
				{
					include = micromatch.isMatch(entryFullpath, this.options.filter)
				}
				
				if (include)
				{
					// Create a FileNode<T>
					const fileNode = await this.readFile(fileOrDirectory.name, entryFullpath, dirNode)
					
					// Attach it to its parent DirectoryNode<T>
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
		await this.hooks.onDirectoryNodeLeave?.(dirNode, this, dirpath)
		
		return dirNode
	}
	
	async readFile (name: string, filepath: string, parent: DirectoryNode<T>): Promise<FileNode<T>>
	{
		const fileNode: FileNode<T> =
		{
			kind : NodeKind.FILE,
			uid : this.currentFileId++,
			name,
			parent,
			payload : null
		}
		
		// Call the onFileNodeEnter callback, if provided
		await this.hooks.onFileNodeEnter?.(fileNode, this, filepath)
		
		// Call the onFileNodeLeave callback, if provided
		await this.hooks.onFileNodeLeave?.(fileNode, this, filepath)
		
		return fileNode
	}
	
	// NAVIGATION
	
	async traverse (options: WalkerTraversalOptions<T>)
	{
		const traverse = async (directory: DirectoryNode<T>) =>
		{
			// Pre callback for files
			if (typeof options.onFileNodeEnter == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const file of Object.values(directory.files))
				{
					// When we iterate over `files` we know nothing's `undefined`
					assert(file)
					
					await options.onFileNodeEnter(file, this)
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
					
					await options.onDirectoryNodeEnter(subdirectory, this)
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
				
					await options.onFileNodeLeave(file, this)
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
				
					await options.onDirectoryNodeLeave(subdirectory, this)
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
	
	nodeToPath (startNode: FileNode<T> | DirectoryNode<T>, options = { absolute : false }): string[]
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
	
	pathToNode (filepath: string[]): FileNode<T> | DirectoryNode<T> | undefined
	{
		if (this.root == null)
		{
			throw new Error('Uninitialized Walker')
		}
		
		// If filepath is absolute, we slice filepath so we get a path relative to the root
		const isAbsolute = filepath[0] == this.rootPath[0]
		if (isAbsolute)
		{
			let i = 0
			while (this.rootPath[i] == filepath[i])
			{
				i++
			}
			
			filepath = filepath.slice(i)
		}
		
		// Actually we should check here if filepath[last] has an extension or not
		// Whether it has or not determines if we go to the last part with a DirectoryNode<T>
		// Or if we have to stop one before and switch to a FileNode<T>
		
		let dirNode: DirectoryNode<T> = this.root
		
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
		
		const file = dirNode.files[last]
		if (file)
		{
			return file
		}
		
		const directory = dirNode.directories[last]
		if (directory)
		{
			return directory
		}
		
		return undefined
	}
	
	nodeToPathAsString (startNode: FileNode<T> | DirectoryNode<T>, options = { absolute : false }): string
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
	
	pathAsStringToNode (filepath: string, separator = path.sep): FileNode<T> | DirectoryNode<T> | undefined
	{
		const parts = filepath.split(separator)
		const isAbsolute = path.isAbsolute(filepath)
		if (isAbsolute)
		{
			return this.pathToNode(parts.slice(1))
		}
		return this.pathToNode(parts)
	}
	
	// HELPERS
	
	normalizedPath (resourcePath: string, scope: string): string
	{
		const absoluteImportPath = path.resolve(scope, resourcePath)
		return path.relative(this.rootPathAsString, absoluteImportPath)
	}

	isInsideDirectory (node: FileNode<T>|DirectoryNode<T>, fragments: string[]): boolean
	{
		// Track the parent
		let parent: FileNode<T>|DirectoryNode<T>|null = node
		
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
	
	static matches =
	{
		glob (location: string, pattern: string): boolean
		{
			return micromatch.isMatch(location, pattern)
		},
		
		globs (location: string, pattern: string[]): boolean
		{
			return micromatch.isMatch(location, pattern)
		},
		
		regex (location: string, regex: RegExp): boolean
		{
			return regex.test(location)
		},
		
		extension (location: string, extension: FileExtension): boolean
		{
			return path.extname(location) == extension
		},
		
		extensions (location: string, extensions: FileExtension[]): boolean
		{
			return extensions.find( (ext) => path.extname(location) == ext ) != undefined
		},
		
		test (location: string, test: (loc: string) => boolean): boolean
		{
			return test(location)
		}
	}
}


export interface TextPayload extends Payload
{
  type : 'text'  // fixme: How to force type to be re-defined
  content : string
}

export function processorForText (content: string): TextPayload
{
	return {
		type : 'text',
		content
	}
}


export interface JsonPayload extends Payload
{
	type: 'json'  // fixme: How to force type to be re-defined
	object: Json
}

export function processorForJson (content: string): JsonPayload
{
	return {
		type : 'json',
		object : JSON.parse(content)
	}
}
