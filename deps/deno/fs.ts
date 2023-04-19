const readDir = Deno.readDir
const stat = Deno.stat

export type DirEntry = { name: string }

export const fs =
{
	readDir,
	stat
}
