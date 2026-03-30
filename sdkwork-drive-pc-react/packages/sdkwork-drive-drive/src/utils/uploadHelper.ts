export interface UploadFile {
  name: string;
  data: Uint8Array;
}

function readFileAsUint8Array(file: File) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(file);
  });
}

export async function normalizeBrowserFiles(files: File[]) {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      data: await readFileAsUint8Array(file),
    })),
  );
}

export function pickBrowserFiles(options?: { multiple?: boolean; accept?: string }) {
  return new Promise<UploadFile[]>((resolve) => {
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.multiple ?? true;
    input.accept = options?.accept ?? '*/*';
    input.style.display = 'none';

    input.addEventListener(
      'change',
      () => {
        const selectedFiles = Array.from(input.files ?? []);
        void normalizeBrowserFiles(selectedFiles).then(resolve);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}
