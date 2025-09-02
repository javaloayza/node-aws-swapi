/**
 * 📚 API Documentation Handler
 * Serves Swagger UI for interactive API documentation
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createResponse } from '../utils/response';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const logger = new Logger({ 
  requestId: 'docs-handler',
  functionName: 'docs' 
});

/**
 * 📖 Serve API documentation
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  const startTime = Date.now();
  const host = event.headers.Host || 'localhost:3030';
  const stage = event.requestContext.stage || 'dev';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  try {
    logger.info('Serving API documentation', { 
      requestId, 
      path: event.path,
      userAgent: event.headers['User-Agent']
    });

    const pathParam = event.pathParameters?.proxy || '';
    
    // Serve Swagger JSON (inline specification)
    if (pathParam === 'swagger.json' || pathParam === 'openapi.json') {
      const swaggerSpec = {
        openapi: "3.0.3",
        info: {
          title: "Stefanini Rimac Challenge API",
          description: "RESTful API que fusiona datos de Star Wars API (SWAPI) con información meteorológica.",
          version: "1.0.0",
          contact: {
            name: "Aldo Loayza",
            email: "aldo.loayza@example.com"
          },
          license: {
            name: "MIT"
          }
        },
        servers: [
          {
            url: `${protocol}://${host}${stage === 'dev' ? '/dev' : `/${stage}`}`,
            description: "AWS Production"
          }
        ],
        paths: {
          "/fusion": {
            get: {
              tags: ["Fusion"],
              summary: "Obtener datos fusionados de personaje y clima",
              description: "Combina información de un personaje de Star Wars con datos meteorológicos actuales de su planeta natal.",
              parameters: [
                {
                  name: "character",
                  in: "query",
                  description: "ID del personaje de Star Wars (1-83)",
                  required: false,
                  schema: {
                    type: "string",
                    pattern: "^[1-9][0-9]*$",
                    example: "1"
                  }
                }
              ],
              responses: {
                "200": {
                  description: "Datos fusionados obtenidos exitosamente",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          success: { type: "boolean", example: true },
                          data: { type: "object" },
                          meta: { type: "object" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "/store": {
            post: {
              tags: ["Storage"],
              summary: "Almacenar datos personalizados",
              description: "Permite guardar cualquier tipo de datos personalizados del usuario en el sistema.",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["data"],
                      properties: {
                        data: {
                          type: "object",
                          description: "Cualquier estructura de datos JSON"
                        },
                        metadata: {
                          type: "object",
                          description: "Metadata adicional opcional"
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                "201": {
                  description: "Datos almacenados exitosamente"
                }
              }
            }
          },
          "/history": {
            get: {
              tags: ["History"],
              summary: "Consultar historial de datos",
              description: "Retorna el historial completo de datos almacenados con soporte para filtrado y paginación.",
              parameters: [
                {
                  name: "source",
                  in: "query",
                  description: "Filtrar por tipo de origen de datos",
                  required: false,
                  schema: {
                    type: "string",
                    enum: ["fusion", "custom", "all"],
                    default: "all"
                  }
                },
                {
                  name: "limit",
                  in: "query",
                  description: "Número máximo de elementos a retornar",
                  required: false,
                  schema: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 10
                  }
                }
              ],
              responses: {
                "200": {
                  description: "Historial obtenido exitosamente"
                }
              }
            }
          }
        },
        tags: [
          { name: "Fusion", description: "Operaciones de fusión de datos Star Wars + Meteorológicos" },
          { name: "Storage", description: "Almacenamiento de datos personalizados" },
          { name: "History", description: "Consulta de historial y datos almacenados" }
        ]
      };
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=3600'
        },
        body: JSON.stringify(swaggerSpec, null, 2)
      };
    }

    // Serve Swagger UI HTML
    const swaggerUI = generateSwaggerUI(host, stage, protocol);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body: swaggerUI
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to serve documentation', error, {
      requestId,
      duration,
      path: event.path
    });

    return createResponse(500, {
      success: false,
      error: {
        message: 'Failed to load API documentation',
        code: 'DOCS_ERROR',
        status: 500
      }
    });
  }
};

/**
 * 🎨 Generate Swagger UI HTML
 */
function generateSwaggerUI(host: string, stage: string, protocol: string): string {
  const baseUrl = `${protocol}://${host}${stage === 'dev' ? '/dev' : `/${stage}`}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stefanini Rimac Challenge - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.10.3/favicon-32x32.png" sizes="32x32" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
      .swagger-ui .topbar { background-color: #1976d2; }
      .swagger-ui .topbar .download-url-wrapper .select-label { color: #fff; }
      .swagger-ui .info .title { color: #1976d2; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${baseUrl}/docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('Swagger UI loaded successfully');
        },
        onFailure: function(error) {
          console.error('Failed to load Swagger UI:', error);
        }
      });
    };
    </script>
</body>
</html>`;
}