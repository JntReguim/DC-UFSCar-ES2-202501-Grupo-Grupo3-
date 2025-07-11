exports.up = (pgm) => {
  pgm.addColumns('users', {
    avatar_url: {
      type: 'varchar',
      check: 'length(avatar_url) <= 2000',
      notNull: false,
    },
  });
};

exports.down = false;
