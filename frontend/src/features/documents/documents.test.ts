// @vitest-environment node
// Multipart uploads need Node's native FormData/File (jsdom's are incompatible with undici fetch).
import { describe, expect, it } from 'vitest';
import { documentsApi } from './api';
import { DEMO, signInAs } from '@/test/auth';

describe('document uploads (G6)', () => {
  it('rejects oversized and unsupported files, accepts a PDF', async () => {
    await signInAs(DEMO.volunteer);
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 16)], 'big.pdf', { type: 'application/pdf' });
    await expect(documentsApi.upload({ file: big, document_type: 'certification', title: 'Big' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { file: ['The file field must not be greater than 2048 kilobytes.'] },
    });
    const exe = new File(['x'], 'x.exe', { type: 'application/x-msdownload' });
    await expect(documentsApi.upload({ file: exe, document_type: 'certification', title: 'Bad' })).rejects.toMatchObject({ status: 422 });
    const good = new File(['%PDF'], 'cert.pdf', { type: 'application/pdf' });
    const d = await documentsApi.upload({ file: good, document_type: 'certification', title: 'CPR card' });
    expect(d.verification_status).toBe('pending');
    expect((await documentsApi.mine())[0]!.title).toBe('CPR card');
  });
});
