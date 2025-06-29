import { bigText, relevantBody } from 'tests/constants-for-tests';
import orchestrator from 'tests/orchestrator.js';
import RequestBuilder from 'tests/request-builder';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
});

describe('POST /api/v1/contents/tabcoins', () => {
  describe('Anonymous user', () => {
    test('Not logged in', async () => {
      const defaultUser = await orchestrator.createUser();
      await orchestrator.activateUser(defaultUser);

      const defaultUserContent = await orchestrator.createContent({
        owner_id: defaultUser.id,
        title: 'Title',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${defaultUser.username}/${defaultUserContent.slug}/tabcoins`,
      );

      const { response, responseBody } = await tabcoinsRequestBuilder.post({
        transaction_type: 'credit',
      });

      expect.soft(response.status).toBe(403);

      expect(responseBody).toStrictEqual({
        name: 'ForbiddenError',
        message: 'Usuário não pode executar esta operação.',
        action: 'Verifique se este usuário possui a feature "update:content".',
        status_code: 403,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:AUTHORIZATION:CAN_REQUEST:FEATURE_NOT_FOUND',
      });
    });
  });

  describe('Default user', () => {
    test('With no "transaction_type"', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      await tabcoinsRequestBuilder.buildUser();

      const { response, responseBody } = await tabcoinsRequestBuilder.post({});

      expect.soft(response.status).toBe(400);

      expect(responseBody).toStrictEqual({
        name: 'ValidationError',
        message: '"transaction_type" é um campo obrigatório.',
        action: 'Ajuste os dados enviados e tente novamente.',
        status_code: 400,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:VALIDATOR:FINAL_SCHEMA',
        key: 'transaction_type',
        type: 'any.required',
      });
    });

    test('With "transaction_type" set to "debit" but without "reason"', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response, responseBody } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        // Não envia o campo 'reason'
      });

      expect.soft(response.status).toBe(422);

      expect(responseBody).toStrictEqual({
        name: 'UnprocessableEntityError',
        message: 'Motivo é obrigatório para transações de débito.',
        action: 'Você precisa informar um motivo para transações de débito.',
        status_code: 422,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:BALANCE:RATE_CONTENT:MISSING_REASON',
      });
    });

    test('With "transaction_type" set to "debit" and "reason" as null', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response, responseBody } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        reason: '',
      });

      expect.soft(response.status).toBe(400);

      expect(responseBody).toStrictEqual({
        name: 'ValidationError',
        message: '"reason" não pode estar em branco.',
        action: 'Ajuste os dados enviados e tente novamente.',
        status_code: 400,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:VALIDATOR:FINAL_SCHEMA',
        key: 'reason',
        type: 'string.empty',
      });
    });

    test('With "transaction_type" set to "debit" and "reason" as number', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response, responseBody } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        reason: 123456789,
      });

      expect.soft(response.status).toBe(400);

      expect(responseBody).toStrictEqual({
        name: 'ValidationError',
        message: '"reason" deve ser do tipo String.',
        action: 'Ajuste os dados enviados e tente novamente.',
        status_code: 400,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:VALIDATOR:FINAL_SCHEMA',
        key: 'reason',
        type: 'string.base',
      });
    });

    test('With not enough TabCoins', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      await tabcoinsRequestBuilder.buildUser();

      const { response, responseBody } = await tabcoinsRequestBuilder.post({
        transaction_type: 'credit',
      });

      expect.soft(response.status).toBe(422);

      expect(responseBody).toStrictEqual({
        name: 'UnprocessableEntityError',
        message: 'Não foi possível adicionar TabCoins nesta publicação.',
        action: 'Você precisa de pelo menos 2 TabCoins para realizar esta ação.',
        status_code: 422,
        error_id: responseBody.error_id,
        request_id: responseBody.request_id,
        error_location_code: 'MODEL:BALANCE:RATE_CONTENT:NOT_ENOUGH',
      });
    });

    test('With "transaction_type" set to "credit"', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: relevantBody,
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response: postTabCoinsResponse, responseBody: postTabCoinsResponseBody } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'credit',
        });

      expect.soft(postTabCoinsResponse.status).toBe(201);

      expect(postTabCoinsResponseBody).toStrictEqual({
        tabcoins: 2,
        tabcoins_credit: 1,
        tabcoins_debit: 0,
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(1);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(0);
      expect(secondUserResponseBody.tabcash).toBe(1);
    });

    test('With "transaction_type" set to "debit"', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: relevantBody,
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response: postTabCoinsResponse, responseBody: postTabCoinsResponseBody } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'debit',
          reason: bigText,
        });

      expect.soft(postTabCoinsResponse.status).toBe(201);

      expect(postTabCoinsResponseBody).toStrictEqual({
        tabcoins: 0,
        tabcoins_credit: 0,
        tabcoins_debit: -1,
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(-1);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(0);
      expect(secondUserResponseBody.tabcash).toBe(1);
    });

    test('With "transaction_type" set to "debit" with more characters than the limit', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: relevantBody,
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const { response: postTabCoinsResponse, responseBody: postTabCoinsResponseBody } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'debit',
          reason: bigText + 'J',
        });

      expect.soft(postTabCoinsResponse.status).toBe(400);

      expect(postTabCoinsResponseBody).toStrictEqual({
        name: 'ValidationError',
        message: '"reason" deve conter no máximo 250 caracteres.',
        action: 'Ajuste os dados enviados e tente novamente.',
        status_code: 400,
        error_id: postTabCoinsResponseBody.error_id,
        request_id: postTabCoinsResponseBody.request_id,
        error_location_code: 'MODEL:VALIDATOR:FINAL_SCHEMA',
        key: 'reason',
        type: 'string.max',
      });
    });

    test('With "transaction_type" set to "credit" four times (should be blocked)', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 8,
      });

      // ROUND 1 OF CREDIT
      const { response: postTabCoinsResponse1 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'credit',
      });

      expect.soft(postTabCoinsResponse1.status).toBe(201);

      // ROUND 2 OF CREDIT
      const { response: postTabCoinsResponse2 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'credit',
      });

      expect.soft(postTabCoinsResponse2.status).toBe(201);

      // ROUND 3 OF CREDIT
      const { response: postTabCoinsResponse3 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'credit',
      });

      expect.soft(postTabCoinsResponse3.status).toBe(201);

      // ROUND 4 OF CREDIT
      const { response: postTabCoinsResponse4, responseBody: postTabCoinsResponse4Body } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'credit',
        });

      expect.soft(postTabCoinsResponse4.status).toBe(400);
      expect(postTabCoinsResponse4Body).toStrictEqual({
        name: 'ValidationError',
        message: 'Você está tentando qualificar muitas vezes o mesmo conteúdo.',
        action: 'Esta operação não poderá ser repetida dentro de 72 horas.',
        status_code: 400,
        error_id: postTabCoinsResponse4Body.error_id,
        request_id: postTabCoinsResponse4Body.request_id,
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(3);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(2);
      expect(secondUserResponseBody.tabcash).toBe(3);
    });

    test('With "transaction_type" set to "debit" four times (should be blocked)', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 8,
      });

      // ROUND 1 OF DEBIT
      const { response: postTabCoinsResponse1 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        reason: 'Não gostei do conteúdo',
      });

      expect.soft(postTabCoinsResponse1.status).toBe(201);

      // ROUND 2 OF DEBIT
      const { response: postTabCoinsResponse2 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        reason: 'Não gostei do conteúdo',
      });

      expect.soft(postTabCoinsResponse2.status).toBe(201);

      // ROUND 3 OF DEBIT
      const { response: postTabCoinsResponse3 } = await tabcoinsRequestBuilder.post({
        transaction_type: 'debit',
        reason: 'Não gostei do conteúdo',
      });

      expect.soft(postTabCoinsResponse3.status).toBe(201);

      // ROUND 4 OF DEBIT
      const { response: postTabCoinsResponse4, responseBody: postTabCoinsResponse4Body } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'debit',
          reason: 'Não gostei do conteúdo',
        });

      expect.soft(postTabCoinsResponse4.status).toBe(400);
      expect(postTabCoinsResponse4Body).toStrictEqual({
        name: 'ValidationError',
        message: 'Você está tentando qualificar muitas vezes o mesmo conteúdo.',
        action: 'Esta operação não poderá ser repetida dentro de 72 horas.',
        status_code: 400,
        error_id: postTabCoinsResponse4Body.error_id,
        request_id: postTabCoinsResponse4Body.request_id,
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(-3);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(2);
      expect(secondUserResponseBody.tabcash).toBe(3);
    });

    test('With "transaction_type" set to "debit" twice to make content "tabcoins" negative', async () => {
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: relevantBody,
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 4,
      });

      // ROUND 1 OF DEBIT
      const { response: postTabCoinsResponse1, responseBody: postTabCoinsResponse1Body } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'debit',
          reason: 'discordo do conteúdo',
        });

      expect.soft(postTabCoinsResponse1.status).toBe(201);

      expect(postTabCoinsResponse1Body).toStrictEqual({
        tabcoins: 0,
        tabcoins_credit: 0,
        tabcoins_debit: -1,
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponse1Body } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponse1Body.tabcoins).toBe(-1);
      expect(firstUserResponse1Body.tabcash).toBe(0);

      const { responseBody: secondUserResponse1Body } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponse1Body.tabcoins).toBe(2);
      expect(secondUserResponse1Body.tabcash).toBe(1);

      // ROUND 2 OF DEBIT
      const { response: postTabCoinsResponse2, responseBody: postTabCoinsResponse2Body } =
        await tabcoinsRequestBuilder.post({
          transaction_type: 'debit',
          reason: 'discordo do conteúdo',
        });

      expect.soft(postTabCoinsResponse2.status).toBe(201);

      expect(postTabCoinsResponse2Body).toStrictEqual({
        tabcoins: -1,
        tabcoins_credit: 0,
        tabcoins_debit: -2,
      });

      const { responseBody: firstUserResponse2Body } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponse2Body.tabcoins).toBe(-2);
      expect(firstUserResponse2Body.tabcash).toBe(0);

      const { responseBody: secondUserResponse2Body } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponse2Body.tabcoins).toBe(0);
      expect(secondUserResponse2Body.tabcash).toBe(2);
    });

    test('With 20 simultaneous posts, but enough TabCoins for 1', async () => {
      const timesToFetch = 20;
      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2,
      });

      const postTabCoinsPromises = Array(timesToFetch)
        .fill()
        .map(() => tabcoinsRequestBuilder.post({ transaction_type: 'credit' }));

      const postTabCoinsResponses = await Promise.all(postTabCoinsPromises);

      const postTabCoinsResponsesBody = postTabCoinsResponses.map(({ responseBody }) => responseBody);

      const postTabCoinsResponsesStatus = postTabCoinsResponses.map(({ response }) => response.status);

      const successPostIndex1 = postTabCoinsResponsesStatus.indexOf(201);
      const successPostIndex2 = postTabCoinsResponsesStatus.indexOf(201, successPostIndex1 + 1);

      expect(successPostIndex1).not.toBe(-1);
      expect(successPostIndex2).toBe(-1);
      expect(postTabCoinsResponsesStatus[successPostIndex1]).toBe(201);

      expect(postTabCoinsResponsesBody[successPostIndex1]).toStrictEqual({
        tabcoins: 1,
        tabcoins_credit: 1,
        tabcoins_debit: 0,
      });

      postTabCoinsResponsesStatus.splice(successPostIndex1, 1);
      postTabCoinsResponsesBody.splice(successPostIndex1, 1);

      postTabCoinsResponsesStatus.forEach((status) => expect.soft(status).toBe(422));

      expect(postTabCoinsResponsesBody).toContainEqual({
        name: 'UnprocessableEntityError',
        message: 'Não foi possível adicionar TabCoins nesta publicação.',
        action: 'Você precisa de pelo menos 2 TabCoins para realizar esta ação.',
        status_code: 422,
        error_id: postTabCoinsResponsesBody[timesToFetch - 2].error_id,
        request_id: postTabCoinsResponsesBody[timesToFetch - 2].request_id,
        error_location_code: 'MODEL:BALANCE:RATE_CONTENT:NOT_ENOUGH',
      });

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(1);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(0);
      expect(secondUserResponseBody.tabcash).toBe(1);
    });

    // This tests are being temporarily skipped because of the new feature of not allowing
    // to credit/debit four times the same content. This feature is just a temporary test
    // to a more sophisticated feature that will be implemented in the future.

    // eslint-disable-next-line vitest/no-disabled-tests
    test.skip('With 100 simultaneous posts, but enough TabCoins for 6', async () => {
      const timesToFetch = 100;
      const timesSuccessfully = 6;

      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2 * timesSuccessfully,
      });

      const postTabCoinsPromises = Array(timesToFetch)
        .fill()
        .map(() => tabcoinsRequestBuilder.post({ transaction_type: 'credit' }));

      const postTabCoinsResponses = await Promise.all(postTabCoinsPromises);

      const postTabCoinsResponsesBody = postTabCoinsResponses.map(({ responseBody }) => responseBody);

      const postTabCoinsResponsesStatus = postTabCoinsResponses.map(({ response }) => response.status);

      const successPostIndexes = [postTabCoinsResponsesStatus.indexOf(201)];

      for (let i = 0; i < timesSuccessfully; i++) {
        successPostIndexes.push(postTabCoinsResponsesStatus.indexOf(201, successPostIndexes[i] + 1));
        expect(successPostIndexes[i]).not.toBe(-1);
        expect(postTabCoinsResponsesStatus[successPostIndexes[i]]).toBe(201);
        expect(postTabCoinsResponsesBody).toContainEqual({
          tabcoins: 2 + i,
        });
      }

      expect(successPostIndexes[timesSuccessfully]).toBe(-1);

      successPostIndexes.splice(-1, 1);
      successPostIndexes.reverse();

      successPostIndexes.forEach((idx) => {
        postTabCoinsResponsesStatus.splice(idx, 1);
        postTabCoinsResponsesBody.splice(idx, 1);
      });

      postTabCoinsResponsesStatus.forEach((status) => expect.soft(status).toBe(422));

      postTabCoinsResponsesBody.forEach((responseBody) =>
        expect(responseBody).toStrictEqual({
          name: 'UnprocessableEntityError',
          message: 'Não foi possível adicionar TabCoins nesta publicação.',
          action: 'Você precisa de pelo menos 2 TabCoins para realizar esta ação.',
          status_code: 422,
          error_id: responseBody.error_id,
          request_id: responseBody.request_id,
          error_location_code: 'MODEL:BALANCE:RATE_CONTENT:NOT_ENOUGH',
        }),
      );

      const usersRequestBuilder = new RequestBuilder('/api/v1/users');
      const { responseBody: firstUserResponseBody } = await usersRequestBuilder.get(`/${firstUser.username}`);

      expect(firstUserResponseBody.tabcoins).toBe(2 + timesSuccessfully);
      expect(firstUserResponseBody.tabcash).toBe(0);

      const { responseBody: secondUserResponseBody } = await usersRequestBuilder.get(`/${secondUser.username}`);

      expect(secondUserResponseBody.tabcoins).toBe(0);
      expect(secondUserResponseBody.tabcash).toBe(timesSuccessfully);
    });

    // eslint-disable-next-line vitest/no-disabled-tests
    test.skip('With 100 simultaneous posts, enough TabCoins for 90, no db resources, but only responses 201 or 422', async () => {
      const timesToFetch = 100;
      const timesSuccessfully = 90;

      const firstUser = await orchestrator.createUser();
      const firstUserContent = await orchestrator.createContent({
        owner_id: firstUser.id,
        title: 'Root',
        body: 'Body',
        status: 'published',
      });

      const tabcoinsRequestBuilder = new RequestBuilder(
        `/api/v1/contents/${firstUser.username}/${firstUserContent.slug}/tabcoins`,
      );
      const secondUser = await tabcoinsRequestBuilder.buildUser();

      await orchestrator.createBalance({
        balanceType: 'user:tabcoin',
        recipientId: secondUser.id,
        amount: 2 * timesSuccessfully,
      });

      const postTabCoinsPromises = Array(timesToFetch)
        .fill()
        .map(() => tabcoinsRequestBuilder.post({ transaction_type: 'credit' }));

      const postTabCoinsResponses = await Promise.all(postTabCoinsPromises);

      const postTabCoinsResponsesBody = postTabCoinsResponses.map(({ responseBody }) => responseBody);

      const postTabCoinsResponsesStatus = postTabCoinsResponses.map(({ response }) => response.status);

      expect([201, 422]).toStrictEqual(expect.arrayContaining(postTabCoinsResponsesStatus));

      expect(postTabCoinsResponsesBody).toContainEqual(
        expect.objectContaining({
          name: 'UnprocessableEntityError',
          message: 'Muitos votos ao mesmo tempo.',
          action: 'Tente realizar esta operação mais tarde.',
          status_code: 422,
          error_location_code: 'CONTROLLER:CONTENT:TABCOINS:SERIALIZATION_FAILURE',
        }),
      );
    });
  });
});
