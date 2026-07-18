import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateStorageProviderInput, StorageProviderKind, StorageProviderView, UpdateStorageProviderInput } from '../types/storageProviderAdminTypes';
import {
  buildProviderEndpointUrl,
  getAllProviderKindMeta,
  getProviderKindMeta,
  resolveProviderKindMeta,
} from '../utils/providerKindConfig';
import { isCredentialRefMasked } from '../utils/credentialRefUtils';
import { buildProviderIdWithUuid, createProviderUuidSuffix, resolveProviderKindSlug } from '../utils/providerIdUtils';
import { INPUT_CLASS, SELECT_CLASS, CHECKBOX_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../utils/uiPrimitives';
import { StorageProviderCredentialFields } from './StorageProviderCredentialFields';
import { FormNoticeBanner } from './FormNoticeBanner';
import { formatMutationError } from '../utils/mutationError';
import { useTranslation } from '../hooks/useTranslation';

type ModalNotice = { type: 'success' | 'error'; message: string };

interface StorageProviderEditorProps {
  provider?: StorageProviderView;
  existingProviderIds?: string[];
  onClose: () => void;
  onCreateProvider: (input: CreateStorageProviderInput) => Promise<StorageProviderView>;
  onUpdateProvider: (providerId: string, input: UpdateStorageProviderInput) => Promise<StorageProviderView>;
  onRotateCredential: (providerId: string, credentialRef: string) => Promise<StorageProviderView>;
  onProviderSaved?: (provider: StorageProviderView) => void;
}

function applyKindDefaults(
  kind: StorageProviderKind,
  setRegion: (value: string) => void,
  setEndpointUrl: (value: string) => void,
  setPathStyle: (value: boolean) => void,
  setStrictTls: (value: boolean) => void,
  setSseMode: (value: string) => void,
  setStorageClass: (value: string) => void,
) {
  const hint = getProviderKindMeta(kind);
  setRegion(hint.regionHint);
  setEndpointUrl(hint.features.isLocal ? hint.endpointHint : buildProviderEndpointUrl(String(kind), hint.regionHint) ?? hint.endpointHint);
  setPathStyle(hint.features.isLocal);
  setStrictTls(!hint.features.isLocal);
  setSseMode('');
  setStorageClass('');
}

export function StorageProviderEditor({
  provider,
  existingProviderIds = [],
  onClose,
  onCreateProvider,
  onUpdateProvider,
  onRotateCredential,
  onProviderSaved,
}: StorageProviderEditorProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(provider);

  const [providerKind, setProviderKind] = useState<StorageProviderKind>('s3_compatible');
  const [customKind, setCustomKind] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [bucket, setBucket] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointLocked, setEndpointLocked] = useState(true);
  const [pathStyle, setPathStyle] = useState(false);
  const [credentialRef, setCredentialRef] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [status] = useState('active');
  const [sseMode, setSseMode] = useState('');
  const [storageClass, setStorageClass] = useState('');
  const [strictTls, setStrictTls] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [providerIdUuid, setProviderIdUuid] = useState(createProviderUuidSuffix);
  const [submitting, setSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState<ModalNotice | undefined>();

  const meta = useMemo(() => resolveProviderKindMeta(providerKind), [providerKind]);
  const usesStructuredCredentials = meta.features.structuredCredentials && Boolean(meta.credentialFields);

  const existingIdSet = useMemo(() => new Set(existingProviderIds), [existingProviderIds]);

  const kindSlug = useMemo(
    () => resolveProviderKindSlug(String(providerKind), customKind, meta.shortLabel),
    [providerKind, customKind, meta.shortLabel],
  );

  const generatedId = useMemo(() => {
    if (isEditing) {
      return provider?.id ?? '';
    }
    if (!kindSlug) {
      return '';
    }
    return buildProviderIdWithUuid(kindSlug, providerIdUuid, existingIdSet);
  }, [isEditing, provider?.id, kindSlug, providerIdUuid, existingIdSet]);

  useEffect(() => {
    if (provider) {
      const kind = provider.providerKind as StorageProviderKind;
      if (kind?.startsWith('custom:')) {
        setProviderKind('custom');
        setCustomKind(kind.substring(7));
      } else {
        setProviderKind(kind ?? 's3_compatible');
        setCustomKind('');
      }
      setName(provider.displayName ?? '');
      setRegion(provider.region ?? '');
      setBucket(provider.bucket ?? '');
      setEndpointUrl(provider.endpointUrl ?? '');
      setEndpointLocked(false);
      setPathStyle(provider.pathStyle ?? false);
      setCredentialRef(provider.credentialRef ?? '');
      setSseMode(provider.serverSideEncryptionMode ?? '');
      setStorageClass(provider.defaultStorageClass ?? '');
      setStrictTls(provider.strictTls ?? true);
    }
  }, [provider]);

  useEffect(() => {
    if (!provider) {
      applyKindDefaults(
        's3_compatible',
        setRegion,
        setEndpointUrl,
        setPathStyle,
        setStrictTls,
        setSseMode,
        setStorageClass,
      );
      setEndpointLocked(true);
    }
  }, [provider]);

  const handleKindChange = (kind: StorageProviderKind) => {
    setProviderKind(kind);
    if (!provider) {
      setProviderIdUuid(createProviderUuidSuffix());
      applyKindDefaults(kind, setRegion, setEndpointUrl, setPathStyle, setStrictTls, setSseMode, setStorageClass);
      setEndpointLocked(true);
      setCredentialRef('');
    }
  };

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    if (!isEditing && endpointLocked) {
      const nextEndpoint = buildProviderEndpointUrl(String(providerKind), newRegion);
      if (nextEndpoint) {
        setEndpointUrl(nextEndpoint);
      }
    }
  };

  const handleCredentialRefChange = useCallback((value: string) => {
    setCredentialRef(value);
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('required');
    if (!bucket.trim()) e.bucket = t('required');
    if (!meta.features.isLocal && !endpointUrl.trim()) e.endpointUrl = t('required');
    if (providerKind === 'custom' && !customKind.trim()) e.customKind = t('required');
    if (!isEditing && !generatedId.trim()) {
      return false;
    }

    const needsCredential = !isEditing || !provider?.credentialConfigured || !isCredentialRefMasked(credentialRef);
    if (!meta.features.isLocal && needsCredential && !credentialRef.trim()) {
      e.credentialRef = t('credentialRequired');
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const applyProviderSnapshot = (next: StorageProviderView) => {
    const kind = next.providerKind as StorageProviderKind;
    if (kind?.startsWith('custom:')) {
      setProviderKind('custom');
      setCustomKind(kind.substring(7));
    } else {
      setProviderKind(kind ?? 's3_compatible');
      setCustomKind('');
    }
    setName(next.displayName ?? '');
    setRegion(next.region ?? '');
    setBucket(next.bucket ?? '');
    setEndpointUrl(next.endpointUrl ?? '');
    setPathStyle(next.pathStyle ?? false);
    setCredentialRef(next.credentialRef ?? '');
    setSseMode(next.serverSideEncryptionMode ?? '');
    setStorageClass(next.defaultStorageClass ?? '');
    setStrictTls(next.strictTls ?? true);
    onProviderSaved?.(next);
  };

  const runFormAction = async (
    action: () => Promise<StorageProviderView>,
    successMessage: string,
    closeOnSuccess = false,
  ) => {
    setSubmitting(true);
    setModalNotice(undefined);
    try {
      const saved = await action();
      applyProviderSnapshot(saved);
      setModalNotice({ type: 'success', message: successMessage });
      if (closeOnSuccess) {
        window.setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      setModalNotice({
        type: 'error',
        message: formatMutationError(error, t('noticeOperationFailed')),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const doSubmit = () => {
    if (!validate()) return;
    const effectiveKind: StorageProviderKind = providerKind === 'custom' ? `custom:${customKind}` as StorageProviderKind : providerKind;
    const credentialPayload = credentialRef.trim() ? credentialRef : undefined;

    if (provider) {
      void runFormAction(
        () => onUpdateProvider(provider.id, {
          name,
          endpointUrl: endpointUrl || undefined,
          region: region || undefined,
          bucket,
          pathStyle,
          credentialRef: credentialPayload,
          status,
          serverSideEncryptionMode: sseMode || undefined,
          defaultStorageClass: storageClass || undefined,
          strictTls,
        }),
        t('noticeUpdated'),
        true,
      );
      return;
    }

    void runFormAction(
      () => onCreateProvider({
        id: generatedId,
        providerKind: effectiveKind,
        name,
        endpointUrl,
        region: region || undefined,
        bucket,
        pathStyle,
        credentialRef: credentialPayload,
        status,
        serverSideEncryptionMode: sseMode || undefined,
        defaultStorageClass: storageClass || undefined,
        strictTls,
      }),
      t('noticeCreated'),
      true,
    );
  };

  const handleRotateCredential = () => {
    if (!provider || !credentialRef.trim() || isCredentialRefMasked(credentialRef)) {
      setModalNotice({ type: 'error', message: t('credentialRequired') });
      return;
    }
    void runFormAction(
      () => onRotateCredential(provider.id, credentialRef.trim()),
      t('noticeRotated'),
    );
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); doSubmit(); };

  const isLocalFs = meta.features.isLocal;
  const hasRegions = meta.regions.length > 0;
  const sseModes = meta.features.hasSse ? (providerKind === 'custom' ? ['AES256'] : meta.sseModes) : [];
  const storageClasses = meta.features.hasStorageClass ? (providerKind === 'custom' ? ['STANDARD'] : meta.storageClasses) : [];
  const allKinds = getAllProviderKindMeta();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{provider ? t('editorEditTitle') : t('editorNewTitle')}</h2>
          <button type="button" className="text-neutral-400 hover:text-neutral-600" onClick={onClose}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-1 overflow-hidden">
          {!isEditing && (
            <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-neutral-100 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {t('stepType')}
              </div>
              <div className="space-y-1">
                {allKinds.map((k) => {
                  const active = providerKind === k.value;
                  return (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => handleKindChange(k.value)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                        active
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${active ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' : `${k.bgClass} ${k.textClass}`}`}>
                        {k.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{k.shortLabel}</div>
                        <div className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                          {k.features.isLocal ? t('localDiskHint') : k.endpointHint.replace('https://', '')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {modalNotice && (
                <FormNoticeBanner
                  type={modalNotice.type}
                  message={modalNotice.message}
                  onDismiss={() => setModalNotice(undefined)}
                />
              )}
              {isEditing && (
                <div className="mb-4 flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${meta.bgClass} ${meta.textClass}`}>{meta.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{meta.label}</div>
                    <div className="font-mono text-[11px] text-neutral-500">{provider?.id}</div>
                  </div>
                </div>
              )}

              {!isEditing && providerKind === 'custom' && (
                <div className="mb-4">
                  <Field label={t('customKind')} error={errors.customKind}>
                    <input value={customKind} onChange={(e) => setCustomKind(e.target.value)} className={INPUT_CLASS} placeholder={t('customKindPlaceholder')} />
                  </Field>
                </div>
              )}

              <FormSection title={t('stepConnection')}>
                <Field label={t('displayName')} error={errors.name}>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder={t('displayNamePlaceholder')} />
                </Field>
              </FormSection>

              <FormSection title={isLocalFs ? t('localPathSection') : t('endpointRegionSection')}>
                {isLocalFs ? (
                  <Field label={t('endpointUrl')} error={errors.endpointUrl}>
                    <input value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} className={`${INPUT_CLASS} font-mono text-xs`} placeholder="/var/data/drive-storage" spellCheck={false} />
                  </Field>
                ) : (
                  <>
                    {hasRegions && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label={t('region')}>
                          <select value={region} onChange={(e) => handleRegionChange(e.target.value)} className={SELECT_CLASS}>
                            {meta.regions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </Field>
                      </div>
                    )}
                    <div className={hasRegions ? 'mt-3' : ''}>
                      <Field label={t('endpointUrl')} error={errors.endpointUrl}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                          <input
                            value={endpointUrl}
                            onChange={(e) => setEndpointUrl(e.target.value)}
                            readOnly={endpointLocked && hasRegions}
                            className={`${INPUT_CLASS} min-w-0 flex-1 font-mono text-xs leading-relaxed ${endpointLocked && hasRegions ? 'bg-neutral-50 dark:bg-neutral-800' : ''}`}
                            placeholder={meta.endpointHint}
                            spellCheck={false}
                          />
                          {hasRegions && (
                            <button
                              type="button"
                              className={`${SECONDARY_BUTTON_CLASS} shrink-0`}
                              onClick={() => setEndpointLocked(!endpointLocked)}
                            >
                              {endpointLocked ? t('endpointOverride') : t('endpointAuto')}
                            </button>
                          )}
                        </div>
                        {hasRegions && endpointLocked && (
                          <span className="mt-0.5 text-[10px] text-neutral-400">{t('endpointAutoFilled')}</span>
                        )}
                      </Field>
                    </div>
                  </>
                )}

                <div className="mt-3">
                  <Field label={t('bucket')} error={errors.bucket}>
                    <input value={bucket} onChange={(e) => setBucket(e.target.value)} className={INPUT_CLASS} placeholder={t('bucketPlaceholder')} />
                    {meta.credentialFields?.bucketHint && (
                      <span className="mt-0.5 text-[10px] text-neutral-400">
                        {t('bucketNamingHint')}: {meta.credentialFields.bucketHint}
                      </span>
                    )}
                  </Field>
                </div>

                {!isLocalFs && usesStructuredCredentials && meta.credentialFields && (
                  <div className="mt-4">
                    <StorageProviderCredentialFields
                      credentialFields={meta.credentialFields}
                      credentialRef={credentialRef}
                      isEditing={isEditing}
                      credentialConfigured={provider?.credentialConfigured}
                      error={errors.credentialRef}
                      onCredentialRefChange={handleCredentialRefChange}
                    />
                  </div>
                )}

                {!isLocalFs && !usesStructuredCredentials && (
                  <div className="mt-3">
                    <Field label={meta.credentialLabel || t('credentialRef')} error={errors.credentialRef}>
                      <div className="relative">
                        <input
                          value={credentialRef}
                          onChange={(e) => setCredentialRef(e.target.value)}
                          type={showCredential ? 'text' : 'password'}
                          className={`${INPUT_CLASS} pr-9 font-mono text-xs`}
                          placeholder={meta.credentialHint}
                        />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600" onClick={() => setShowCredential(!showCredential)}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCredential ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} /></svg>
                        </button>
                      </div>
                      <span className="mt-0.5 text-[10px] text-neutral-400">{t('credentialFormats')}</span>
                    </Field>
                  </div>
                )}

                {!isLocalFs && (
                  <div className="mt-3 flex flex-wrap gap-4">
                    {meta.features.hasPathStyle && (
                      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <input type="checkbox" className={CHECKBOX_CLASS} checked={pathStyle} onChange={(e) => setPathStyle(e.target.checked)} />
                        {t('pathStyle')}
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                      <input type="checkbox" className={CHECKBOX_CLASS} checked={strictTls} onChange={(e) => setStrictTls(e.target.checked)} />
                      {t('strictTls')}
                    </label>
                  </div>
                )}
              </FormSection>

              {(sseModes.length > 0 || storageClasses.length > 0) && (
                <FormSection title={t('stepAdvanced')}>
                  <div className="grid grid-cols-2 gap-3">
                    {sseModes.length > 0 && <Field label={t('sseMode')}><select value={sseMode} onChange={(e) => setSseMode(e.target.value)} className={SELECT_CLASS}><option value="">{t('none')}</option>{sseModes.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>}
                    {storageClasses.length > 0 && <Field label={t('defaultStorageClass')}><select value={storageClass} onChange={(e) => setStorageClass(e.target.value)} className={SELECT_CLASS}><option value="">{t('providerDefault')}</option>{storageClasses.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>}
                  </div>
                  {isEditing && usesStructuredCredentials && credentialRef && !isCredentialRefMasked(credentialRef) && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-amber-800 dark:text-amber-200">{t('credentialRotation')}</div>
                          <div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">{t('credentialRotationDesc')}</div>
                        </div>
                        <button type="button" className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100" disabled={submitting} onClick={handleRotateCredential}>{t('rotateRef')}</button>
                      </div>
                    </div>
                  )}
                </FormSection>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold ${meta.bgClass} ${meta.textClass}`}>{meta.icon}</div>
                <span className="text-xs text-neutral-500">{meta.label}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>{t('cancel')}</button>
                <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={submitting} onClick={doSubmit}>
                  {submitting ? t('saving') : provider ? t('save') : t('create')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-3 border-b border-neutral-100 pb-1.5 dark:border-neutral-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>{children}{error && <span className="text-[11px] text-red-500">{error}</span>}</label>;
}
