import { describe, expect, it } from 'vitest';
import {
  buildDisplayName,
  buildProfileCompletion,
  canSavePreferenceChanges,
  canSaveProfileChanges,
  validateProfileDraft,
} from '../src/profileViewModel.ts';

describe('profileViewModel', () => {
  it('builds display names without extra whitespace', () => {
    expect(buildDisplayName('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(buildDisplayName('Ada', '')).toBe('Ada');
  });

  it('computes completeness and next missing field', () => {
    const result = buildProfileCompletion({
      firstName: 'Ada',
      lastName: '',
      email: '',
    });

    expect(result.completed).toBe(1);
    expect(result.total).toBe(3);
    expect(result.nextMissingField).toBe('lastName');
  });

  it('validates missing and malformed email addresses', () => {
    expect(
      validateProfileDraft({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: '',
      }),
    ).toContain('email_required');

    expect(
      validateProfileDraft({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'invalid-email',
      }),
    ).toContain('email_invalid');
  });

  it('blocks save actions while the settings page is still loading', () => {
    expect(canSaveProfileChanges({
      isLoading: true,
      isSaving: false,
      hasValidationErrors: false,
      isDirty: true,
    })).toBe(false);

    expect(canSaveProfileChanges({
      isLoading: false,
      isSaving: false,
      hasValidationErrors: false,
      isDirty: true,
    })).toBe(true);

    expect(canSavePreferenceChanges({
      isLoading: true,
      isSaving: false,
    })).toBe(false);

    expect(canSavePreferenceChanges({
      isLoading: false,
      isSaving: false,
    })).toBe(true);
  });
});
