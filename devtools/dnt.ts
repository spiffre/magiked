import { copy } from "https://deno.land/std@0.182.0/fs/mod.ts";
import { build } from "https://deno.land/x/dnt@0.34.0/mod.ts"

const TEMP_DIR = "npm/temp"
const NPM_DIR = "npm"


// Copy test data
await Deno.remove("npm", { recursive: true }).catch( (_) => {} )
await copy("tests", `${TEMP_DIR}/esm/tests`, { overwrite : true })
await copy("tests", `${TEMP_DIR}/script/tests`, { overwrite : true })

const version: string|undefined = Deno.args[0]
if (version == undefined)
{
	console.error("A version tag could not be found")
	console.error("Aborted\n")
	Deno.exit(1)
}
const versionShort = version?.replace(/^v/, "")

await build(
{
	entryPoints: ["./mod.ts"],
	outDir: TEMP_DIR,
	shims: { deno: 'dev' },
	
	package:
	{
		name: "@spiffre/magiked",
		version: versionShort,
		description: "",
		license: "MIT",
		repository:
		{
			type: "git",
			url: "git+https://github.com/spiffre/magiked",
		},
		
		devDependencies :
		{
			"@types/micromatch" : "^4.0.0"
		}
	},
	
	postBuild ()
	{
		// Copy README file
		//await Deno.copyFileSync("README.md", "npm/README.md");
			
		// Ensure the test data is ignored in the `.npmignore` file
		// so it doesn't get published with your npm package
		Deno.writeTextFileSync(`${TEMP_DIR}/.npmignore`, "esm/tests/data/\nscript/tests/data/\n", { append: true })
	}
})

// Pack the temp directory to a .tgz archive
const process = Deno.run(
{
	cmd : [ "npm", "pack", `./${TEMP_DIR}`, "--pack-destination", `./${NPM_DIR}` ],
	stdout : "piped"
})
const output = new TextDecoder("utf8").decode(await process.output())
process.close()

//const archiveName = output
//const archivePath = `./${NPM_DIR}/${archiveName}`

// Extract the archive
const process2 = Deno.run(
{
	cmd : [ "tar", "-xvf", `spiffre-magiked-${versionShort}.tgz` ],
	cwd : NPM_DIR,
	stdout : "piped"
})
new TextDecoder("utf8").decode(await process2.output())
process2.close()
