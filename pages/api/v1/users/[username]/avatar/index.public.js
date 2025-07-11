import formidable from 'formidable';
import { createRouter } from 'next-connect';

import { ForbiddenError } from 'errors';
import database from 'infra/database.js';
import authentication from 'models/authentication.js';
import authorization from 'models/authorization.js';
import cacheControl from 'models/cache-control';
import controller from 'models/controller.js';
import event from 'models/event.js';
import user from 'models/user.js';
import validator from 'models/validator.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseMultipartForm = (request, response, next) => {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024, // 20 MB
  });

  form.parse(request, (err, fields, files) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        response.status(413).json({ error: 'O arquivo enviado excede o tamanho máximo permitido (20MB).' });
        return;
      }

      response.status(400).json({ error: 'Erro ao processar o upload.' });
      return;
    }

    request.body = fields;
    request.files = files;

    return next();
  });
};

export default createRouter()
  .use(controller.injectRequestMetadata)
  .use(controller.logRequest)
  .patch(
    cacheControl.noCache,
    authentication.injectAnonymousOrUser,
    parseMultipartForm,
    patchValidationHandler,
    authorization.canRequest('update:user:avatar'),
    patchHandler,
  )
  .handler(controller.handlerOptions);

function patchValidationHandler(request, response, next) {
  const cleanQueryValues = validator(request.query, {
    username: 'required',
  });

  request.query = cleanQueryValues;

  return next();
}

async function patchHandler(request, response) {
  const userTryingToPatch = request.context.user;
  const targetUsername = request.query.username;
  const targetUser =
    targetUsername === userTryingToPatch.username ? userTryingToPatch : await user.findOneByUsername(targetUsername);
  const insecureInputValues = {
    avatar: request.files.avatar[0],
  };

  let updateAnotherUser = false;

  if (!authorization.can(userTryingToPatch, 'update:user:avatar', targetUser)) {
    if (!authorization.can(userTryingToPatch, 'update:user:avatar:others')) {
      throw new ForbiddenError({
        message: 'Você não possui permissão para atualizar o avatar de outro usuário.',
        action: 'Verifique se você possui a feature "update:user:avatar:others".',
        errorLocationCode: 'CONTROLLER:USERS:USERNAME:AVATAR:PATCH:USER_CANT_UPDATE_OTHER_USER_AVATAR',
      });
    }

    updateAnotherUser = true;
  }

  const secureInputValues = authorization.filterInput(
    userTryingToPatch,
    updateAnotherUser ? 'update:user:avatar:others' : 'update:user:avatar',
    insecureInputValues,
    targetUser,
  );

  const transaction = await database.transaction();

  let updatedUser;

  try {
    await transaction.query('BEGIN');

    updatedUser = await user.updateAvatar(targetUser, secureInputValues, {
      transaction: transaction,
    });

    await event.create(
      {
        type: 'update:user:avatar',
        originator_user_id: request.context.user.id,
        originator_ip: request.context.clientIp,
        metadata: {
          id: targetUser.id,
          updatedFields: ['avatar_url'],
        },
      },
      {
        transaction: transaction,
      },
    );

    await transaction.query('COMMIT');
    await transaction.release();
  } catch (error) {
    await transaction.query('ROLLBACK');
    await transaction.release();

    throw error;
  }

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    updateAnotherUser ? 'read:user' : 'read:user:self',
    updatedUser,
  );

  return response.status(200).json(secureOutputValues);
}
