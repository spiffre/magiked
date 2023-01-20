import * as path from "https://deno.land/std@0.156.0/path/mod.ts"
import { assert } from "https://deno.land/std@0.156.0/testing/asserts.ts";

import { espree, type EspreeParseOptions, type EspreeAst, type WithLocation } from "../dependencies/espree/index.ts";

import
{
	type DirectoryNode,
	type FileNode,
	
	EntryType,

} from "./models/DependencyGraph.ts"

import
{
	Payload

} from "./models/MetaAst.ts"


const readDirAsync = Deno.readDir
const readFileAsync = Deno.readFile
const statsAsync = Deno.stat

const ESPREE_PARSE_OPTIONS: EspreeParseOptions =
{
	ecmaVersion : 11,
	sourceType: "commonjs",
}

type WalkerOptions = WalkerTraversalOptions &
{
	sort?: boolean
	filter?: (name: string, fullpath: string) => boolean
}

interface WalkerTraversalOptions
{
	onFileNodeEnter?: (node: FileNode) => void
	onDirectoryNodeEnter?: (node: DirectoryNode) => void

	onFileNodeLeave?: (node: FileNode) => void
	onDirectoryNodeLeave?: (node: DirectoryNode) => void
}

export type { FileNode, DirectoryNode, Payload }


export class Walker
{
	root: DirectoryNode|null
	rootPath: string[]
	rootPathAsString: string
	
	currentFileId: number
	
	options: WalkerOptions
	errors: string[]

	constructor ()
	{
		this.root = null
		this.currentFileId = 0
		this.rootPathAsString = ''
		this.rootPath = []
		this.options = {}
		this.errors = []
	}
	
	async init (directory: string, options: WalkerOptions = {}): Promise<void>
	{
		// Ensure the path is absolute and normalized
		directory = path.resolve(directory)
		
		const name = path.basename(directory)
		
		this.options = options
		this.rootPathAsString = directory
		this.rootPath = directory.split( path.sep ).slice(1)
		this.root = await this.readDir(name, directory)
	}
	
	async readDir (name: string, dirpath: string, parent: DirectoryNode|null = null): Promise<DirectoryNode>
	{
		const directories: Record<string, DirectoryNode> = {}
		const files: Record<string, FileNode> = {}
		
		// Create a placeholder entry object
		const dirNode: DirectoryNode =
		{
			uid : this.currentFileId++,
			name,
			parent,
			type : EntryType.DIRECTORY,
			
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
			const stats = await statsAsync(entryFullpath)
			
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
		const uid = this.currentFileId++
		const type = this.getFileType(name)
		
		const fileNode: FileNode =
		{
			name,
			uid,
			type,
			parent,
			payload : null
		}
		
		// Call the onFileNodeEnter callback, if provided
		this.options.onFileNodeEnter?.(fileNode)
		
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
					await options.onFileNodeEnter(file)
				}
			}
			
			// Pre callback for directories
			if (typeof options.onDirectoryNodeEnter == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const subdirectory of Object.values(directory.directories))
				{
					await options.onDirectoryNodeEnter(subdirectory)
				}
			}
			
			// Process all the subdirectories // Object.values(directory.directories).forEach(traverse)
			for (const subdirectory of Object.values(directory.directories))
			{
				await traverse(subdirectory)
			}
			
			// Post callback for files
			if (typeof options.onFileNodeLeave == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const file of Object.values(directory.files))
				{
					await options.onFileNodeLeave(file)
				}
			}
			
			// Post callback for directories
			if (typeof options.onDirectoryNodeLeave == 'function')
			{
				// We have to do it in series, otherwise we can't guarantee the order in which the callbacks are called
				for (const subdirectory of Object.values(directory.directories))
				{
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
	
	pathToNode (filepath: string[]): FileNode | DirectoryNode
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
			dirNode = dirNode.directories[part]
			
			if (typeof dirNode == 'undefined')
			{
				throw new Error(`Path does not match any node`) // fixme: output up to which part the path was valid
			}
		}
		
		const last = filepath[i]
		const isFile = path.extname(last) != ''
		
		if (isFile)
		{
			const foundFile = dirNode.files[last]
			if (foundFile == undefined)
			{
				throw new Error(`Path does not match any node`)
			}
			return foundFile
		}
		else
		{
			const foundDir = dirNode.directories[last]
			if (foundDir == undefined)
			{
				throw new Error(`Path does not match any node`)
			}
			return foundDir
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
	
	pathAsStringToNode (filepath: string): FileNode | DirectoryNode | null
	{
		return this.pathToNode( filepath.split(path.sep) )
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
	
	// PRIVATE
	
	private getFileType (filename: string): EntryType
	{
		const extension = path.extname(filename)
		//const filenameWithoutExtension = path.basename(filename, extension)
		
		if (extension == '.js')
		{
			return EntryType.SOURCE
		}
		else if (extension == '.json') //&& filenameWithoutExtension == 'module')
		{
			return EntryType.JSON
		}
		else
		{
			return EntryType.UNKNOWN
		}
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
