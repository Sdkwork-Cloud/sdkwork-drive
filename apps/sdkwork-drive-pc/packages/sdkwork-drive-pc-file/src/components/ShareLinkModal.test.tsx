// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from 'sdkwork-drive-pc-commons';
import type { DriveFileService } from 'sdkwork-drive-pc-core';
import type { DriveFile } from 'sdkwork-drive-pc-types';
import { ShareLinkModal } from './ShareLinkModal';

const sampleFile: DriveFile = {
  id: 'file-share-ui',
  name: 'Roadmap.pdf',
  type: 'file',
  ownerId: 'user-001',
  updatedAt: '2026-06-23T00:00:00.000Z',
};

function createFileServiceMock(): DriveFileService {
  return {
    listShareLinks: vi.fn().mockResolvedValue([
      {
        id: 'share-existing',
        nodeId: sampleFile.id,
        role: 'reader',
        downloadCount: 2,
        accessCodeRequired: true,
        lifecycleStatus: 'active',
        version: 1,
      },
    ]),
    createShareLink: vi.fn().mockResolvedValue({
      id: 'share-new',
      nodeId: sampleFile.id,
      role: 'reader',
      downloadCount: 0,
      accessCodeRequired: true,
      lifecycleStatus: 'active',
      version: 1,
      token: 'share-token-ui-e2e-123456789012345678901234567890',
      accessCode: 'extract-ui-42',
    }),
    revokeShareLink: vi.fn().mockResolvedValue(true),
  } as unknown as DriveFileService;
}

function renderShareLinkModal(fileService: DriveFileService) {
  const onClose = vi.fn();
  const onToast = vi.fn();
  render(
    <LanguageProvider defaultLanguage="en">
      <ShareLinkModal
        isOpen
        file={sampleFile}
        fileService={fileService}
        onClose={onClose}
        onToast={onToast}
      />
    </LanguageProvider>,
  );
  return { onClose, onToast };
}

afterEach(() => {
  cleanup();
});

describe('ShareLinkModal', () => {
  it('renders extraction code field and existing protected share links', async () => {
    const fileService = createFileServiceMock();
    renderShareLinkModal(fileService);

    expect(screen.getByText('Share links')).toBeTruthy();
    expect(screen.getByPlaceholderText('Optional 4-64 chars')).toBeTruthy();
  });

  it('creates a share link with extraction code and surfaces token feedback', async () => {
    const fileService = createFileServiceMock();
    const { onToast } = renderShareLinkModal(fileService);

    fireEvent.change(screen.getByPlaceholderText('Optional 4-64 chars'), {
      target: { value: 'extract-ui-42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));

    await waitFor(() => {
      expect(fileService.createShareLink).toHaveBeenCalledWith(
        sampleFile.id,
        expect.objectContaining({
          role: 'reader',
          accessCode: 'extract-ui-42',
        }),
      );
    });

    expect(
      await screen.findByText('share-token-ui-e2e-123456789012345678901234567890'),
    ).toBeTruthy();
    expect(await screen.findByText('extract-ui-42')).toBeTruthy();
    expect(onToast).toHaveBeenCalledWith('Share link created', 'success');
  });

  it('shows extraction-code-required badge for protected links', async () => {
    const fileService = createFileServiceMock();
    renderShareLinkModal(fileService);

    expect(await screen.findByText(/Extraction code required/)).toBeTruthy();
  });
});
