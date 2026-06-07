import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';
const AUTH_TOKEN_KEY = '@rhmt_auth_token';
const REFRESH_TOKEN_KEY = '@rhmt_refresh_token';

let authToken = null;
let refreshToken = null;
let refreshPromise = null;

const decodeJwtPayload = (token) => {
  if (!token || typeof atob !== 'function') return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch (e) {
    return null;
  }
};

const isAccessTokenExpiring = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + 30000;
};

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const setRefreshToken = (token) => {
  refreshToken = token;
  if (token) {
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

const parseErrorDetail = async (response, fallback) => {
  let detail = fallback;
  try {
    const payload = await response.json();
    detail = payload.detail || payload.message || JSON.stringify(payload);
  } catch (e) {
    detail = response.statusText || detail;
  }
  return detail;
};

const refreshAccessToken = async () => {
  if (!refreshToken) {
    refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  if (!refreshToken) {
    setAuthToken(null);
    throw new Error('Session expired. Sign in again to continue.');
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
  const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    setAuthToken(null);
    setRefreshToken(null);
    throw new Error('Session expired. Sign in again to continue.');
  }

  const data = await response.json();
  setAuthToken(data.access);
  return data.access;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const apiRequest = async (url, options = {}, retryOnUnauthorized = true) => {
  const config = {
    headers: getHeaders(),
    ...options,
  };
  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  if (!response.ok) {
    if (response.status === 401 && retryOnUnauthorized) {
      await refreshAccessToken();
      return apiRequest(url, options, false);
    }
    const detail = await parseErrorDetail(response, `API error: ${response.status}`);
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const explainNetworkError = (error) => {
  if (error instanceof TypeError && String(error.message).includes('Failed to fetch')) {
    return new Error(
      'Cannot reach the Django API. Make sure the backend is running on http://localhost:8080 and restart it after the CORS changes.'
    );
  }
  return error;
};

export const djangoApi = {
  API_BASE_URL,

  async hasStoredSession() {
    const storedAccess = authToken || await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    const storedRefresh = refreshToken || await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return Boolean(storedAccess || storedRefresh);
  },

  async ensureAuthenticated() {
    if (!authToken) {
      authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    }
    if (!refreshToken) {
      refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }
    if (!authToken && !refreshToken) {
      throw new Error('Session expired. Sign in again to continue.');
    }
    if (!authToken || isAccessTokenExpiring(authToken)) {
      await refreshAccessToken();
    }
    return authToken;
  },

  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        let detail = 'Login failed. Check your username and password.';
        try {
          const errorData = await response.json();
          detail = errorData.detail || JSON.stringify(errorData);
        } catch (e) {
          detail = response.statusText || detail;
        }
        throw new Error(detail);
      }

      const data = await response.json();
      setAuthToken(data.access);
      setRefreshToken(data.refresh);
      return data;
    } catch (error) {
      throw explainNetworkError(error);
    }
  },

  async refreshSession() {
    try {
      const access = await refreshAccessToken();
      return { access };
    } catch (error) {
      throw explainNetworkError(error);
    }
  },

  async logout() {
    setAuthToken(null);
    setRefreshToken(null);
    await AsyncStorage.removeItem('@rhmt_user_session');
  },

  async register(username, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        let detail = 'Registration failed';
        try {
          const errorData = await response.json();
          if (errorData.password && Array.isArray(errorData.password)) {
            detail = errorData.password.join(', ');
          } else if (errorData.username && Array.isArray(errorData.username)) {
            detail = errorData.username.join(', ');
          } else if (errorData.email && Array.isArray(errorData.email)) {
            detail = errorData.email.join(', ');
          } else {
            detail = JSON.stringify(errorData);
          }
        } catch (e) {
          detail = response.statusText || detail;
        }
        throw new Error(detail);
      }

      return response.json();
    } catch (error) {
      throw explainNetworkError(error);
    }
  },

  async getCurrentUser() {
    return apiRequest('/users/me/');
  },

  async getPatientOverview() {
    return apiRequest('/users/patient_overview/');
  },

  async getProfile() {
    return apiRequest('/profiles/my_profile/');
  },

  async updateProfile(data) {
    return apiRequest('/profiles/my_profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getHealthRecords() {
    return apiRequest('/records/');
  },

  async createHealthRecord(data) {
    return apiRequest('/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getFitnessSummary() {
    return apiRequest('/records/fitness_summary/');
  },

  async getHealthSummary() {
    return apiRequest('/records/health_summary/');
  },

  async getWeeklyReport() {
    return apiRequest('/records/weekly_report/');
  },

  async getWeeklyReportExport() {
    return apiRequest('/records/weekly_report_export/');
  },

  async reviewHealthRecord(recordId, data) {
    return apiRequest(`/records/${recordId}/review/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getHealthScores() {
    return apiRequest('/health-scores/');
  },

  async getMedicationReminders() {
    return apiRequest('/medication-reminders/');
  },

  async createMedicationReminder(data) {
    return apiRequest('/medication-reminders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMedicationReminder(reminderId, data) {
    return apiRequest(`/medication-reminders/${reminderId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async markMedicationTaken(reminderId) {
    return apiRequest(`/medication-reminders/${reminderId}/mark_taken/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async markMedicationMissed(reminderId) {
    return apiRequest(`/medication-reminders/${reminderId}/mark_missed/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getAlerts() {
    return apiRequest('/alerts/');
  },

  async updateAlert(alertId, data) {
    return apiRequest(`/alerts/${alertId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getRecommendations() {
    return apiRequest('/recommendations/');
  },

  async getSystemLogs() {
    return apiRequest('/logs/');
  },

  async getNutritionLogs() {
    return apiRequest('/nutrition-logs/');
  },

  async createNutritionLog(data) {
    return apiRequest('/nutrition-logs/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getFoodLogs() {
    return apiRequest('/food-logs/');
  },

  async createFoodLog(data) {
    return apiRequest('/food-logs/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getFitnessLogs() {
    return apiRequest('/fitness-logs/');
  },

  async createFitnessLog(data) {
    return apiRequest('/fitness-logs/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createEmergencyEvent(data) {
    return apiRequest('/emergency-events/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEmergencyEvents() {
    return apiRequest('/emergency-events/');
  },

  async getContactInquiries() {
    return apiRequest('/contact-inquiries/');
  },

  async createContactInquiry(data) {
    return apiRequest('/contact-inquiries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAppointmentRequests() {
    return apiRequest('/appointment-requests/');
  },

  async createAppointmentRequest(data) {
    return apiRequest('/appointment-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCareMessages() {
    return apiRequest('/care-messages/');
  },

  async createCareMessage(data) {
    return apiRequest('/care-messages/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default djangoApi;
