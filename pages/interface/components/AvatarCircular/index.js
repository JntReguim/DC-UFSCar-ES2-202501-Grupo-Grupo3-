import { useEffect, useState } from 'react';

import { Box, Text } from '@/TabNewsUI';

export default function AvatarCircular({ user, avatar, size = 'large' }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (avatar) {
      const url = URL.createObjectURL(avatar);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [avatar]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const displayImageUrl = previewUrl || user?.avatar_url;
  const initials = getInitials(user?.username);

  const sizes = {
    small: { width: 24, height: 24, fontSize: 10 },
    medium: { width: 150, height: 150, fontSize: 18 },
    large: { width: 250, height: 250, fontSize: 24 },
  };

  const currentSize = sizes[size] || sizes.large;

  return (
    <Box
      sx={{
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'border.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'canvas.subtle',
        mb: size === 'large' ? 2 : 0,
      }}>
      {displayImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayImageUrl}
          alt={`Avatar de ${user?.username}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <Text
          sx={{
            fontSize: currentSize.fontSize,
            fontWeight: 'bold',
            color: 'fg.default',
          }}>
          {initials}
        </Text>
      )}
    </Box>
  );
}
