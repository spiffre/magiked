
# Todo

## Walker

- DIFFERENTIATE the API btw `init()` and `traverse()` regarding `onFileNodeEnter()` and `onDirectoryNodeEnter()`
 - filepath is always present in context of `init()`
 - filepath is never present in context of `traverse()`
 
- ADD option for the resolution of module specifiers:
  resolveToAbsolute, resolveToRelativeToRoot, resolveToShortestRelative, untouched/raw
  The default should be untouched/raw

- ADD to utils :
 - String splice function
 - Edits mechanism (possibly built-in with back-to-front iteration)
 
- ENSURE filtering during `walker.traverse()` is clear:
  It's a way to ignore some files that have already been parsed
  If the filter is more general than during `walker.init()`, exactly the same files will be visited, not one more

- INVESTIGATE how to make `this.root` valid during `init()`
  As it is, `this.root` is initialized by the return value of the initial readDir()
  It means that this.root is uninitialized for the whole initial run, which means we can't use `pathAsStringToNode()` for instance

- ADD SORT as readdir doesn't guarantee an order (such as subdirectories then files)
  Update options.sort to be `boolean | (a, b) => number`
  Possibly some predefined sorter could be exposed by Magiked:
  - All directories first
  - A specific file first (such as an index file or a package.json or something)
  - Regular alphanumerical sort
  - etc

- ADD payload to directories
  It should be a separate generic parameter, such as `new Walker<FilePayload1|FilePayload2, DirectoryPayload>()`

- ADD helpers attached to walker to manipulate the nodes and make sure it doesn't become stale immediately
  Think `removeFile()` and `removeDirectory()`, and maybe also `addFile()` and `addDirectory()` ?
  Maybe it's `walker.api.removeFile()` and not `walker.removeFile()`
  It would add/remove entry from .files or .directories and update the relevant count
  Maybe `moveFile()` as well


## Packaging and Publishing

- EXPAND README files
  A bit with what/why and code samples
  Make sure there are 2 different README files for node and deno; code samples would be different, SWC doesn’t work in Deno for now, etc

- MINIFY the module and the published package ?
  `terser npm/package/script/sources/magiked.js --source-map --output npm/package/script/sources/magiked.js --compress ecma=2022` 

