import React, { useEffect, useMemo, useState } from 'react';
import type { CreateStorageProviderInput, StorageProviderKind, StorageProviderView, UpdateStorageProviderInput } from '../types/storageProviderAdminTypes';
import { getAllProviderKindMeta, resolveProviderKindMeta, getProviderKindMeta } from '../utils/providerKindConfig';
import { INPUT_CLASS, SELECT_CLASS, CHECKBOX_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface StorageProviderEditorProps {
  provider?: StorageProviderView;
  pending?: boolean;
  onClose: () => void;
  onCreateProvider: (input: CreateStorageProviderInput) => void;
  onUpdateProvider: (providerId: string, input: UpdateStorageProviderInput) => void;
  onRotateCredential: (providerId: string, credentialRef: string) => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export function StorageProviderEditor({ provider, pending, onClose, onCreateProvider, onUpdateProvider, onRotateCredential }: StorageProviderEditorProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(provider);

  const [providerKind, setProviderKind] = useState<StorageProviderKind>('s3_compatible');
  const [customKind, setCustomKind] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [pathStyle, setPathStyle] = useState(false);
  const [credentialRef, setCredentialRef] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [status] = useState('active');
  const [sseMode, setSseMode] = useState('');
  const [storageClass, setStorageClass] = useState('');
  const [strictTls, setStrictTls] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const meta = useMemo(() => resolveProviderKindMeta(providerKind), [providerKind]);

  const generatedId = useMemo(() => {
    if (isEditing) return provider?.id ?? '';
    const kindSlug = providerKind === 'custom' ? slugify(customKind) : slugify(meta.shortLabel);
    const nameSlug = slugify(name);
    if (!kindSlug || !nameSlug) return '';
    return `${kindSlug}-${nameSlug}`;
  }, [providerKind, customKind, name, meta.shortLabel, isEditing, provider?.id]);

  useEffect(() => {
    if (provider) {
      const kind = provider.providerKind as StorageProviderKind;
      if (kind?.startsWith('custom:')) { setProviderKind('custom'); setCustomKind(kind.substring(7)); } else { setProviderKind(kind ?? 's3_compatible'); setCustomKind(''); }
      setName(provider.displayName ?? '');
      setRegion(provider.region ?? '');
      setBucket(provider.bucket ?? '');
      setEndpointUrl(provider.endpointUrl ?? '');
      setPathStyle(provider.pathStyle ?? false);
      setCredentialRef(provider.credentialRef ?? '');
      setSseMode(provider.serverSideEncryptionMode ?? '');
      setStorageClass(provider.defaultStorageClass ?? '');
      setStrictTls(provider.strictTls ?? true);
    }
  }, [provider]);

  const handleKindChange = (kind: StorageProviderKind) => {
    setProviderKind(kind);
    const hint = getProviderKindMeta(kind);
    if (!provider) {
      setEndpointUrl(hint.endpointHint);
      setRegion(hint.regionHint);
      setPathStyle(hint.features.isLocal);
      setStrictTls(!hint.features.isLocal);
      setSseMode('');
      setStorageClass('');
    }
  };

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    if (!isEditing) {
      if (meta.value === 'aliyun_oss') setEndpointUrl(`https://oss-${newRegion}.aliyuncs.com`);
      else if (meta.value === 'tencent_cos') setEndpointUrl(`https://cos.${newRegion}.myqcloud.com`);
      else if (meta.value === 'huawei_obs') setEndpointUrl(`https://obs.${newRegion}.myhuaweicloud.com`);
      else if (meta.value === 'volcengine_tos') setEndpointUrl(`https://tos-${newRegion}.volces.com`);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('required');
    if (!bucket.trim()) e.bucket = t('required');
    if (!meta.features.isLocal && !endpointUrl.trim()) e.endpointUrl = t('required');
    if (providerKind === 'custom' && !customKind.trim()) e.customKind = t('required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doSubmit = () => {
    if (!validate()) return;
    const effectiveKind: StorageProviderKind = providerKind === 'custom' ? `custom:${customKind}` as StorageProviderKind : providerKind;
    if (provider) {
      onUpdateProvider(provider.id, { name, endpointUrl: endpointUrl || undefined, region: region || undefined, bucket, pathStyle, credentialRef: credentialRef || undefined, status, serverSideEncryptionMode: sseMode || undefined, defaultStorageClass: storageClass || undefined, strictTls });
    } else {
      onCreateProvider({ id: generatedId, providerKind: effectiveKind, name, endpointUrl: endpointUrl || undefined, region: region || undefined, bucket, pathStyle, credentialRef: credentialRef || undefined, status, serverSideEncryptionMode: sseMode || undefined, defaultStorageClass: storageClass || undefined, strictTls });
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); doSubmit(); };

  const isLocalFs = meta.features.isLocal;
  const hasRegions = meta.regions.length > 0;
  const sseModes = meta.features.hasSse ? (providerKind === 'custom' ? ['AES256'] : meta.sseModes) : [];
  const storageClasses = meta.features.hasStorageClass ? (providerKind === 'custom' ? ['STANDARD'] : meta.storageClasses) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{provider ? t('editorEditTitle') : t('editorNewTitle')}</h2>
          <button type="button" className="text-neutral-400 hover:text-neutral-600" onClick={onClose}><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Provider Type */}
          <Section title={t('stepType')} number={1}>
            <div className="grid grid-cols-2 gap-2">
              {getAllProviderKindMeta().map((k) => (
                <button key={k.value} type="button" onClick={() => handleKindChange(k.value)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${providerKind === k.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-950/30' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'}`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold ${k.bgClass} ${k.textClass}`}>{k.icon}</div>
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{k.label}</div>
                </button>
              ))}
            </div>
            {providerKind === 'custom' && <div className="mt-3"><Field label={t('customKind')} error={errors.customKind}><input value={customKind} onChange={(e) => setCustomKind(e.target.value)} className={INPUT_CLASS} placeholder={t('customKindPlaceholder')} /></Field></div>}
          </Section>

          {/* Basic Info */}
          <Section title={t('stepConnection')} number={2}>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('displayName')} error={errors.name}>
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder={t('displayNamePlaceholder')} />
              </Field>
              {!isEditing && (
                <Field label={t('providerId')}>
                  <input value={generatedId} disabled className={`${INPUT_CLASS} bg-neutral-50 font-mono text-xs dark:bg-neutral-800`} />
                  <span className="mt-0.5 text-[10px] text-neutral-400">Auto-generated</span>
                </Field>
              )}
              {isEditing && <Field label={t('providerId')}><input value={provider?.id ?? ''} disabled className={`${INPUT_CLASS} bg-neutral-50 font-mono text-xs dark:bg-neutral-800`} /></Field>}
            </div>
          </Section>

          {/* Connection Details */}
          <Section title={isLocalFs ? 'Path' : 'Endpoint & Region'} number={3}>
            {isLocalFs ? (
              <Field label={t('endpointUrl')} error={errors.endpointUrl}>
                <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} className={INPUT_CLASS} placeholder="/var/data/drive-storage" />
              </Field>
            ) : (
              <>
                {hasRegions && (
                  <Field label={t('region')}>
                    <select value={region} onChange={(e) => handleRegionChange(e.target.value)} className={SELECT_CLASS}>
                      {meta.regions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </Field>
                )}
                <div className="mt-3">
                  <Field label={t('endpointUrl')} error={errors.endpointUrl}>
                    <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} className={INPUT_CLASS} placeholder={meta.endpointHint} />
                    {hasRegions && <span className="mt-0.5 text-[10px] text-neutral-400">Auto-filled based on region</span>}
                  </Field>
                </div>
              </>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label={t('bucket')} error={errors.bucket}>
                <input value={bucket} onChange={(e) => setBucket(e.target.value)} className={INPUT_CLASS} placeholder={t('bucketPlaceholder')} />
              </Field>
              {!isLocalFs && (
                <Field label={meta.credentialLabel || t('credentialRef')}>
                  <div className="relative">
                    <input value={credentialRef} onChange={(e) => setCredentialRef(e.target.value)} type={showCredential ? 'text' : 'password'} className={`${INPUT_CLASS} pr-9`} placeholder={meta.credentialHint} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600" onClick={() => setShowCredential(!showCredential)}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCredential ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} /></svg>
                    </button>
                  </div>
                </Field>
              )}
            </div>
            {!isLocalFs && (
              <div className="mt-3 flex flex-wrap gap-4">
                {meta.features.hasPathStyle && <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><input type="checkbox" className={CHECKBOX_CLASS} checked={pathStyle} onChange={(e) => setPathStyle(e.target.checked)} />{t('pathStyle')}</label>}
                <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><input type="checkbox" className={CHECKBOX_CLASS} checked={strictTls} onChange={(e) => setStrictTls(e.target.checked)} />{t('strictTls')}</label>
              </div>
            )}
          </Section>

          {/* Advanced */}
          {(sseModes.length > 0 || storageClasses.length > 0) && (
            <Section title={t('stepAdvanced')} number={4}>
              <div className="grid grid-cols-2 gap-3">
                {sseModes.length > 0 && <Field label={t('sseMode')}><select value={sseMode} onChange={(e) => setSseMode(e.target.value)} className={SELECT_CLASS}><option value="">{t('none')}</option>{sseModes.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>}
                {storageClasses.length > 0 && <Field label={t('defaultStorageClass')}><select value={storageClass} onChange={(e) => setStorageClass(e.target.value)} className={SELECT_CLASS}><option value="">{t('providerDefault')}</option>{storageClasses.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>}
              </div>
              {isEditing && credentialRef && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <div><div className="text-xs font-semibold text-amber-800 dark:text-amber-200">{t('credentialRotation')}</div><div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">{t('credentialRotationDesc')}</div></div>
                    <button type="button" className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100" disabled={pending} onClick={() => onRotateCredential(provider!.id, credentialRef)}>{t('rotateRef')}</button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>{t('cancel')}</button>
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={pending} onClick={doSubmit}>
            {pending ? t('saving') : provider ? t('save') : t('create')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40">{number}</span>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>{children}{error && <span className="text-[11px] text-red-500">{error}</span>}</label>;
}
