/* Contrat avec la station routine-station : topics MQTT et format des messages, en miroir de
 * docs/protocol.md du dépôt routine-station (c'est ce fichier-là qui fait foi). Chaque message reçu
 * est validé ici ; un message invalide est ignoré (null), jamais affiché. */

export const TOPICS = {
  measurements: 'routine/station/measurements',
  events: 'routine/station/events',
  status: 'routine/station/status',
  replies: 'routine/station/replies',
} as const;

export type AlarmState = 'off' | 'on' | 'silenced' | 'test';
export type MotorState = 'stopped' | 'forward' | 'backward' | 'locked';

/** routine/station/measurements, toutes les 5 s, retenu */
export interface Measurement {
  /** Heure de la mesure (ISO 8601 UTC), null tant que la station n'a pas l'heure (NTP) */
  time: string | null;
  uptime_s: number;
  temperature_c: number;
  light_pct: number;
  alarm: AlarmState;
  motor: MotorState;
  rssi_dbm: number;
}

/** routine/station/events, non retenu */
export type StationEvent =
  | { time: string | null; type: 'alarm_raised'; cause: 'touch'; reaction_us: number }
  | { time: string | null; type: 'alarm_cleared' };

/** routine/station/status, retenu ; { online: false } est le testament publié par le broker */
export interface Status {
  online: boolean;
}

/** routine/station/replies : réponse à une commande (utile à l'étape 5) */
export interface Reply {
  id: string | null;
  ok: boolean;
  error?: string;
}

export type StationMessage =
  | { kind: 'measurement'; data: Measurement }
  | { kind: 'event'; data: StationEvent }
  | { kind: 'status'; data: Status }
  | { kind: 'reply'; data: Reply };

const ALARM_STATES: readonly string[] = ['off', 'on', 'silenced', 'test'];
const MOTOR_STATES: readonly string[] = ['stopped', 'forward', 'backward', 'locked'];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
// Heure ISO lisible, ou null (horloge pas encore synchronisée)
const isTime = (v: unknown): v is string | null => v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)));

function parseMeasurement(m: Json): Measurement | null {
  const ok =
    isTime(m.time) &&
    isInt(m.uptime_s) && m.uptime_s >= 0 &&
    isNumber(m.temperature_c) &&
    isInt(m.light_pct) && m.light_pct >= 0 && m.light_pct <= 100 &&
    typeof m.alarm === 'string' && ALARM_STATES.includes(m.alarm) &&
    typeof m.motor === 'string' && MOTOR_STATES.includes(m.motor) &&
    isInt(m.rssi_dbm);
  if (!ok) return null;
  return {
    time: m.time as string | null,
    uptime_s: m.uptime_s as number,
    temperature_c: m.temperature_c as number,
    light_pct: m.light_pct as number,
    alarm: m.alarm as AlarmState,
    motor: m.motor as MotorState,
    rssi_dbm: m.rssi_dbm as number,
  };
}

function parseEvent(e: Json): StationEvent | null {
  const time = e.time ?? null;
  if (!isTime(time)) return null;
  if (e.type === 'alarm_raised' && e.cause === 'touch' && isInt(e.reaction_us) && e.reaction_us >= 0) {
    return { time, type: 'alarm_raised', cause: 'touch', reaction_us: e.reaction_us };
  }
  if (e.type === 'alarm_cleared') return { time, type: 'alarm_cleared' };
  return null;
}

function parseReply(r: Json): Reply | null {
  const idOk = r.id === null || (typeof r.id === 'string' && r.id.length >= 1 && r.id.length <= 32);
  if (!idOk || typeof r.ok !== 'boolean') return null;
  if (r.error !== undefined && typeof r.error !== 'string') return null;
  return { id: r.id as string | null, ok: r.ok, ...(r.error !== undefined && { error: r.error as string }) };
}

/** Lit un message reçu sur un topic de la station ; null si le topic ou le contenu ne sont pas prévus. */
export function parseMessage(topic: string, payload: string): StationMessage | null {
  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!isObject(json)) return null;

  switch (topic) {
    case TOPICS.measurements: {
      const data = parseMeasurement(json);
      return data && { kind: 'measurement', data };
    }
    case TOPICS.events: {
      const data = parseEvent(json);
      return data && { kind: 'event', data };
    }
    case TOPICS.status:
      return typeof json.online === 'boolean' ? { kind: 'status', data: { online: json.online } } : null;
    case TOPICS.replies: {
      const data = parseReply(json);
      return data && { kind: 'reply', data };
    }
    default:
      return null;
  }
}
