vi.mock('infra/storage');
vi.mock('fs/promises');
vi.mock('infra/database.js');
vi.mock('models/validator.js');

import fs from 'fs/promises';

import database from 'infra/database.js';
import { storage } from 'infra/storage';
import user from 'models/user';
import validator from 'models/validator.js';

describe('User Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAvatar', () => {
    it('should update the user with the generated avatar URL', async () => {
      const targetUser = { id: 'user-id-123' };
      const postedUserData = { avatar: { filepath: '/tmp/file.png' } };
      const fakeAvatarUrl = 'https://example.com/my-generic-string-avatar.png';
      const mockUpdatedUser = { ...targetUser, avatar_url: fakeAvatarUrl };

      const mockUploadResponse = {
        cid: 'any-cid-123',
        id: 'file-id-abc-456',
        name: 'avatar.png',
        size: 54321,
        type: 'image/png',
        created_at: ' new Date().toISOString()',
      };

      vi.mocked(validator).mockReturnValue({ avatar: postedUserData.avatar });
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(''));
      vi.mocked(storage.upload.public.file).mockResolvedValue(mockUploadResponse);

      vi.mocked(storage.gateways.public.convert).mockResolvedValue(fakeAvatarUrl);
      vi.mocked(database.query).mockResolvedValue({ rows: [mockUpdatedUser] });
      const result = await user.updateAvatar(targetUser, postedUserData);
      expect(database.query).toHaveBeenCalledWith(
        expect.objectContaining({
          values: [fakeAvatarUrl, targetUser.id],
        }),
        expect.any(Object),
      );
      expect(result).toStrictEqual(mockUpdatedUser);
    });
  });
});
