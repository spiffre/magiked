
type ValuesOf<T> = T[keyof T]
type FileExtension = `.${string}` | ''

export const NodeKind =
{
	UNKNOWN			: 'UNKNOWN',
	DIRECTORY		: 'DIRECTORY',
	FILE			: 'FILE',
} as const

export type NodeKind = ValuesOf<typeof NodeKind>

export interface Payload
{
	type: string
	extension: FileExtension
}

interface Node
{
	kind: NodeKind
	uid: number
	name: string
	parent: DirectoryNode|null
}

export interface DirectoryNode extends Node
{
	kind: "DIRECTORY" // fixme: NodeKind.DIRECTORY type can't be used here...
	
	directories: Record<string, DirectoryNode|undefined>
	files: Record<string, FileNode|undefined>
	directoryCount: number
	fileCount: number
}

export interface FileNode extends Node
{
	kind: "FILE" // fixme: NodeKind.DIRECTORY type can't be used here...
	
	payload: Payload|null
}
