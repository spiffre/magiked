// @ts-ignore Node-specific code
import pathn from "node:path"

// @ts-ignore Node-specific code
import fsn from "node:fs"

// @ts-ignore Node-specific code
const readDir = async (dirpath: string) =>
{
	const files = await fsn.promises.readdir(dirpath)
	
	// Reshape the returned object to match the Deno API
	return files.map( (filename: string) =>
	{
		const stats = fsn.statSync( pathn.join(dirpath, filename) )
		return {
			name : filename,
			isDirectory : stats.isDirectory(),
			isFile : stats.isFile()
		}
	})
}

// @ts-ignore Node-specific code
const stat = async (path: string) =>
{
	const stats = await fsn.promises.stat(path)
	
	// Clone the object but declare `isDirectory` and `isFile` properties in order to match the Deno API (node has functions for those)
	return {
		...stats,
		
		get isDirectory ()
		{
			return stats.isDirectory()
		},
		
		get isFile ()
		{
			return stats.isFile()
		}
	}
} 

export type DirEntry = { name: string }

export const fs =
{
	readDir,
	stat
}
