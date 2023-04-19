import { assert } from "https://deno.land/std@0.182.0/testing/asserts.ts";
import { copy } from "https://deno.land/std@0.182.0/fs/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt@0.34.0/mod.ts"


function retrieveVersion ()
{
	const version: string|undefined = Deno.args[0]
	if (version == undefined)
	{
		console.error("A version tag could not be found")
		console.error("Aborted\n")
		Deno.exit(1)
	}
	
	return version?.replace(/^v/, "")
}

async function readyTempDir ()
{
	// Clear the build directory
	await emptyDir(NPM_DIR)
	
	// Copy the test data for each buidl target
	await copy("tests", `${TEMP_DIR}/esm/tests`, { overwrite : true })
	await copy("tests", `${TEMP_DIR}/script/tests`, { overwrite : true })
}

async function switchToNodeDependencies ()
{
	const process = Deno.run(
	{
		cmd : [ "find", "./sources/", "-type", "f", "-name","*.ts", "-exec", "sed", "-i", "", "s/deps\\/deno/deps\\/node/g", "{}", "+" ],
		stdout : "piped",
		stderr : "piped",
	})
	
	const status = await process.status()
	assert(status.success == true, "switchToNodeDependencies() process failed")
	
	const stdout = await process.output()
	assert(new TextDecoder("utf8").decode(stdout) == "", "switchToNodeDependencies() stdout non-empty")
	
	const stderr = await process.stderrOutput()
	assert(new TextDecoder("utf8").decode(stderr) == "", "switchToNodeDependencies() stderr non-empty")
	
	process.close()
}

async function createPackageArchive ()
{
	// Pack the temp directory to a .tgz archive
	const process = Deno.run(
	{
		cmd : [ "npm", "pack", `./${TEMP_DIR}`, "--pack-destination", `./${NPM_DIR}` ],
		stdout : "piped"
	})
	
	const status = await process.status()
	assert(status.success)

	process.close()
}

async function extractPackageArchive ()
{
	const process = Deno.run(
	{
		cmd : [ "tar", "-xvf", `spiffre-magiked-${VERSION}.tgz` ],
		cwd : NPM_DIR,
		stdout : "piped"
	})
	
	const status = await process.status()
	assert(status.success)
	
	process.close()
}

async function switchToDenoDependencies ()
{
	const process = Deno.run(
	{
		cmd : [ "find", "./sources/", "-type", "f", "-name","*.ts", "-exec", "sed", "-i", "", "s/deps\\/node/deps\\/deno/g", "{}", "+" ],
		stdout : "piped",
		stderr : "piped",
	})
	
	const status = await process.status()
	assert(status.success == true, "revertToDenoDependencies() process failed")
	
	const stdout = await process.output()
	assert(new TextDecoder("utf8").decode(stdout) == "", "revertToDenoDependencies() stdout non-empty")
	
	const stderr = await process.stderrOutput()
	assert(new TextDecoder("utf8").decode(stderr) == "", "revertToDenoDependencies() stderr non-empty")
	
	process.close()
}


const TEMP_DIR = "npm/temp"
const NPM_DIR = "npm"
const VERSION = retrieveVersion()


;(async function main ()
{
	await readyTempDir()
	await switchToNodeDependencies()
	
	await build(
	{
		entryPoints: ["./mod.ts"],
		outDir: TEMP_DIR,
		shims: { deno: 'dev' },
		
		package:
		{
			name: "@spiffre/magiked",
			version: VERSION,
			description: "",
			license: "MIT",
			repository:
			{
				type: "git",
				url: "git+https://github.com/spiffre/magiked",
			},
			
			files:
			[
				"package.json",
				"types/mod.d.ts",
				"types/sources/",
				"esm/mod.js",
				"esm/sources/",
				"esm/deps/",
				"script/mod.js",
				"script/sources/",
				"script/deps/",
			],
			
			devDependencies :
			{
				"@types/micromatch" : "^4.0.0"
			}
		},
		
		postBuild ()
		{
			// Copy README file
			Deno.copyFileSync("README.md", `${TEMP_DIR}/README.md`);
		}
	})
	
	await createPackageArchive()
	await extractPackageArchive()
	await switchToDenoDependencies()
})()
