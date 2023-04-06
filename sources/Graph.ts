
type ValuesOf<T> = T[keyof T]
export type FileExtension = `.${string}` | ''

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
}

interface Node<T extends Payload>
{
	kind: NodeKind
	uid: number
	name: string
	parent: DirectoryNode<T>|null
}

export interface DirectoryNode<T extends Payload = Payload> extends Node<T>
{
	kind: "DIRECTORY" // fixme: NodeKind.DIRECTORY type can't be used here...
	
	directories: Record<string, DirectoryNode<T>|undefined>
	files: Record<string, FileNode<T>|undefined>
	directoryCount: number
	fileCount: number
}

export interface FileNode<T extends Payload = Payload> extends Node<T>
{
	kind: "FILE" // fixme: NodeKind.DIRECTORY type can't be used here...
	
	payload: T|null
}
