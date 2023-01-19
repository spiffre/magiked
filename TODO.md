
# Todo

- readdir doesn't guarantee an order (such as subdirectories then files)
  We should make it a guarantee and even offer an option for this 'files-first', 'directories-first', 'any-order'

- MAYBE have walker.remove(node: FileNode|DirectoryNode, from: DirectoryNode)
  to handle .fileCount-- and removal from .files

- Add tests
  ```ts
  Deno.test("url test", () =>
  {
    const whatever = true
    assertEquals(whatever, false);
  })
  
  ```


## Notes

- https://esm.sh/ is a great CDN for deno-compatible packages