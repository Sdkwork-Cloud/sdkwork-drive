import { startTransition, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@sdkwork/drive-ui';
import {
  settingsService,
  useAppStore,
  useAuthStore,
  type ThemeColor,
  type ThemeMode,
  type UserPreferences,
} from '@sdkwork/drive-core';
import {
  buildDisplayName,
  buildProfileCompletion,
  canSavePreferenceChanges,
  canSaveProfileChanges,
  validateProfileDraft,
  type ProfileDraft,
} from '../profileViewModel.ts';

const DEFAULT_PREFERENCES: UserPreferences = {
  general: {
    launchOnStartup: false,
    startMinimized: false,
  },
  notifications: {
    systemUpdates: true,
    taskFailures: true,
    securityAlerts: true,
    taskCompletions: false,
    newMessages: true,
  },
  privacy: {
    shareUsageData: false,
    personalizedRecommendations: false,
  },
  security: {
    twoFactorAuth: false,
    loginAlerts: true,
  },
};

export function ProfileSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const syncUserProfile = useAuthStore((state) => state.syncUserProfile);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const themeColor = useAppStore((state) => state.themeColor);
  const setThemeColor = useAppStore((state) => state.setThemeColor);
  const languagePreference = useAppStore((state) => state.languagePreference);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    firstName: authUser?.firstName || '',
    lastName: authUser?.lastName || '',
    email: authUser?.email || '',
  });
  const [savedProfile, setSavedProfile] = useState<ProfileDraft>({
    firstName: authUser?.firstName || '',
    lastName: authUser?.lastName || '',
    email: authUser?.email || '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [profile, userPreferences] = await Promise.all([
          settingsService.getProfile(),
          settingsService.getPreferences(),
        ]);

        if (cancelled) {
          return;
        }

        const nextProfile = {
          firstName: profile.firstName || authUser?.firstName || '',
          lastName: profile.lastName || authUser?.lastName || '',
          email: profile.email || authUser?.email || '',
        };

        setProfileDraft(nextProfile);
        setSavedProfile(nextProfile);
        setPreferences(userPreferences);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : t('settings.account.toasts.loadFailed'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.email, authUser?.firstName, authUser?.lastName, t]);

  const profileErrors = useMemo(() => validateProfileDraft(profileDraft), [profileDraft]);
  const completion = useMemo(() => buildProfileCompletion(profileDraft), [profileDraft]);
  const displayName = useMemo(
    () => buildDisplayName(profileDraft.firstName, profileDraft.lastName) || t('settings.account.guestName'),
    [profileDraft.firstName, profileDraft.lastName, t],
  );
  const profileDirty =
    profileDraft.firstName !== savedProfile.firstName ||
    profileDraft.lastName !== savedProfile.lastName ||
    profileDraft.email !== savedProfile.email;
  const canSaveProfile = useMemo(() => canSaveProfileChanges({
    isLoading,
    isSaving: isSavingProfile,
    hasValidationErrors: profileErrors.length > 0,
    isDirty: profileDirty,
  }), [isLoading, isSavingProfile, profileDirty, profileErrors.length]);
  const canSavePreferences = useMemo(() => canSavePreferenceChanges({
    isLoading,
    isSaving: isSavingPrefs,
  }), [isLoading, isSavingPrefs]);
  const isProfileBusy = isLoading || isSavingProfile;
  const isPreferencesBusy = isLoading || isSavingPrefs;

  function updatePreferenceSection<
    TSection extends keyof UserPreferences,
    TKey extends keyof UserPreferences[TSection],
  >(section: TSection, key: TKey, value: UserPreferences[TSection][TKey]) {
    setPreferences((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  async function handleSaveProfile() {
    if (!canSaveProfile) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await settingsService.updateProfile({
        firstName: profileDraft.firstName.trim(),
        lastName: profileDraft.lastName.trim(),
        email: profileDraft.email.trim(),
      });
      const nextProfile = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
      };
      setProfileDraft(nextProfile);
      setSavedProfile(nextProfile);
      syncUserProfile(nextProfile);
      toast.success(t('settings.account.toasts.updated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.account.toasts.updateFailed'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSavePreferences() {
    if (!canSavePreferences) {
      return;
    }

    setIsSavingPrefs(true);
    try {
      const updatedPreferences = await settingsService.updatePreferences(preferences);
      setPreferences(updatedPreferences);
      toast.success(t('settings.general.toasts.updated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.general.toasts.updateFailed'));
    } finally {
      setIsSavingPrefs(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      toast.success(t('settings.account.toasts.signedOut'));
      startTransition(() => {
        navigate('/login', { replace: true });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.account.toasts.signOutFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(240,249,255,0.92))] p-6 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.92),rgba(15,23,42,0.92))]">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary-600 text-2xl font-black text-white shadow-xl shadow-primary-950/20">
            {(authUser?.initials || displayName.slice(0, 2) || 'SD').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-500">
              {t('settings.account.hero.badge')}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
              {displayName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {t('settings.account.description')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <MetricCard
            icon={UserRound}
            label={t('settings.account.metrics.completeness')}
            value={`${completion.completed}/${completion.total}`}
            hint={
              completion.nextMissingField
                ? t(`settings.account.completion.next.${completion.nextMissingField}`)
                : t('settings.account.completion.complete')
            }
          />
          <MetricCard
            icon={Sparkles}
            label={t('settings.account.metrics.theme')}
            value={t(`settings.general.themeModes.${themeMode}`)}
            hint={t(`settings.general.themeColors.${themeColor}`)}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t('settings.account.metrics.language')}
            value={
              languagePreference === 'system'
                ? t('settings.general.languages.system')
                : t(`settings.general.languages.${languagePreference}`)
            }
            hint={profileErrors.length > 0 ? t('settings.account.validationNeedsAttention') : t('settings.account.validationHealthy')}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-6">
          <CardSection
            title={t('settings.account.profileTitle')}
            description={t('settings.account.profileDescription')}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t('settings.account.firstName')}
                value={profileDraft.firstName}
                disabled={isProfileBusy}
                onChange={(value) => setProfileDraft((current) => ({ ...current, firstName: value }))}
              />
              <Field
                label={t('settings.account.lastName')}
                value={profileDraft.lastName}
                disabled={isProfileBusy}
                onChange={(value) => setProfileDraft((current) => ({ ...current, lastName: value }))}
              />
            </div>
            <Field
              label={t('settings.account.email')}
              value={profileDraft.email}
              disabled={isProfileBusy}
              onChange={(value) => setProfileDraft((current) => ({ ...current, email: value }))}
            />

            <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {t('settings.account.displayNameLabel')}
              </div>
              <div className="mt-1">{displayName}</div>
            </div>

            {profileErrors.length > 0 ? (
              <div className="rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                {profileErrors.map((error) => t(`settings.account.errors.${error}`)).join(' ')}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleSaveProfile()} disabled={!canSaveProfile}>
                {isSavingProfile ? t('common.loading') : t('settings.account.saveChanges')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setProfileDraft(savedProfile)}
                disabled={!profileDirty || isProfileBusy}
              >
                {t('settings.account.resetChanges')}
              </Button>
            </div>
          </CardSection>

          <CardSection
            title={t('settings.general.title')}
            description={t('settings.general.description')}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Select value={themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)} disabled={isPreferencesBusy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.general.themeMode')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('settings.general.themeModes.light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.general.themeModes.dark')}</SelectItem>
                  <SelectItem value="system">{t('settings.general.themeModes.system')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={themeColor} onValueChange={(value) => setThemeColor(value as ThemeColor)} disabled={isPreferencesBusy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.general.themeColor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech-blue">{t('settings.general.themeColors.tech-blue')}</SelectItem>
                  <SelectItem value="lobster">{t('settings.general.themeColors.lobster')}</SelectItem>
                  <SelectItem value="green-tech">{t('settings.general.themeColors.green-tech')}</SelectItem>
                  <SelectItem value="zinc">{t('settings.general.themeColors.zinc')}</SelectItem>
                  <SelectItem value="violet">{t('settings.general.themeColors.violet')}</SelectItem>
                  <SelectItem value="rose">{t('settings.general.themeColors.rose')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={languagePreference} onValueChange={(value) => setLanguage(value as 'system' | 'en' | 'zh')} disabled={isPreferencesBusy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.general.language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('settings.general.languages.system')}</SelectItem>
                  <SelectItem value="zh">{t('settings.general.languages.zh')}</SelectItem>
                  <SelectItem value="en">{t('settings.general.languages.en')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PreferenceSwitch
                label={t('settings.general.launchOnStartup')}
                description={t('settings.general.launchOnStartupDescription')}
                checked={preferences.general.launchOnStartup}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('general', 'launchOnStartup', checked)}
              />
              <PreferenceSwitch
                label={t('settings.general.startMinimized')}
                description={t('settings.general.startMinimizedDescription')}
                checked={preferences.general.startMinimized}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('general', 'startMinimized', checked)}
              />
            </div>
          </CardSection>
        </section>

        <section className="space-y-6">
          <CardSection
            title={t('settings.notifications.title')}
            description={t('settings.notifications.description')}
          >
            <div className="space-y-4">
              <PreferenceSwitch
                label={t('settings.notifications.systemUpdates')}
                description={t('settings.notifications.systemUpdatesDescription')}
                checked={preferences.notifications.systemUpdates}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('notifications', 'systemUpdates', checked)}
              />
              <PreferenceSwitch
                label={t('settings.notifications.taskFailures')}
                description={t('settings.notifications.taskFailuresDescription')}
                checked={preferences.notifications.taskFailures}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('notifications', 'taskFailures', checked)}
              />
              <PreferenceSwitch
                label={t('settings.notifications.securityAlerts')}
                description={t('settings.notifications.securityAlertsDescription')}
                checked={preferences.notifications.securityAlerts}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('notifications', 'securityAlerts', checked)}
              />
              <PreferenceSwitch
                label={t('settings.notifications.newMessages')}
                description={t('settings.notifications.newMessagesDescription')}
                checked={preferences.notifications.newMessages}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('notifications', 'newMessages', checked)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PreferenceSwitch
                label={t('settings.privacy.shareUsageData')}
                description={t('settings.privacy.shareUsageDataDescription')}
                checked={preferences.privacy.shareUsageData}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('privacy', 'shareUsageData', checked)}
              />
              <PreferenceSwitch
                label={t('settings.security.loginAlerts')}
                description={t('settings.security.loginAlertsDescription')}
                checked={preferences.security.loginAlerts}
                disabled={isPreferencesBusy}
                onCheckedChange={(checked) => updatePreferenceSection('security', 'loginAlerts', checked)}
              />
            </div>

            <Button onClick={() => void handleSavePreferences()} disabled={!canSavePreferences}>
              {isSavingPrefs ? t('common.loading') : t('settings.general.savePreferences')}
            </Button>
          </CardSection>

          <CardSection
            title={t('settings.account.dangerZone')}
            description={t('settings.account.signOutDescription')}
          >
            <Button variant="destructive" onClick={() => void handleSignOut()}>
              {t('settings.account.signOut')}
            </Button>
          </CardSection>
        </section>
      </div>

      {isLoading ? (
        <div className="rounded-[24px] border border-dashed border-zinc-200 bg-white/70 px-6 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          {t('common.loading')}
        </div>
      ) : null}
    </div>
  );
}

function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/85 p-4 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary-50 p-3 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">{label}</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{hint}</div>
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}

function PreferenceSwitch({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[24px] border border-zinc-200/70 bg-zinc-50/70 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="space-y-1">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        <div className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
