// Vercel serverless function: receive feedback and send email via Resend
// Set RESEND_API_KEY in Vercel project settings. Destination email is fixed.

import { Resend } from 'resend';
import { createServerLogger } from './logger.js';

const resendApiKey = process.env.RESEND_API_KEY;
const TO_EMAIL = 'alexalmansa5@gmail.com';
// Use Resend's default domain to avoid domain verification issues
const FROM_EMAIL = 'TrailReplay Feedback <onboarding@resend.dev>';
const API_VERSION = 'v1';
const logger = createServerLogger('contact-api');

/** Basic IP rate-limit in-memory (best-effort within a single instance) */
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQ_PER_WINDOW = 5;

function isRateLimited(ip) {
    const now = Date.now();
    const data = rateLimitMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
    if (now > data.resetAt) {
        data.count = 0;
        data.resetAt = now + WINDOW_MS;
    }
    data.count += 1;
    rateLimitMap.set(ip, data);
    return data.count > MAX_REQ_PER_WINDOW;
}

function json(res, status, payload) {
    res.setHeader('X-TrailReplay-API-Version', API_VERSION);
    return res.status(status).json({
        version: API_VERSION,
        ...payload,
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        logger.warn('Rejected non-POST request', { method: req.method });
        return json(res, 405, { error: 'Method not allowed' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();
    if (isRateLimited(ip)) {
        logger.warn('Rate limit triggered', { ip });
        return json(res, 429, { error: 'Too many requests. Please try again later.' });
    }

    const { name = '', email = '', message = '', website = '', meta = {} } = req.body || {};

    // Honeypot
    if (website) {
        logger.warn('Honeypot field populated, ignoring submission', { ip });
        return json(res, 200, { ok: true });
    }

    // Validation
    const trimmedMessage = (message || '').trim();
    if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 5000) {
        logger.warn('Rejected invalid feedback payload', {
            ip,
            messageLength: trimmedMessage.length,
        });
        return json(res, 400, { error: 'Invalid message' });
    }
    const safeName = (name || '').toString().slice(0, 200);
    const safeEmail = (email || '').toString().slice(0, 200);

    try {
        if (!resendApiKey) {
            throw new Error('Missing RESEND_API_KEY');
        }
        logger.info('Sending feedback email', {
            ip,
            hasReplyTo: Boolean(safeEmail),
            path: meta?.path || '/',
        });
        const resend = new Resend(resendApiKey);
        const subject = `New TrailReplay feedback from ${safeName || 'Anonymous'}`;
        const text = [
            `Name: ${safeName || 'Anonymous'}`,
            `Email: ${safeEmail || 'N/A'}`,
            `Path: ${meta?.path || '/'}; UA: ${(meta?.ua || '').slice(0, 300)}`,
            '',
            trimmedMessage
        ].join('\n');

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: TO_EMAIL,
            reply_to: safeEmail || undefined,
            subject,
            text
        });

        if (error) {
            // Try to surface meaningful provider error
            const errorMessage = (
                error?.message ||
                error?.name ||
                error?.response?.data?.message ||
                error?.error?.message ||
                error?.body?.message ||
                (typeof error === 'string' ? error : null) ||
                'Email provider error'
            );
            logger.error('Resend send error', { error });
            return json(res, 502, { error: errorMessage });
        }
        logger.info('Feedback email sent', { id: data?.id, ip });
        return json(res, 200, { ok: true, id: data?.id });
    } catch (err) {
        logger.error('Feedback send error', { error: err, ip });
        return json(res, 500, { error: 'Failed to send' });
    }
}
