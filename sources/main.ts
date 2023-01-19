import * as colors from "https://deno.land/std@0.156.0/fmt/colors.ts"
import * as path from "https://deno.land/std@0.156.0/path/mod.ts"
import { parse } from "https://deno.land/std@0.157.0/flags/mod.ts"
import { assert } from "https://deno.land/std@0.156.0/testing/asserts.ts";

import { EntryType } from "./models/DependencyGraph.ts";
import { Walker, FileNode, DirectoryNode } from "./Walker.ts"

const readFileAsync = Deno.readFile
const writeFileAsync = Deno.writeFile
const removeFileAsync = Deno.remove
const removeDirAsync = Deno.remove

const migrated = new Map()

/**
 * Commands:
 *   - stats
 *   - migrate Updates all calls to files that have been migrated to directly use the @platform/core or /facade packages
 *   - remove Deletes all files that have been migrated 
 *   - sort-imports Groups imports and sorts them
 */

;(async function run ()
{
	const HOMEBYME_SRC_PATH = "/Users/ezj/Documents/Development/3DVIA/HomeByMe/byme_api/src/"
	
	const args = parse(Deno.args)
	const command = args["_"][0]
	
	switch (command)
	{
		case "migrate":
		{
			const walker = new Walker()
			await walker.init(HOMEBYME_SRC_PATH,
			{
				filter (_name: string, fullpath: string): boolean
				{
					if (fullpath.includes('assets'))
					{
						return false
					}
			
					return true
				},
				
				onFileNodeLeave (node: FileNode)
				{
					if (node.type == EntryType.SOURCE)
					{
						assert(node.payload)
						
						const { reexports } = node.payload;
						
						const isMigrated = (
							reexports.length == 1 && (
								reexports[0].path.startsWith("@platform") ||
								reexports[0].path.startsWith("@extlib")
							)
						)
			
						const key = walker.nodeToPathAsString(node, { absolute : false })
						migrated.set(key, isMigrated)
					}
				}
			})
			
			// Update call-sites for files that have been migrated inside HomeByMe/App.js
			await updateCallSitesInPlace(walker, migrated)
			
			break
		}
		
		case "delete":
		{
			const filesToDelete: string[] = []
			const directoriesToDelete: string[] = []
			const deletedModules: string[] = []
			
			const walker = new Walker()
			
			await walker.init(HOMEBYME_SRC_PATH)
			
			// Iterate on all files and directories
			await walker.traverse(
			{
				/**
				 * If a file is a reexport of a @platform or @extlib package, add it to the list of files to delete
				 * and update the parent node
				 */
				onFileNodeLeave : (node: FileNode) =>
				{
					// Early out because we're not interested in these directories
					if (node.parent?.name == 'sass' || node.parent?.name == 'assets')
					{
						return
					}

					// Early out because we don't want to update delete files and directories inside /facade/ for now
					if ( walker.isInsideDirectory(node, [ 'facade' ]) == true )
					{
						return // Comment this to run the logic on facades (which changes the public API so use only to test things out)
					}
					
					// We're only considering .js files
					if (node.type != EntryType.SOURCE)
					{
						return
					}
					
					assert(node.payload)
					
					const { reexports } = node.payload;
					
					const isMigrated = (
						reexports.length == 1 && (
							reexports[0].path.startsWith("@platform") ||
							reexports[0].path.startsWith("@extlib")
						)
					)
		
					if (isMigrated)
					{
						// Add the absolute filepath to the list of files to delete
						const absoluteFilePath = walker.nodeToPathAsString(node, { absolute : true })
						filesToDelete.push(absoluteFilePath)
						
						// Remove the file from the parent node
						if (node.parent)
						{
							node.parent.fileCount--
							delete node.parent.files[node.name]
						}
					}
				},
				
				/**
				 * If a directory is empty, add it to the list of directories to delete
				 * If there was a module.json file left, add it to the list of deleted modules and delete it
				 * This relies on the guarantee that onDirectoryNodeLeave() is called after onFileNodeLeave() was called 
				 * on all the files of the directory *first*
				 */
				onDirectoryNodeLeave : (dirNode: DirectoryNode) =>
				{
					// Early out because we're not interested in these directories
					if (dirNode.name == "sass" || dirNode.name == "assets")
					{
						return
					}
					
					// Early out because we don't want to update delete files and directories inside /facade/ for now
					if ( walker.isInsideDirectory(dirNode, [ 'facade' ]) == true )
					{
						return // Comment this to run the logic on facades (which changes the public API so use only to test things out)
					}
					
					// If the directory has only one file in it and it's a module.json, remove the file
					if (dirNode.fileCount == 1 && dirNode.directoryCount == 0)
					{
						const remainingFileNode = Object.values(dirNode.files)[0]
						if (remainingFileNode.name == "module.json")
						{
							// Add the absolute filepath to the list of files to delete
							const absoluteFilePath = walker.nodeToPathAsString(remainingFileNode, { absolute : true })
							filesToDelete.push(absoluteFilePath)
							
							// Remove the now useless module.json file
							dirNode.fileCount--
							delete dirNode.files[remainingFileNode.name]
							
							// Add it to the list of deleted modules
							deletedModules.push(dirNode.name)
						}
					}
					
					// If the directory is empty, remove it
					if (dirNode.fileCount == 0 && dirNode.directoryCount == 0)
					{
						// Add the absolute dirpath to the list of directories to delete
						const absoluteDirPath = walker.nodeToPathAsString(dirNode, { absolute : true })
						directoriesToDelete.push(absoluteDirPath)
						
						// Remove the directory from the parent node, if any
						if (dirNode.parent)
						{
							dirNode.parent.directoryCount--
							delete dirNode.parent.directories[dirNode.name]
						}
					}
				}
			})
		
			// Remove all files
			for (const filepath of filesToDelete)
			{
				await removeFileAsync(filepath)
			}
			console.log( `${colors.green(filesToDelete.length.toString())} files have been migrated and have been deleted` )
			
			// Remove all empty directories (we make it fail because all in directoriesToDelete should already be empty)
			let deletedCount = directoriesToDelete.length
			const failed: string[] = []
			for (const dirpath of directoriesToDelete)
			{
				try
				{
					await removeDirAsync(dirpath, { recursive : false })
				}
				catch (error)
				{
					const relativePath = path.relative(walker.rootPathAsString, dirpath)
					const errorMsg = error.toString() as string
					const shortMsgShort = errorMsg.substring(0, errorMsg.indexOf('(')).trim()
					
					failed.push(`   ${colors.gray(`Failed to delete ${relativePath} (${shortMsgShort})`)}`)
					deletedCount--
				}
			}
			console.log( `${colors.green(deletedCount.toString())} empty directories have been deleted` )
			failed.forEach( (ln) => console.log(ln) )
			console.log()
			
			// We bypassed the /facade/ directories before (regarding the deletion of files)
			// But below we do need to update the module.json files -- even below /facade/ directories

			// Iterate on all the module.json files again
			await walker.traverse(
			{
				onFileNodeLeave : async (node: FileNode) =>
				{
					if (node.name != 'module.json')
					{
						return
					}

					const absoluteFilePath = walker.nodeToPathAsString(node, { absolute : true })
					const contentAsBuffer = await readFileAsync(absoluteFilePath)
					const contentAsStr = new TextDecoder("utf-8").decode(contentAsBuffer)
					const content = JSON.parse(contentAsStr)
					
					const isStillPresent = (moduleId: string) => deletedModules.includes(moduleId) == false
					
					// We can ignore browserLibraries, nodePackages and public
					// We can ignore facade for now as well as we didn't delete any facade modules
					const {
						core : coreModules,
						dynamic : dynamicModules,
						static : staticModules,
					} = content
					
					if (coreModules)
					{
						content.core = coreModules.filter(isStillPresent)
					}
					
					if (dynamicModules)
					{
						content.dynamic = dynamicModules.filter(isStillPresent)
					}
					if (staticModules)
					{
						content.static = staticModules.filter(isStillPresent)
					}
					
					// Update the file
					const contentAsBufferToWrite = new TextEncoder().encode( JSON.stringify(content, null, 4) )
					await writeFileAsync(absoluteFilePath, contentAsBufferToWrite)
				}
			})
			
			break
		}
		
		case "check":
		{
			const walker = new Walker()
			await walker.init(HOMEBYME_SRC_PATH,
			{
				filter (_name: string, fullpath: string): boolean
				{
					if (fullpath.includes('assets'))
					{
						return false
					}
			
					return true
				},
				
				async onFileNodeLeave (node: FileNode)
				{
					if (node.type == EntryType.SOURCE)
					{
						assert(node.payload)
						
						const filepath = walker.nodeToPathAsString(node, { absolute : true })
						const partial = walker.nodeToPathAsString(node, { absolute : false })
						
						// Read the file
						const contentAsStr = await Deno.readTextFile(filepath)
						
						type StringEdit =
						[
							/* start index for insertion*/ number,
							/* string to insert */ string
						]
						
						// Looking at imports in that JS file
						const { imports, reexports } = node.payload
						const edits: StringEdit[] = []
						
						for (const importAst of imports)
						{
							const edit: StringEdit = [ importAst.loc.end, ` ;if (${importAst.localId} == undefined) { console.log("${importAst.localId} in ${partial} is undefined"); }` ]
							edits.push(edit)
						}
						
						for (const reexportAst of reexports)
						{
							const edit: StringEdit = [ reexportAst.loc.end, ` ;if (module.exports == undefined) { console.log("${reexportAst.symbolId} in ${partial} is undefined"); }` ]
							edits.push(edit)
						}
						
						// Reverse the edit list so that, when we replace them one by one, we start from the end and don't invalidate indices
						edits.reverse()
						
						const updatedContentAsStr = edits.reduce<string>( (acc: string, val: StringEdit) =>
						{
							const startIndex = val[0]
							const textToInsert = val[1]
							
							return stringSplice(acc, startIndex, startIndex, textToInsert)
							
						}, contentAsStr)
						
						// Update the file
						await Deno.writeTextFile(filepath, updatedContentAsStr)
					}
				}
			})
			
			break
		}
		
		case undefined:
		{
			throw new Error("No command has been specified")
		}
		
		default:
		{
			throw new Error(`Unhandled command specified: '${command}'`)
		}
	}
})()


