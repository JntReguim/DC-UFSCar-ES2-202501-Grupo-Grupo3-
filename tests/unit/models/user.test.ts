vi.mock('infra/storage');
vi.mock('fs/promises');
vi.mock('infra/database.js');
vi.mock('models/validator.js');

import fs from 'fs/promises';

import database from 'infra/database.js';
import { storage } from 'infra/storage';
import content from 'models/content';
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
  });
  it('should throw an error if storage.upload.public.file fails', async () => {
    const targetUser = { id: 'user-id-123' };
    const postedUserData = {
      avatar: { filepath: '/tmp/file.png', originalFilename: 'avatar.png', mimetype: 'image/png' },
    };

    vi.mocked(validator).mockReturnValue({ avatar: postedUserData.avatar });
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('image-data'));
    vi.mocked(storage.upload.public.file).mockRejectedValue(new Error('Upload failed'));

    await expect(user.updateAvatar(targetUser, postedUserData)).rejects.toThrow('Upload failed');
  });
  it('should throw an error if database.query fails', async () => {
    const targetUser = { id: 'user-id-123' };
    const postedUserData = {
      avatar: { filepath: '/tmp/file.png', originalFilename: 'avatar.png', mimetype: 'image/png' },
    };
    const fakeAvatarUrl = 'https://example.com/avatar.png';

    vi.mocked(validator).mockReturnValue({ avatar: postedUserData.avatar });
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('image'));
    vi.mocked(storage.upload.public.file).mockResolvedValue({
      cid: 'cid123',
      id: '',
      name: '',
      size: 0,
      created_at: '',
      number_of_files: 0,
      mime_type: '',
      group_id: '',
      keyvalues: {},
      vectorized: false,
      network: '',
    });
    vi.mocked(storage.gateways.public.convert).mockResolvedValue(fakeAvatarUrl);
    vi.mocked(database.query).mockRejectedValue(new Error('Database update failed'));

    await expect(user.updateAvatar(targetUser, postedUserData)).rejects.toThrow('Database update failed');
  });

  it('should return content with user_avatar_url when viewing a post', async () => {
    const mockContent = {
      id: 'content-123',
      user_id: 'user-123',
      user_avatar_url: 'https://example.com/avatar.png',
    };
    const findOptions = {
      id: 'content-123',
    };

    vi.mocked(database.query).mockResolvedValue({ rows: [mockContent] });
    const result = await content.findOne(findOptions);

    expect(result.user_avatar_url).toBeDefined();
    expect(result.user_avatar_url).toBe('https://example.com/avatar.png');
  });

  it('should return list of contents with user_avatar_url', async () => {
    const mockContents = [
      { id: '1', user_avatar_url: 'https://example.com/avatar1.png' },
      { id: '2', user_avatar_url: 'https://example.com/avatar2.png' },
    ];

    vi.mocked(database.query).mockResolvedValue({ rows: mockContents });

    const result = await content.findAll();
    expect(result.every((item) => item.user_avatar_url)).toBe(true);
  });
});
