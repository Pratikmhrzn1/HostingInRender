import swaggerJSDoc from 'swagger-jsdoc';
import { koaSwagger } from 'koa2-swagger-ui';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Game Platform Backend API',
    version: '1.0.0',
    description: 'Real-money multi-game platform backend API',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
          },
          statusCode: {
            type: 'integer',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication endpoints',
    },
    {
      name: 'Wallet',
      description: 'Wallet management endpoints',
    },
    {
      name: 'Games',
      description: 'Game related endpoints',
    },
    {
      name: 'Admin',
      description: 'Admin endpoints',
    },
    {
      name: 'Status',
      description: 'Status endpoints',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/features/**/*.routes.ts', './src/features/**/*.controller.ts'], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(options);

export { koaSwagger, swaggerSpec };