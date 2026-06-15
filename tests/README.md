# Drive Cross-Package Tests

`tests/` is reserved for cross-package tests, contract fixtures, end-to-end
inputs, and static verification data that do not belong to one package-local
test directory.

Package-local Rust tests remain under each crate or service `tests/` directory.
SDK-family tests remain under `sdks/test/`.
