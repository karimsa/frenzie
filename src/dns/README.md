# dns

Hooks for node's native `dns` module.

## Methods

 - `resolveAny`
 - `resolve4`
 - `resolve6`
 - `resolveCname`
 - `resolveMx`
 - `resolveNs`
 - `resolveTxt`
 - `resolveSrv`
 - `resolvePtr`
 - `resolveNaptr`
 - `resolveSoa`
 - `reverse`

 - `lookup`
 - `lookupService`

## Errors

Node.js' internal error handlers throw very smart errors that provide valuable information about the underlying syscall that failed. These error objects are shaped like this:

```typescript
declare class NodeError extends Error {
  syscall: string
  hostname?: string

  // the correct usage of errno is as a number
  // but see below for the exception
  errno: number | string
}
```

### The "c-ares errors"

Node.js's DNS resolve family of functions (all functions other than lookup and lookupService) (up to node v9) use c-ares behind the scenes. The main difference between these errors is that they will not contain a valid `errno` - that is, the `errno` property for these errors will actually be the same as the `code`. This is not a fault in c-ares but rather an issue that node has not resolved yet due to backwards compatibility issues.
