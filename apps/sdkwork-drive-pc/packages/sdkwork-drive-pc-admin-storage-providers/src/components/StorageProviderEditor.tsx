import React, { useEffect, useState } from 'react';
import type {
  CreateStorageProviderInput,
  StorageProviderKind,
  StorageProviderView,
  UpdateStorageProviderInput,
} from '../types/storageProviderAdminTypes';

const providerKinds: Array<{ value: StorageProviderKind; label: string }> = [
  { value: 'tencent_cos', label: 'Tencent Cloud COS' },
  { value: 's3_compatible', label: 'Amazon S3 / S3 compatible' },
  { value: 'aliyun_oss', label: 'Aliyun OSS' },
  { value: 'google_cloud_storage', label: 'Google Cloud Storage' },
  { value: 'huawei_obs', label: 'Huawei OBS' },
  { value: 'volcengine_tos', label: 'Volcengine TOS' },
  { value: 'local_filesystem', label: 'Local filesystem' },
];
const inputClassName = 'h-9 border border-neutral-300 bg-white px-2 text-sm font-normal text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-[#111] dark:text-neutral-100';

interface StorageProviderEditorProps {
  provider?: StorageProviderView;
  onCancel: () => void;
  onCreateProvider: (input: CreateStorageProviderInput) => void;
  onUpdateProvider: (providerId: string, input: UpdateStorageProviderInput) => void;
  onRotateCredential: (providerId: string, credentialRef: string) => void;
  pending?: boolean;
}

export function StorageProviderEditor({
  provider,
  onCancel,
  onCreateProvider,
  onUpdateProvider,
  onRotateCredential,
  pending,
}: StorageProviderEditorProps) {
  const [id, setId] = useState('');
  const [providerKind, setProviderKind] = useState<StorageProviderKind>('tencent_cos');
  const [name, setName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [pathStyle, setPathStyle] = useState(false);
  const [credentialRef, setCredentialRef] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    setId(provider?.id ?? '');
    setProviderKind((provider?.providerKind as StorageProviderKind | undefined) ?? 'tencent_cos');
    setName(provider?.displayName ?? '');
    setEndpointUrl(provider?.endpointUrl ?? '');
    setRegion(provider?.region ?? '');
    setBucket(provider?.bucket ?? '');
    setPathStyle(provider?.pathStyle ?? false);
    setCredentialRef(provider?.credentialRef ?? '');
    setStatus(provider?.status ?? 'active');
  }, [provider]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (provider) {
      onUpdateProvider(provider.id, {
        name,
        endpointUrl,
        region: region || undefined,
        bucket,
        pathStyle,
        credentialRef: credentialRef || undefined,
        status,
      });
      return;
    }
    onCreateProvider({
      id,
      providerKind,
      name,
      endpointUrl,
      region: region || undefined,
      bucket,
      pathStyle,
      credentialRef: credentialRef || undefined,
      status,
    });
  };

  return (
    <form onSubmit={submit} className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {provider ? 'Edit provider' : 'New provider'}
        </h2>
        <button type="button" className="text-xs font-semibold text-neutral-500" onClick={onCancel}>
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Provider ID">
          <input value={id} disabled={Boolean(provider)} required onChange={(event) => setId(event.target.value)} className={inputClassName} />
        </Field>
        <Field label="Provider kind">
          <select value={providerKind} disabled={Boolean(provider)} onChange={(event) => setProviderKind(event.target.value as StorageProviderKind)} className={inputClassName}>
            {providerKinds.map((kind) => (
              <option key={kind.value} value={kind.value}>{kind.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Display name">
          <input value={name} required onChange={(event) => setName(event.target.value)} className={inputClassName} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="disabled">disabled</option>
          </select>
        </Field>
        <Field label="Endpoint URL">
          <input value={endpointUrl} required onChange={(event) => setEndpointUrl(event.target.value)} className={inputClassName} />
        </Field>
        <Field label="Region">
          <input value={region} onChange={(event) => setRegion(event.target.value)} className={inputClassName} />
        </Field>
        <Field label="Bucket">
          <input value={bucket} required onChange={(event) => setBucket(event.target.value)} className={inputClassName} />
        </Field>
        <Field label="Credential reference">
          <input value={credentialRef} onChange={(event) => setCredentialRef(event.target.value)} className={inputClassName} />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        <input type="checkbox" checked={pathStyle} onChange={(event) => setPathStyle(event.target.checked)} />
        Use path-style bucket addressing
      </label>
      <div className="mt-4 flex justify-between gap-2">
        <button type="submit" disabled={pending} className="bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
          {provider ? 'Save changes' : 'Create provider'}
        </button>
        {provider && credentialRef && (
          <button type="button" disabled={pending} onClick={() => onRotateCredential(provider.id, credentialRef)} className="border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
            Rotate credential ref
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
      {label}
      {children}
    </label>
  );
}
