# mongodb

The chaos hooks are specific to the `mongodb` module, not for `mongodb-core`.
The reason is just that `mongodb-core` is not meant to be used directly since it
contains very low-level bindings for the mongo driver - the main supported package
that utilizes these bindings is `mongodb-core`. If for some reason you need the
lower level bindings (can't image why), please open an issue.

## Possible failures

### `.connect()`

 - `MongoError`: Connection timed out.
 - `MongoNetworkError`: `getaddrinfo ENOTFOUND` caused by DNS failure to lookup address.
