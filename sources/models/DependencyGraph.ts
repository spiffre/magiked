import { Payload } from "./MetaAst.ts"

export const EntryType =
{
	UNKNOWN			: 'UNKNOWN',
	DIRECTORY		: 'DIRECTORY',
	SOURCE			: 'SOURCE',
	JSON			: 'JSON',
} as const

type ValuesOf<T> = T[keyof T]
export type EntryType = ValuesOf<typeof EntryType>

interface Node
{
	uid: number
	name: string
	type: EntryType
	parent: DirectoryNode|null
}

export interface DirectoryNode extends Node
{
	directories: Record<string, DirectoryNode|undefined>
	files: Record<string, FileNode|undefined>
	directoryCount: number
	fileCount: number
}

export interface FileNode extends Node
{
	payload: Payload | null
}