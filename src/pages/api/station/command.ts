export const prerender = false;

import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { connectAsync, type MqttClient } from 'mqtt';
import { isOwner } from '../../../lib/routine-auth';
import { checkCommand } from '../../../lib/station/commands';
import { TOPICS } from '../../../lib/station/protocol';

/**
 * Commandes de la station depuis la vue propriétaire de /routine (étape 5 de routine-station).
 *
 * Contrôles, dans l'ordre, avant de rien publier : session (401), origine (403), JSON (415),
 * taille (413), commande permise et valeurs dans les bornes (400). Puis publication MQTT sur TLS
 * avec l'utilisateur `web-command`, qui ne peut que publier sur routine/station/commands, en QoS 1 :
 * on attend l'accusé du broker, puis on se déconnecte. La réponse de la station arrive à la page
 * par le topic replies (abonnement de web-viewer), retrouvée par l'id créé ici.
 *
 * Variables, côté serveur seulement : STATION_MQTT_URL (mqtts://<adresse>:8883),
 * STATION_COMMAND_USERNAME, STATION_COMMAND_PASSWORD.
 */
const BROKER_URL = import.meta.env.STATION_MQTT_URL;
const USERNAME = import.meta.env.STATION_COMMAND_USERNAME;
const PASSWORD = import.meta.env.STATION_COMMAND_PASSWORD;

const MAX_BODY_BYTES = 1024;
// Une fonction Vercel ne doit pas rester bloquée sur un broker injoignable (limite : 10 s). EMQX
// Serverless confirme d'ordinaire la connexion en moins d'une seconde, mais parfois en plus de 5 s.
const CONNECT_TIMEOUT_MS = 7000;
const TOTAL_TIMEOUT_MS = 9000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

class Timeout extends Error {}
const within = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Timeout()), ms))]);

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!isOwner(cookies)) return json({ error: 'session' }, 401);

  // Le contrôle d'origine d'Astro ne couvre que les formulaires : une requête JSON doit venir du site
  const allowed = new Set([url.origin, new URL(import.meta.env.SITE).origin]);
  if (!allowed.has(request.headers.get('origin') ?? '')) return json({ error: 'origin' }, 403);

  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return json({ error: 'content_type' }, 415);
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'too_long' }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ error: 'too_long' }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const check = checkCommand(body);
  if (!check.ok) return json({ error: check.error }, 400);

  if (!BROKER_URL || !USERNAME || !PASSWORD) {
    console.error('Station : STATION_MQTT_URL, STATION_COMMAND_USERNAME ou STATION_COMMAND_PASSWORD manquant.');
    return json({ error: 'unconfigured' }, 503);
  }

  // L'id vient du serveur : 16 caractères aléatoires (la station en accepte jusqu'à 32)
  const id = randomBytes(12).toString('base64url');
  const message = JSON.stringify({ id, ...check.command });
  const started = Date.now();
  let client: MqttClient | undefined;
  try {
    client = await within(
      connectAsync(BROKER_URL, {
        username: USERNAME,
        password: PASSWORD,
        clientId: `web-command-${randomBytes(6).toString('hex')}`,
        clean: true,
        connectTimeout: CONNECT_TIMEOUT_MS,
        reconnectPeriod: 0, // un seul essai : la page affichera l'échec
        // Certificat du broker toujours vérifié (DigiCert Global Root G2, connu de Node)
        rejectUnauthorized: true,
      }),
      CONNECT_TIMEOUT_MS + 500,
    );
    await within(client.publishAsync(TOPICS.commands, message, { qos: 1 }), TOTAL_TIMEOUT_MS - (Date.now() - started));
    return json({ id }, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Station : publication impossible,', message);
    // Délai dépassé (le nôtre, ou « connack timeout » de mqtt.js) : 504 ; broker injoignable : 502
    if (err instanceof Timeout || /timeout/i.test(message)) return json({ error: 'timeout' }, 504);
    return json({ error: 'broker' }, 502);
  } finally {
    client?.end(true);
  }
};

// Seul POST est permis
export const ALL: APIRoute = () => json({ error: 'method' }, 405);
