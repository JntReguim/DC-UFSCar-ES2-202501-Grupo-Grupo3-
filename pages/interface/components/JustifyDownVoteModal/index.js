import { Box, Button, Heading, Text, Textarea } from '@primer/react';
import { useState } from 'react';

export default function JustifyVoteModal({ title, description, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const maxLength = 255;
  const minLength = 5;

  const isReasonInvalid = reason.trim().length < minLength || reason.trim().length > maxLength;

  function handleSubmit() {
    onSubmit(reason);
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}>
      <Box
        sx={{
          background: '#F2F5F7',
          p: 4,
          borderRadius: 6,
          width: ['90%', '500px'],
          boxShadow: 'shadow.large',
        }}
        onClick={(e) => e.stopPropagation()}>
        <Heading as="h2" sx={{ mb: 3 }}>
          {title}
        </Heading>

        <Text as="p" sx={{ mb: 3, color: 'fg.muted' }}>
          {description}
        </Text>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Seja respeitoso e construtivo..."
          rows={4}
          minLength={minLength}
          maxLength={maxLength}
          sx={{
            width: '100%',
            mb: 3,
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} variant="invisible">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} variant="primary" disabled={isReasonInvalid}>
            Confirmar Voto
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
