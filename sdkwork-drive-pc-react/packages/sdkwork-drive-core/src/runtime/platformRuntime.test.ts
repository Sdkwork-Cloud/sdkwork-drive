import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(async () => {
  vi.resetModules();

  const module = await import('./platformRuntime.ts');
  module.resetDesktopPlatformBridge();
});

describe('platformRuntime desktop bridge', () => {
  it('uses the browser runtime by default', async () => {
    const module = await import('./platformRuntime.ts');

    expect(module.platform.getPlatform()).toBe('web');
    expect(module.getPlatformRuntime().system.kind()).toBe('web');
    await expect(module.getPlatformRuntime().system.path('downloads')).resolves.toBe('Downloads');
  });

  it('delegates runtime capabilities through the configured desktop bridge', async () => {
    const module = await import('./platformRuntime.ts');
    const bridge = {
      system: {
        path: vi.fn().mockResolvedValue('C:/Users/admin/Downloads'),
      },
      fileSystem: {
        exists: vi.fn().mockResolvedValue(true),
        writeBinary: vi.fn().mockResolvedValue(undefined),
        readBinary: vi.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
        selectFile: vi.fn().mockResolvedValue(['C:/Users/admin/Desktop/contract.pdf']),
      },
      network: {
        requestBinary: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        downloadToFile: vi.fn().mockResolvedValue(undefined),
      },
    };

    module.configureDesktopPlatformBridge(bridge);

    const runtime = module.getPlatformRuntime();
    expect(module.platform.getPlatform()).toBe('desktop');
    expect(runtime.system.kind()).toBe('desktop');
    await expect(runtime.system.path('downloads')).resolves.toBe('C:/Users/admin/Downloads');

    const sampleBytes = new Uint8Array([4, 5, 6]);
    await runtime.fileSystem.writeBinary('C:/Users/admin/Downloads/demo.bin', sampleBytes);
    expect(bridge.fileSystem.writeBinary).toHaveBeenCalledWith(
      'C:/Users/admin/Downloads/demo.bin',
      sampleBytes,
    );

    await runtime.network.downloadToFile(
      'https://cdn.example.com/demo.bin',
      'C:/Users/admin/Downloads/demo.bin',
    );
    expect(bridge.network.downloadToFile).toHaveBeenCalledWith(
      'https://cdn.example.com/demo.bin',
      'C:/Users/admin/Downloads/demo.bin',
      undefined,
    );

    await expect(module.platform.selectFile()).resolves.toEqual([
      'C:/Users/admin/Desktop/contract.pdf',
    ]);
    await expect(module.platform.readFileBinary('C:/Users/admin/Desktop/contract.pdf')).resolves.toEqual(
      new Uint8Array([7, 8, 9]),
    );
  });
});
