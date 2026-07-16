# Drive Sandbox Explorer

Reusable PC React explorer for a Drive-owned, server-authorized sandbox or a host-local adapter.

The package accepts an injected `SandboxExplorerPort`; it never constructs SDK clients,
reads credentials, or receives a server physical path. Hosts must configure it before rendering.

```ts
configureDriveSandboxExplorerRuntime({ port });
```

Use `SandboxDirectoryPickerView` for project import flows and `SandboxExplorerView` for
interactive file-space management.

Application shells can wrap their renderer with `SandboxDirectoryPickerProvider` and call
`useSandboxDirectoryPicker().pickDirectory()` from project workflows. The controller serializes
modal requests and resolves cancellation as `null`, so consumers do not duplicate dialog state.
