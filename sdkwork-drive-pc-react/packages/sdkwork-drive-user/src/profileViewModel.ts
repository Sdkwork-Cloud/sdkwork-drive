const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProfileCompletion {
  total: number;
  completed: number;
  nextMissingField: keyof ProfileDraft | null;
}

function normalizeField(value: string) {
  return value.trim();
}

export function buildDisplayName(firstName: string, lastName: string) {
  return [normalizeField(firstName), normalizeField(lastName)].filter(Boolean).join(' ');
}

export function buildProfileCompletion(draft: ProfileDraft): ProfileCompletion {
  const orderedFields: Array<keyof ProfileDraft> = ['firstName', 'lastName', 'email'];
  const missingField = orderedFields.find((field) => !normalizeField(draft[field]));

  return {
    total: orderedFields.length,
    completed: orderedFields.filter((field) => Boolean(normalizeField(draft[field]))).length,
    nextMissingField: missingField ?? null,
  };
}

export function validateProfileDraft(draft: ProfileDraft) {
  const errors: string[] = [];
  const email = normalizeField(draft.email);

  if (!email) {
    errors.push('email_required');
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('email_invalid');
  }

  return errors;
}

export function canSaveProfileChanges(options: {
  isLoading: boolean;
  isSaving: boolean;
  hasValidationErrors: boolean;
  isDirty: boolean;
}) {
  return !options.isLoading && !options.isSaving && !options.hasValidationErrors && options.isDirty;
}

export function canSavePreferenceChanges(options: {
  isLoading: boolean;
  isSaving: boolean;
}) {
  return !options.isLoading && !options.isSaving;
}
