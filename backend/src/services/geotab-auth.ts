/**
 * Geotab Authentication Service
 * Singleton credential manager with session caching for all 3 APIs.
 */

export interface GeotabCredentials {
  database: string;
  userName: string;
  password: string;
  server: string;
}

interface AuthSession {
  credentials: GeotabCredentials;
  sessionId: string;
  server: string;
  expiresAt: number;
}

class GeotabAuth {
  private session: AuthSession | null = null;
  private authenticating: Promise<AuthSession> | null = null;

  getCredentials(): GeotabCredentials | null {
    const { GEOTAB_DATABASE, GEOTAB_USERNAME, GEOTAB_PASSWORD, GEOTAB_SERVER } = process.env;
    if (!GEOTAB_DATABASE || !GEOTAB_USERNAME || !GEOTAB_PASSWORD) return null;
    return {
      database: GEOTAB_DATABASE,
      userName: GEOTAB_USERNAME,
      password: GEOTAB_PASSWORD,
      server: GEOTAB_SERVER || 'my.geotab.com',
    };
  }

  isConfigured(): boolean {
    return this.getCredentials() !== null;
  }

  async authenticate(): Promise<AuthSession> {
    // Return cached session if still valid (1hr buffer)
    if (this.session && Date.now() < this.session.expiresAt) {
      return this.session;
    }

    // Deduplicate concurrent auth requests
    if (this.authenticating) return this.authenticating;

    this.authenticating = this._doAuth();
    try {
      const session = await this.authenticating;
      this.session = session;
      return session;
    } finally {
      this.authenticating = null;
    }
  }

  private async _doAuth(): Promise<AuthSession> {
    const creds = this.getCredentials();
    if (!creds) throw new Error('Geotab credentials not configured');

    const url = `https://${creds.server}/apiv1`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'Authenticate',
        params: {
          database: creds.database,
          userName: creds.userName,
          password: creds.password,
        },
      }),
    });

    if (!res.ok) throw new Error(`Geotab auth failed: ${res.status}`);
    const data = await res.json() as { result: { credentials: { sessionId: string }; path?: string }; error?: { message: string } };
    if (data.error) throw new Error(`Geotab auth error: ${data.error.message}`);

    const result = data.result;
    return {
      credentials: creds,
      sessionId: result.credentials.sessionId,
      server: (result.path && result.path.includes('.')) ? result.path : creds.server,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23hrs
    };
  }

  async getSessionCredentials(): Promise<{ database: string; sessionId: string; userName: string }> {
    const session = await this.authenticate();
    return {
      database: session.credentials.database,
      sessionId: session.sessionId,
      userName: session.credentials.userName,
    };
  }

  async getApiUrl(): Promise<string> {
    const session = await this.authenticate();
    return `https://${session.server}/apiv1`;
  }

  /** For Data Connector: returns `database/username` : `password` */
  getDataConnectorAuth(): { username: string; password: string } | null {
    const creds = this.getCredentials();
    if (!creds) return null;
    return {
      username: `${creds.database}/${creds.userName}`,
      password: creds.password,
    };
  }

  clearSession(): void {
    this.session = null;
  }
}

export const geotabAuth = new GeotabAuth();
