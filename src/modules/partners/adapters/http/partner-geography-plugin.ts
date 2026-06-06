/**
 * Plugin HTTP do recurso Parceria Territorial (US-002 — geography).
 *
 * Expõe as rotas de parceria de UF e município sob `/partner-states` e
 * `/partner-municipalities`; o root registra sob `/api/v1`.
 * Permissões: `geography:read` (leitura) e `geography:write` (escrita/toggle).
 *
 * Rotas:
 *   GET    /partner-states                  → lista 27 UFs com flag isPartner
 *   POST   /partner-states/:uf              → ativa parceria (idempotente)
 *   DELETE /partner-states/:uf              → desativa parceria (idempotente); UF inválida → 400
 *   GET    /partner-municipalities?uf=      → lista municípios da UF com flag isPartner
 *   POST   /partner-municipalities/:ibgeCode → ativa parceria do município (idempotente)
 *   DELETE /partner-municipalities/:ibgeCode → desativa parceria; código inválido → 400
 *
 * Sem auth → 401. Sem permissão → 403. UF/ibgeCode inválido (catálogo) → 400.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';
import type { FastifyReply } from 'fastify';

import type { PartnersHttpDeps } from './composition.ts';
import {
  ufParamSchema,
  ibgeCodeParamSchema,
  partnerMunicipalitiesQuerySchema,
  partnerStatesListSchema,
  partnerMunicipalitiesListSchema,
  partnerStateDtoSchema,
  partnerMunicipalityDtoSchema,
  type PartnerStateDto,
  type PartnerMunicipalityDto,
} from './partner-geography-schemas.ts';
import * as Municipality from '../../domain/geography/municipality.ts';
import { GEOGRAPHY_PERMISSION } from '../../public-api/permissions.ts';

export type PartnerGeographyHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// UF inválida (catálogo) → 400; repo indisponível → 503; demais são 422.
const GEO_STATE_WRITE_STATUS: Readonly<Record<string, number>> = {
  'invalid-state': 400,
  'geography-repo-unavailable': 503,
};

const GEO_MUN_WRITE_STATUS: Readonly<Record<string, number>> = {
  'invalid-ibge-code': 400,
  'geography-repo-unavailable': 503,
};

const geoWriteStatus = (code: string, map: Readonly<Record<string, number>>): number =>
  map[code] ?? 422;

// Erro de escrita no envelope canônico { error: { code, message, requestId } } (FR-007).
const sendGeoWriteError = (
  reply: FastifyReply,
  code: string,
  map: Readonly<Record<string, number>>,
): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(geoWriteStatus(code, map))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

// Enriquece a view do toggle de município com o `name` do catálogo (read-only). O ibgeCode já foi
// validado pelo use-case; se não constar (não deveria), name vazio.
const municipalityToggleDto = (view: {
  ibgeCode: string;
  uf: string;
  isPartner: boolean;
}): PartnerMunicipalityDto => {
  const found = Municipality.findMunicipalityByCod(view.ibgeCode);
  return {
    ibgeCode: view.ibgeCode,
    uf: view.uf,
    name: found.ok ? found.value.name : '',
    isPartner: view.isPartner,
  };
};

const partnerGeographyRoutes =
  (deps: PartnersHttpDeps, hooks: PartnerGeographyHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // ── States ────────────────────────────────────────────────────────────────

    // GET /partner-states — lista as 27 UFs com flag isPartner
    scope.route({
      method: 'GET',
      url: '/partner-states',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.read)],
      schema: {
        response: { 200: partnerStatesListSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listPartnerStates();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'geography-repo-unavailable': 503 },
          });
        }
        const dto: PartnerStateDto[] = result.value.map((s) => ({
          uf: s.uf as unknown as string,
          isPartner: s.isPartner,
        }));
        return sendResult(reply, ok(dto), { ok: 200 });
      },
    });

    // POST /partner-states/:uf — ativa parceria (idempotente)
    scope.route({
      method: 'POST',
      url: '/partner-states/:uf',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.write)],
      schema: {
        params: ufParamSchema,
        response: { 200: partnerStateDtoSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.togglePartnerState({ rawUf: req.params.uf, action: 'activate' });
        if (!result.ok) return sendGeoWriteError(reply, result.error, GEO_STATE_WRITE_STATUS);
        const dto: PartnerStateDto = {
          uf: result.value.uf as unknown as string,
          isPartner: result.value.isPartner,
        };
        return sendResult(reply, ok(dto), { ok: 200 });
      },
    });

    // DELETE /partner-states/:uf — desativa parceria (idempotente); UF inválida → 400
    scope.route({
      method: 'DELETE',
      url: '/partner-states/:uf',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.write)],
      schema: {
        params: ufParamSchema,
        response: { 200: partnerStateDtoSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.togglePartnerState({
          rawUf: req.params.uf,
          action: 'deactivate',
        });
        if (!result.ok) return sendGeoWriteError(reply, result.error, GEO_STATE_WRITE_STATUS);
        const dto: PartnerStateDto = {
          uf: result.value.uf as unknown as string,
          isPartner: result.value.isPartner,
        };
        return sendResult(reply, ok(dto), { ok: 200 });
      },
    });

    // ── Municipalities ────────────────────────────────────────────────────────

    // GET /partner-municipalities?uf= — lista municípios da UF com flag isPartner
    scope.route({
      method: 'GET',
      url: '/partner-municipalities',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.read)],
      schema: {
        querystring: partnerMunicipalitiesQuerySchema,
        response: { 200: partnerMunicipalitiesListSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listPartnerMunicipalities(req.query.uf);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: {
              'geography-repo-unavailable': 503,
              'invalid-state': 400,
            },
          });
        }
        const dto: PartnerMunicipalityDto[] = result.value.map((m) => ({
          ibgeCode: m.ibgeCode as unknown as string,
          uf: m.uf as unknown as string,
          name: m.name,
          isPartner: m.isPartner,
        }));
        return sendResult(reply, ok(dto), { ok: 200 });
      },
    });

    // POST /partner-municipalities/:ibgeCode — ativa parceria (idempotente)
    scope.route({
      method: 'POST',
      url: '/partner-municipalities/:ibgeCode',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.write)],
      schema: {
        params: ibgeCodeParamSchema,
        response: { 200: partnerMunicipalityDtoSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.togglePartnerMunicipality({
          rawIbgeCode: req.params.ibgeCode,
          action: 'activate',
        });
        if (!result.ok) return sendGeoWriteError(reply, result.error, GEO_MUN_WRITE_STATUS);
        return sendResult(
          reply,
          ok(
            municipalityToggleDto({
              ibgeCode: result.value.ibgeCode as unknown as string,
              uf: result.value.uf as unknown as string,
              isPartner: result.value.isPartner,
            }),
          ),
          { ok: 200 },
        );
      },
    });

    // DELETE /partner-municipalities/:ibgeCode — desativa parceria; código inválido → 400
    scope.route({
      method: 'DELETE',
      url: '/partner-municipalities/:ibgeCode',
      preHandler: [hooks.requireAuth, hooks.authorize(GEOGRAPHY_PERMISSION.write)],
      schema: {
        params: ibgeCodeParamSchema,
        response: { 200: partnerMunicipalityDtoSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.togglePartnerMunicipality({
          rawIbgeCode: req.params.ibgeCode,
          action: 'deactivate',
        });
        if (!result.ok) return sendGeoWriteError(reply, result.error, GEO_MUN_WRITE_STATUS);
        return sendResult(
          reply,
          ok(
            municipalityToggleDto({
              ibgeCode: result.value.ibgeCode as unknown as string,
              uf: result.value.uf as unknown as string,
              isPartner: result.value.isPartner,
            }),
          ),
          { ok: 200 },
        );
      },
    });
  };

export const partnerGeographyHttpPlugin =
  (deps: PartnersHttpDeps, hooks: PartnerGeographyHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(partnerGeographyRoutes(deps, hooks));
  };
