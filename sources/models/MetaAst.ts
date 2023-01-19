
export interface MetaAst
{
	loc:
	{
		start: number
		end: number
	}
}

export interface PackageImportMetaAst extends MetaAst
{
	type: 'ImportMetaAst'
	kind: 'Package'
	
	path: string
	localId: string
	symbolId?: string
}

export interface FileImportMetaAst extends MetaAst
{
	type: 'ImportMetaAst'
	kind: 'File'
	
	path: string
	localId: string
	symbolId?: string
}

export type ImportMetaAst = PackageImportMetaAst | FileImportMetaAst

export interface ExportMetaAst extends MetaAst
{
	type: 'ExportMetaAst'
	
	symbolId: string
}

export interface ReexportMetaAst extends MetaAst
{
	type: 'ReexportMetaAst'
	
	path: string
	symbolId: string
}

export interface Payload
{
	imports: ImportMetaAst[]
	exports: ExportMetaAst[]
	reexports: ReexportMetaAst[]
}
