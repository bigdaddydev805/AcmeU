import type { Request, Response } from 'express';
import { graphql } from 'graphql';
import { config } from '../config';
import { schema } from './schema';
import { buildRoot } from './resolvers';

interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

function extractRequests(req: Request): GraphQLRequest[] {
  if (req.method === 'GET') {
    const q = req.query.query;
    if (typeof q !== 'string') return [];
    let variables: Record<string, unknown> | undefined;
    if (typeof req.query.variables === 'string') {
      try {
        variables = JSON.parse(req.query.variables);
      } catch {
        variables = undefined;
      }
    }
    return [
      {
        query: q,
        variables,
        operationName:
          typeof req.query.operationName === 'string' ? req.query.operationName : undefined,
      },
    ];
  }

  const body = req.body;
  if (Array.isArray(body)) {
    return body
      .filter((entry) => entry && typeof entry.query === 'string')
      .map((entry) => ({
        query: entry.query,
        variables: entry.variables,
        operationName: entry.operationName,
      }));
  }

  if (body && typeof body.query === 'string') {
    let variables = body.variables;
    if (typeof variables === 'string') {
      try {
        variables = JSON.parse(variables);
      } catch {
        variables = undefined;
      }
    }
    return [{ query: body.query, variables, operationName: body.operationName }];
  }

  return [];
}

export async function graphqlHandler(req: Request, res: Response): Promise<void> {
  const requests = extractRequests(req);

  if (!requests.length) {
    res.status(400).json({
      errors: [{ message: 'a GraphQL query is required' }],
    });
    return;
  }

  const ctx = {
    req,
    actorId: req.actor?.id,
    tenantId: req.actor?.tenantId,
  };
  const rootValue = buildRoot(ctx);

  const results = await Promise.all(
    requests.map((request) =>
      graphql({
        schema,
        source: request.query,
        rootValue,
        contextValue: ctx,
        variableValues: request.variables,
        operationName: request.operationName,
      }),
    ),
  );

  const payload = Array.isArray(req.body) ? results : results[0];

  const hasErrors = results.some((r) => r.errors?.length);
  res.status(hasErrors && !results.some((r) => r.data) ? 400 : 200).json(payload);
}

export const introspectionEnabled = config.features.graphqlIntrospection;
