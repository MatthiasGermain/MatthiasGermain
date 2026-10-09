/* Connexion de la page au broker MQTT de la station, dans le navigateur, avec l'utilisateur
 * `web-viewer` (lecture seule : son mot de passe est public, il ne peut rien publier).
 * mqtt.js n'est chargé qu'à l'appel de watchStation, en différé, pour ne pas alourdir la page ; il
 * se reconnecte seul. L'adresse du broker et les identifiants viennent des variables
 * PUBLIC_STATION_MQTT_URL, _USERNAME et _PASSWORD : ils ne sont écrits dans aucun dépôt. */
import { TOPICS, parseMessage, type Measurement, type StationEvent } from './protocol';

/** Une mesure plus vieille que ça n'est plus « en direct » : la station est considérée hors ligne. */
export const STALE_MS = 15_000;
const MAX_EVENTS = 8;

export type BrokerState = 'connecting' | 'connected' | 'reconnecting' | 'unconfigured';

export interface StationState {
  broker: BrokerState;
  /** Dernier état publié sur `status` (null tant qu'il n'est pas arrivé) */
  online: boolean | null;
  measurement: Measurement | null;
  /** Instant de la dernière mesure (ms) : son heure pour une mesure retenue, sa réception sinon ;
   *  null si une mesure retenue n'a pas d'heure (âge inconnu) */
  measuredAt: number | null;
  /** Événements reçus depuis l'ouverture de la page, du plus récent au plus ancien */
  events: { event: StationEvent; receivedAt: number }[];
}

/** La station envoie-t-elle encore ? En ligne d'après `status` et dernière mesure récente. */
export const isLive = (s: StationState, now = Date.now()) =>
  s.broker === 'connected' && s.online !== false && s.measuredAt !== null && now - s.measuredAt <= STALE_MS;

export function watchStation(onChange: (state: StationState) => void): () => void {
  const url = import.meta.env.PUBLIC_STATION_MQTT_URL;
  const username = import.meta.env.PUBLIC_STATION_MQTT_USERNAME;
  const password = import.meta.env.PUBLIC_STATION_MQTT_PASSWORD;

  const state: StationState = { broker: 'connecting', online: null, measurement: null, measuredAt: null, events: [] };
  const emit = () => onChange({ ...state, events: [...state.events] });

  if (!url || !username) {
    state.broker = 'unconfigured';
    emit();
    return () => {};
  }
  emit();

  let stopped = false;
  let client: import('mqtt').MqttClient | undefined;

  import('mqtt')
    .then((mqtt) => {
      if (stopped) return;
      // `connect` est un export nommé dans le build, mais seulement une propriété de l'export par
      // défaut dans la version que Vite prépare en dev
      const connect = mqtt.connect ?? (mqtt as unknown as { default: typeof mqtt }).default.connect;
      client = connect(url, {
        username,
        password,
        clientId: `web-viewer-${Math.random().toString(16).slice(2, 10)}`,
        clean: true,
        keepalive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 10_000,
      });
      client.on('connect', () => {
        state.broker = 'connected';
        // Un abonnement par topic : web-viewer n'a pas le droit de s'abonner à un filtre plus large
        client!.subscribe({
          [TOPICS.measurements]: { qos: 0 },
          [TOPICS.events]: { qos: 0 },
          [TOPICS.status]: { qos: 1 },
          [TOPICS.replies]: { qos: 0 },
        });
        emit();
      });
      client.on('reconnect', () => {
        state.broker = 'reconnecting';
        emit();
      });
      // Erreurs de connexion (réseau, identifiants) : la reconnexion automatique prend le relais ;
      // on les note dans la console pour le diagnostic
      client.on('error', (err) => console.warn('Station : erreur MQTT,', err.message));
      client.on('message', (topic, payload, packet) => {
        const message = parseMessage(topic, payload.toString());
        if (!message) return;
        const now = Date.now();
        switch (message.kind) {
          case 'measurement': {
            state.measurement = message.data;
            // Une mesure retenue peut dater d'avant l'ouverture de la page : son âge vient de son
            // heure. Une mesure en direct vient d'arriver : l'heure du navigateur suffit, sans
            // dépendre d'un écart d'horloge avec la station.
            const time = message.data.time ? Date.parse(message.data.time) : null;
            state.measuredAt = packet.retain ? time : now;
            break;
          }
          case 'status':
            state.online = message.data.online;
            break;
          case 'event':
            state.events = [{ event: message.data, receivedAt: now }, ...state.events].slice(0, MAX_EVENTS);
            break;
          case 'reply':
            // Réponses aux commandes : utiles à l'étape 5
            return;
        }
        emit();
      });
    })
    .catch((err) => {
      console.warn('Station : connexion impossible,', err instanceof Error ? err.message : err);
      state.broker = 'reconnecting';
      emit();
    });

  return () => {
    stopped = true;
    client?.end(true);
  };
}
