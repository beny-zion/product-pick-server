import axios from 'axios';
import { env } from '../../config/environment.js';
import crypto from 'crypto';

/**
 * HYP Payment Service
 * אינטגרציה עם HYP לתשלומים ותשלומים חוזרים
 */

const hypConfig = env.HYP;

/**
 * Build XML request for HYP API (doDeal command)
 */
function buildXmlRequest(params) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ashrait>
  <request>
    <version>2000</version>
    <language>HE</language>
    <command>doDeal</command>
    <doDeal>
      <terminalNumber>${hypConfig.TERMINAL_NUMBER}</terminalNumber>
      <cardNo>${params.cardNo || 'CGMPI'}</cardNo>
      ${params.cardId ? `<cardId>${params.cardId}</cardId>` : ''}
      ${params.cardExpiration ? `<cardExpiration>${params.cardExpiration}</cardExpiration>` : ''}
      <total>${params.total}</total>
      <transactionType>Debit</transactionType>
      <creditType>RegularCredit</creditType>
      <currency>${params.currency || '1'}</currency>
      <transactionCode>Internet</transactionCode>
      <validation>${params.validation || 'AutoComm'}</validation>
      <mid>${hypConfig.MID}</mid>
      ${params.uniqueId ? `<uniqueid>${params.uniqueId}</uniqueid>` : ''}
      ${params.successUrl ? `<successUrl>${params.successUrl}</successUrl>` : ''}
      ${params.errorUrl ? `<errorUrl>${params.errorUrl}</errorUrl>` : ''}
      ${params.cancelUrl ? `<cancelUrl>${params.cancelUrl}</cancelUrl>` : ''}
      ${params.mpiValidation ? `<mpiValidation>${params.mpiValidation}</mpiValidation>` : ''}
      ${params.description ? `<description>${params.description}</description>` : ''}
    </doDeal>
  </request>
</ashrait>`;
}

/**
 * Parse HYP XML response to JSON
 */
function parseXmlResponse(xmlString) {
  const getTag = (xml, tag) => {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1] : null;
  };

  return {
    status: getTag(xmlString, 'status'),
    statusText: getTag(xmlString, 'statusText'),
    result: getTag(xmlString, 'result'),
    cgUid: getTag(xmlString, 'cgUid'),
    txId: getTag(xmlString, 'txId'),
    cardToken: getTag(xmlString, 'cardToken'),
    cardMask: getTag(xmlString, 'cardMask'),
    cardExp: getTag(xmlString, 'cardExp'),
    authNumber: getTag(xmlString, 'authNumber'),
    mpiHostedPageUrl: getTag(xmlString, 'mpiHostedPageUrl'),
  };
}

/**
 * Generate unique transaction ID
 */
function generateUniqueId() {
  return `BW_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Create HYP payment page for initial subscription payment
 * Returns the hosted payment page URL
 */
export async function createPaymentPage({ amount, currency = 'ILS', plan, userId }) {
  const uniqueId = generateUniqueId();

  // Currency codes: 1=ILS, 2=USD, 3=EUR
  const currencyCode = currency === 'USD' ? '2' : currency === 'EUR' ? '3' : '1';

  // Amount in agorot (subunits) — HYP expects whole number
  const total = Math.round(amount * 100);

  const callbackBase = env.SERVER_URL;
  const successUrl = `${callbackBase}/subscription/payment/success?uniqueId=${uniqueId}&userId=${userId}&plan=${plan}`;
  const errorUrl = `${callbackBase}/subscription/payment/error?uniqueId=${uniqueId}&userId=${userId}&plan=${plan}`;
  const cancelUrl = `${callbackBase}/subscription/payment/cancel?uniqueId=${uniqueId}`;

  const xml = buildXmlRequest({
    total,
    currency: currencyCode,
    validation: 'TxnSetup',
    mpiValidation: 'AutoComm',
    uniqueId,
    successUrl,
    errorUrl,
    cancelUrl,
    description: `BuyWise - ${plan}`,
  });

  try {
    const response = await axios.post(hypConfig.API_URL, `int_in=${encodeURIComponent(xml)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const parsed = parseXmlResponse(response.data);

    if (parsed.status !== '000' || !parsed.mpiHostedPageUrl) {
      console.error('HYP createPaymentPage failed:', parsed);
      throw new Error(parsed.statusText || 'Failed to create payment page');
    }

    return {
      paymentUrl: parsed.mpiHostedPageUrl,
      uniqueId,
      cgUid: parsed.cgUid,
    };
  } catch (error) {
    console.error('HYP createPaymentPage error:', error.message);
    throw error;
  }
}

/**
 * Charge a saved card token for recurring payment
 */
export async function chargeRecurring({ cardToken, cardExp, amount, currency = 'ILS', description }) {
  const currencyCode = currency === 'USD' ? '2' : currency === 'EUR' ? '3' : '1';
  const total = Math.round(amount * 100);
  const uniqueId = generateUniqueId();

  const xml = buildXmlRequest({
    cardNo: 'CGMPI',
    cardId: cardToken,
    cardExpiration: cardExp,
    total,
    currency: currencyCode,
    validation: 'AutoComm',
    uniqueId,
    description: description || 'BuyWise - חידוש מנוי',
  });

  try {
    const response = await axios.post(hypConfig.API_URL, `int_in=${encodeURIComponent(xml)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const parsed = parseXmlResponse(response.data);

    return {
      success: parsed.status === '000',
      transactionId: parsed.cgUid || parsed.txId,
      authNumber: parsed.authNumber,
      status: parsed.status,
      statusText: parsed.statusText,
      raw: parsed,
    };
  } catch (error) {
    console.error('HYP chargeRecurring error:', error.message);
    return {
      success: false,
      error: error.message,
      status: 'ERROR',
      statusText: error.message,
    };
  }
}
