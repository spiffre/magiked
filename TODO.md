
# Todo

- REFACTOR onDirectoryNodeLeave() and co so they take a DirectoryNode|FileNode, but also the walker itself
  That way, we don't rely on scope knowledge of walker

- ADD a glob matcher
  https://github.com/devongovett/glob-match
  https://www.npmjs.com/package/micromatch
    See: https://codesandbox.io/s/micromatch-sample-o7662m
    See: https://esm.sh/v109/micromatch@4.0.5/es2022/micromatch.js ?

- EXTRACT JS loader to a seperate package `@spiffre/magiked-espree-loader`

- ADD SORT as readdir doesn't guarantee an order (such as subdirectories then files)
  We should expose a `sort()` option which lets the caller customize the sort order: they may want:
  - All directories first
  - A specific file first (such as an index file or a package.json or something)
  - Regular alphanumerical sort
  - etc

- ADD helpers attached to walker to manipulate the nodes
  Think `removeFile()` and `removeDirectory()`, and maybe also `addFile()` and `addDirectory()` ?
  Maybe it's `walker.api.removeFile()` and not `walker.removeFile()`
  It would add/remove entry from .files or .directories and update the relevant count

- MAYBE prepend paths returned by `normalizePath()` ?
   - They are expressed as paths relative to `Walker.rootPathAsString()` so it makes sense
     In most situations, it's just noise to ensure they start with ./
     But we do need it when we want to re-write those paths because siblings end up without the ./ prefix and we would like to have it
     Except at this stage it's impossible to differentiate btw a package name (ie @platform/core, which does not need the prefix)
     and a relative path (ie client/core/System/System.js, which does need the ./ prefix)
     Prepending with ./ is just storing the information when it's easy to deduce

- LOOK INTO dnt and publishing those libraries to npm

- ATTEMPT to use SWC in Deno
  And publish that as @spiffre/magiked-swc-loader

