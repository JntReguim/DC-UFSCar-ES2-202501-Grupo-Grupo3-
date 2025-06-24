exports.up = (pgm) => {
  pgm.addColumns('content_tabcoin_operations', {
    reason: {
      type: 'varchar(255)',
      notNull: false,
    },
  });
};

exports.down = false;