export function stringSplice (str: string, startIndex: number, endIndex: number, insertion: string)
{
	const deleteCount = endIndex - startIndex
	const beginning = str.slice(0, startIndex)
	const end = str.slice(startIndex + deleteCount)
	
	return beginning + insertion + end
}

export async function updateCallSitesInPlace (walker: Walker, migrated: Map<string, boolean>)
{
	let filesUpdatedCount = 0
	let callsiteMigratedCount = 0
	let fileWasUpdated = false
	
	await walker.traverse(
	{
		onFileNodeLeave : async (currentFileNode: FileNode) =>
		{
			// Early out if the file isn't a JS file
			if (currentFileNode.type != EntryType.SOURCE)
			{
				return
			}
			
			// Early out if the file has been migrated
			const temp = walker.nodeToPathAsString(currentFileNode, { absolute : false })
			const isMigrated = migrated.get(temp) == true
			if (isMigrated)
			{
				return
			}
			
			// Early out if the file has no imports
			assert(currentFileNode.payload != null)
			if (currentFileNode.payload.imports.length == 0)
			{
				return
			}

			// Start looking at imports in that JS file
			const imports = currentFileNode.payload.imports
			
			const filepath = walker.nodeToPathAsString(currentFileNode, { absolute : true })
			const dirpath = path.dirname(filepath)
			
			// Collect all import/variable declarations
			type StringEdit = [string, string, number, number]
			const edits: StringEdit[] = []
			
			// Stats
			fileWasUpdated = false
	
			for (const importAst of imports)
			{
				const isMigrated = migrated.get(importAst.path)
				if (isMigrated)
				{
					const node = walker.pathAsStringToNode(importAst.path)
					assert(node && 'payload' in node && node.payload != null)
					
					const reexport = node?.payload?.reexports[0]
					
					const accessorIfAny = reexport.symbolId
												? `.${reexport.symbolId}`
												: ''
					
					// We preserve the use of the localId vs the symbolId so we don't have to edit the code using the required file
					edits.push(
					[
						`var ${importAst.localId}`,
						`= require("${reexport.path}")${accessorIfAny}`,
						importAst.loc.start,
						importAst.loc.end,
					])
					
					// Stats
					callsiteMigratedCount++
					fileWasUpdated = true
				}
				else
				{
					let resourcePath = importAst.path
					
					if (importAst.kind != 'Package')
					{
						resourcePath = path.relative(
							dirpath,
							path.resolve(walker.rootPathAsString, importAst.path)
						)
						
						if (resourcePath[0] != '.')
						{
							resourcePath = "./" + resourcePath
						}
					}
					
					// We preserve the use of the localId vs the symbolId so we don't have to edit the code using the required file
					if (importAst.kind == 'Package')
					{
						const accessorIfAny = importAst.symbolId
												? `.${importAst.symbolId}`
												: ''
						edits.push(
						[
							`var ${importAst.localId}`,
							`= require("${resourcePath}")${accessorIfAny}`,
							importAst.loc.start,
							importAst.loc.end,
						])
					}
					else
					{
						edits.push(
						[
							`var ${importAst.localId}`,  // Could have been `importAst.symbolId` whenever it exists
							`= require("${resourcePath}")`,
							importAst.loc.start,
							importAst.loc.end,
						])
					}
				}
			}
			
			// Stats
			if (fileWasUpdated)
			{
				filesUpdatedCount++
			}
			
			// Reverse the edit list so that, when we replace them one by one, we start from the end and don't invalidate indices
			edits.reverse()
			
			// Measure the longest variable declaration (initializer excluded) (formatting concern)
			const maxDeclLength = edits.reduce<number>( (acc: number, val: StringEdit) =>
			{
				return val[0].length > acc ? val[0].length : acc
			}, 0) + 4
	
			// Read the file
			const contentAsBuffer = await readFileAsync(filepath)
			const contentAsStr = new TextDecoder("utf-8").decode(contentAsBuffer)
			
			// Update the file content string based on the edits
			const updatedContentAsStr = edits.reduce<string>( (acc: string, val: StringEdit) =>
			{
				const whitespaceCount = maxDeclLength - val[0].length
				assert(whitespaceCount > 0)
				
				const startIndex = val[2]
				const endIndex = val[3]
				
				const decl = val[0] + ' '.repeat(whitespaceCount) + val[1]
				return stringSplice(acc, startIndex, endIndex, decl)
				
			}, contentAsStr)
			
			const updatedContentAsBuffer = new TextEncoder().encode(updatedContentAsStr)
			await writeFileAsync(filepath, updatedContentAsBuffer)
		}
	})
	
	console.log( `${colors.green(callsiteMigratedCount.toString())} call-sites were updated` )
	console.log( `${colors.green(filesUpdatedCount.toString())} files had call-sites to be updated` )
	console.log()
}
