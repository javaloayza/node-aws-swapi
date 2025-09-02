/**
 * 🌐 HTTP Client Configuration
 * - Development SSL bypass
 * - Production security
 */

import axios from 'axios';
import https from 'https';

// Create axios instance with proper SSL handling
const createHttpClient = () => {
  // AWS Lambda environment detection
  const isAWS = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_REGION;
  
  return axios.create({
    timeout: 10000,
    // Only disable SSL for local development (not AWS)
    ...(!isAWS && {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    }),
    headers: {
      'User-Agent': 'Stefanini-Rimac-Challenge/1.0'
    }
  });
};

export const httpClient = createHttpClient();