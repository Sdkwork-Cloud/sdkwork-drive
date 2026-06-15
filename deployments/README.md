# Drive Deployments

`deployments/` contains deployment descriptors, local topology examples,
packaging handoff files, and deployable infrastructure examples for
`sdkwork-drive`.

Current descriptors:

- `docker-compose.minio-test.yml`: local MinIO topology for Drive S3-compatible
  storage tests.

Deployment files must not include production secrets, private keys, live tokens,
or developer-local credentials.
