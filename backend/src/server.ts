import fs from 'fs';
import path from 'path';
import * as soap from 'soap';
import app from './app';
import { config } from './config/env';
import { agriflowSoapService } from './soap-service';
import { extractWsSecurityHeader } from './services/ws-security';
import { errorHandler } from './common/middleware/error.middleware';

// Path WSDL
const wsdlPath = path.join(__dirname, 'wsdl', 'agriflow.wsdl');
const wsdlXml = fs.readFileSync(wsdlPath, 'utf8');

// Raw WSDL XML route for easy viewing & tooling
app.get('/soap/agriflow.wsdl', (_req, res) => {
  res.header('Content-Type', 'text/xml');
  res.send(wsdlXml);
});

/**
 * Middleware khusus untuk endpoint SOAP:
 * Menangkap raw XML request body dan menyuntikkan WS-Security header
 * ke dalam args agar soap-service.ts dapat memvalidasinya.
 */
app.use('/soap/agriflow', (req, res, next) => {
  // Always allow CORS preflight & headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, SOAPAction, Authorization, X-Requested-With, wsse, Accept');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  if (req.method !== 'POST') return next();

  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    const securityHeaderXml = extractWsSecurityHeader(rawBody);
    if (securityHeaderXml) {
      (res as any).wsSecurityHeaderXml = securityHeaderXml;
      (req as any).wsSecurityHeaderXml = securityHeaderXml;
    }
    (req as any).rawSoapBody = rawBody;
    (req as any).body = Buffer.from(rawBody, 'utf8');
    next();
  });
});

// Global error handler
app.use(errorHandler);

const server = app.listen(config.port, () => {
  // Inisialisasi SOAP Listener
  soap.listen(app, '/soap/agriflow', agriflowSoapService, wsdlXml, () => {
    console.log(`\n======================================================`);
    console.log(`🌾 AgriFlow 2 - Hybrid REST & SOAP Web Service RUNNING!`);
    console.log(`🚀 REST API Base : http://localhost:${config.port}/api`);
    console.log(`📡 SOAP Endpoint : http://localhost:${config.port}/soap/agriflow`);
    console.log(`📄 WSDL Contract : http://localhost:${config.port}/soap/agriflow?wsdl`);
    console.log(`🔐 WS-Security   : HMAC-SHA256 Signed SOAP (Khusus Operasi Admin PEMERINTAH)`);
    console.log(`🔓 Unsigned SOAP : Operasi Baca / Monitoring PEMERINTAH`);
    console.log(`📚 Swagger Docs  : http://localhost:${config.port}/api-docs`);
    console.log(`======================================================\n`);
  });
});

export default server;
