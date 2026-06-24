import { describe, expect, it } from 'vitest';
import {
  formatTransferJobProgressDetail,
  formatTransferJobSpeedLabel,
  formatTransferJobTimeRemainingLabel,
} from '../src/utils/transferJobDisplay';

const en = (key: string): string => {
  const table: Record<string, string> = {
    'transfer.connecting': 'Connecting...',
    'transfer.uploading': 'Uploading...',
    'transfer.downloading': 'Downloading...',
    'transfer.calculating': 'Calculating...',
    'transfer.finishing': 'Finishing...',
    'transfer.finalizing': 'Finalizing...',
    'transfer.waitingBackendConfirmation': 'Waiting for backend confirmation',
    'transfer.available': 'Available',
    'transfer.saveCancelled': 'Save cancelled',
    'downloadManager.ready': 'Ready',
    'transfer.paused': 'Paused',
  };
  return table[key] ?? key;
};

describe('transferJobDisplay', () => {
  it('maps canonical speed tokens to i18n labels', () => {
    expect(formatTransferJobSpeedLabel('Connecting...', en)).toBe('Connecting...');
    expect(formatTransferJobSpeedLabel('Uploading...', en)).toBe('Uploading...');
    expect(formatTransferJobSpeedLabel('Downloading...', en)).toBe('Downloading...');
    expect(formatTransferJobSpeedLabel('Ready', en)).toBe('Ready');
    expect(formatTransferJobSpeedLabel('1.2 MB/s', en)).toBe('1.2 MB/s');
  });

  it('maps canonical time-remaining tokens to i18n labels', () => {
    expect(formatTransferJobTimeRemainingLabel('Calculating...', en)).toBe('Calculating...');
    expect(formatTransferJobTimeRemainingLabel('Finishing...', en)).toBe('Finishing...');
    expect(formatTransferJobTimeRemainingLabel('Finalizing...', en)).toBe('Finalizing...');
    expect(formatTransferJobTimeRemainingLabel('Waiting for backend confirmation', en)).toBe(
      'Waiting for backend confirmation',
    );
    expect(formatTransferJobTimeRemainingLabel('Available', en)).toBe('Available');
    expect(formatTransferJobTimeRemainingLabel('Save cancelled', en)).toBe('Save cancelled');
  });

  it('formats active transfer progress detail lines', () => {
    expect(
      formatTransferJobProgressDetail(
        { status: 'uploading', speed: 'Uploading...', timeRemaining: 'Calculating...' },
        en,
      ),
    ).toBe('Uploading... - Calculating...');
    expect(
      formatTransferJobProgressDetail(
        { status: 'ready', speed: 'Ready', timeRemaining: 'Available' },
        en,
      ),
    ).toBe('Ready');
    expect(
      formatTransferJobProgressDetail(
        { status: 'paused', speed: '--', timeRemaining: '' },
        en,
      ),
    ).toBe('Paused');
  });
});
