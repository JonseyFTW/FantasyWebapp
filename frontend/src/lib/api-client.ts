import { getSession } from 'next-auth/react';

class ApiClient {
  private baseUrl: string;
  private tokenCache: { token: string; expires: number; userId: string } | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  }

  private async getBackendJWT(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.token;
    }

    // Get NextAuth session
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('No valid session found');
    }

    // Exchange NextAuth session for backend JWT
    const response = await fetch(`${this.baseUrl}/api/auth/token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: session.user.email,
        userId: (session.user as any).id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get backend JWT: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.token) {
      throw new Error('Invalid token response from backend');
    }

    // Cache the token (assuming 1 hour expiry for safety)
    this.tokenCache = {
      token: data.data.token,
      userId: data.data.user.id,
      expires: Date.now() + (60 * 60 * 1000), // 1 hour
    };

    return data.data.token;
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const token = await this.getBackendJWT();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // If we get a 401, clear the token cache and retry once
      if (response.status === 401 && this.tokenCache) {
        this.tokenCache = null;
        const newToken = await this.getBackendJWT();
        
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch failed:', error);
      throw error;
    }
  }

  // Convenience methods for common HTTP verbs
  async get(endpoint: string): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return this.authenticatedFetch(url, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return this.authenticatedFetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return this.authenticatedFetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return this.authenticatedFetch(url, { method: 'DELETE' });
  }

  // Get the database user ID for API calls
  async getDatabaseUserId(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.userId;
    }
    
    // Get token which will cache the user ID
    await this.getBackendJWT();
    
    if (!this.tokenCache?.userId) {
      throw new Error('No user ID available');
    }
    
    return this.tokenCache.userId;
  }

  // Clear token cache (useful for logout)
  clearTokenCache(): void {
    this.tokenCache = null;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;