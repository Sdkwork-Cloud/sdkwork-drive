# Drive Deployments

`deployments/` contains deployment descriptors, local topology examples,
packaging handoff files, and deployable infrastructure examples for
`sdkwork-drive`.

Current descriptors:

- `docker-compose.minio-test.yml`: local MinIO topology for Drive S3-compatible
  storage tests.
- `kubernetes/drive-services.yaml`: production-oriented Kubernetes deployments and
  services for Drive app API, backend API, open API, admin storage API, and install
  worker.
- `systemd/sdkwork-drive-app-api.service`: systemd unit for the Drive app API.
- `systemd/sdkwork-drive-backend-api.service`: systemd unit for the Drive backend API.
- `systemd/sdkwork-drive-open-api.service`: systemd unit for the Drive open API.
- `systemd/sdkwork-drive-admin-storage-api.service`: systemd unit for admin storage API.
- `systemd/sdkwork-drive-standalone-gateway.service`: systemd unit for the Drive
  standalone gateway (embedded IAM + Drive API proxy loop).
- `systemd/sdkwork-drive-install-worker.service`: systemd unit for background
  maintenance and domain outbox dispatch.

Deployment files must not include production secrets, private keys, live tokens,
or developer-local credentials.
