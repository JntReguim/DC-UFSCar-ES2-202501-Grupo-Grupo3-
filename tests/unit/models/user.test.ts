vi.mock('infra/storage');
vi.mock('fs/promises');
vi.mock('infra/database.js');
vi.mock('models/validator.js');

import fs from 'fs/promises';

import { ValidationError } from 'errors';
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
        number_of_files: 1,
        mime_type: 'image/png',
        group_id: 'group-123',
        keyvalues: {},
        sha256: 'hash123',
        path: '/tmp/avatar.png',
        vectorized: false,
        network: 'ipfs',
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

    it('should throw ValidationError if avatar file size exceeds 10MB', async () => {
      const targetUser = { id: 'user-id-123' };
      const postedUserData = { avatar: { filepath: '/tmp/huge-file.png' } };

      vi.mocked(validator).mockImplementation(() => {
        throw new ValidationError({
          message: 'O arquivo é muito grande',
          key: 'avatar',
          action: 'Envie um arquivo menor que 10MB',
          stack: new Error().stack,
          statusCode: 400,
          context: null,
          errorLocationCode: 'MODEL:USER:UPDATE_AVATAR:FILE_TOO_LARGE',
          type: 'validation',
        });
      });

      await expect(user.updateAvatar(targetUser, postedUserData)).rejects.toThrow(ValidationError);
    });
  });
});
