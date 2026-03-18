import http from 'http';
import { AddressInfo } from 'net';
import { io as createClient, Socket } from 'socket.io-client';
import { app } from '../src/app';
import { generateToken } from '../src/utils/jwtUtils';
import { AlertNotification, MetricUpdate, WebSocketGateway } from '../src/websocket/WebSocketGateway';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('WebSocketGateway (integration)', () => {
  let server: http.Server;
  let gateway: WebSocketGateway;
  let baseUrl: string;
  const clients: Socket[] = [];

  const registerClient = (client: Socket): Socket => {
    clients.push(client);
    return client;
  };

  const createToken = (roles: string[] = ['OPERATOR']): string =>
    generateToken({
      userId: `user-${roles.join('-').toLowerCase()}`,
      username: roles.includes('ADMIN') ? 'admin' : 'operator',
      email: 'user@example.com',
      roles,
    });

  const connectClient = async (token?: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const client = registerClient(
        createClient(baseUrl, {
          path: '/ws',
          transports: ['websocket'],
          auth: token ? { token } : undefined,
          reconnection: false,
          timeout: 5000,
        })
      );

      client.once('connect', () => resolve(client));
      client.once('connect_error', (error) => reject(error));
    });

  beforeAll(async () => {
    server = http.createServer(app);
    gateway = new WebSocketGateway(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    while (clients.length > 0) {
      const client = clients.pop();
      client?.disconnect();
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it('rejects unauthenticated connections', async () => {
    await expect(connectClient()).rejects.toThrow('Authentication required');
  });

  it('delivers alert events to subscribed clients and critical alerts to admins', async () => {
    const adminClient = await connectClient(createToken(['ADMIN']));
    const operatorClient = await connectClient(createToken(['OPERATOR']));

    const adminAlertPromise = new Promise<AlertNotification>((resolve) => {
      adminClient.once('alert:new', (payload: AlertNotification) => resolve(payload));
    });
    const operatorAlertPromise = new Promise<AlertNotification>((resolve) => {
      operatorClient.once('alert:new', (payload: AlertNotification) => resolve(payload));
    });

    const adminCriticalHandler = jest.fn();
    const operatorCriticalHandler = jest.fn();
    adminClient.on('alert:critical', adminCriticalHandler);
    operatorClient.on('alert:critical', operatorCriticalHandler);

    adminClient.emit('subscribe:alerts');
    operatorClient.emit('subscribe:alerts');
    await delay(50);

    gateway.emitAlert({
      id: 'alert-1',
      serverId: 'srv-1',
      serverName: 'Primary Server',
      type: 'critical',
      message: 'CPU usage above threshold',
      timestamp: new Date('2026-03-18T00:00:00.000Z'),
      acknowledged: false,
    });

    const [adminAlert, operatorAlert] = await Promise.all([adminAlertPromise, operatorAlertPromise]);

    expect(adminAlert.message).toBe('CPU usage above threshold');
    expect(operatorAlert.message).toBe('CPU usage above threshold');

    await delay(50);
    expect(adminCriticalHandler).toHaveBeenCalledTimes(1);
    expect(operatorCriticalHandler).not.toHaveBeenCalled();
  });

  it('emits monitoring and server-room metric updates to subscribed clients', async () => {
    const client = await connectClient(createToken(['ADMIN']));
    const monitoringEventPromise = new Promise<MetricUpdate>((resolve) => {
      client.once('metrics:update', (payload: MetricUpdate) => resolve(payload));
    });
    const serverEventPromise = new Promise<MetricUpdate>((resolve) => {
      client.once('metrics:server', (payload: MetricUpdate) => resolve(payload));
    });

    client.emit('subscribe:server', 'srv-1');
    await delay(50);

    gateway.emitMetricUpdate({
      serverId: 'srv-1',
      serverName: 'Primary Server',
      timestamp: new Date('2026-03-18T00:05:00.000Z'),
      metrics: {
        cpu: 92,
        memory: 81,
        disk: 70,
        networkIn: 1000,
        networkOut: 800,
      },
    });

    const [monitoringEvent, serverEvent] = await Promise.all([monitoringEventPromise, serverEventPromise]);

    expect(monitoringEvent.serverId).toBe('srv-1');
    expect(serverEvent.metrics.cpu).toBe(92);
  });
});
