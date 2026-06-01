import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:8001/api';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    AsyncStorage.setItem('@rhmt_auth_token', token);
  } else {
    AsyncStorage.removeItem('@rhmt_auth_token');
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

const formatApiErrors = (payload) => {
  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(formatApiErrors).filter(Boolean).join(' ');
  }

  if (typeof payload === 'object') {
    return Object.entries(payload)
      .map(([field, value]) => {
        const message = formatApiErrors(value);
        if (!message) {
          return '';
        }
        if (field === 'detail' || field === 'non_field_errors') {
          return message;
        }
        const label = field
          .replace(/_/g, ' ')
          .replace(/^\w/, (char) => char.toUpperCase());
        return `${label}: ${message}`;
      })
      .filter(Boolean)
      .join(' ');
  }

  return String(payload);
};

const getErrorMessage = async (response, fallback) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    // Some development errors are HTML or empty responses.
  }

  const details = formatApiErrors(payload);
  return details ? `${fallback}: ${details}` : `${fallback} (${response.status})`;
};

const apiRequest = async (url, options = {}) => {
  const config = {
    headers: getHeaders(),
    ...options,
  };
  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'API request failed'));
  }
  return response.json();
};

export const djangoApi = {
  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Login failed'));
    }

    const data = await response.json();
    setAuthToken(data.access);
    return data;
  },

  async register(username, email, password) {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Registration failed'));
    }
    return response.json();
  },

  async getProfile() {
    return apiRequest('/profiles/my_profile/');
  },

  async updateProfile(data) {
    return apiRequest('/profiles/my_profile/', {
      method: 'PUT',
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

  async getAlerts() {
    return apiRequest('/alerts/');
  },

  async updateAlert(id, data) {
    return apiRequest(`/alerts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getRecommendations() {
    return apiRequest('/recommendations/');
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

  async getEmergencyEvents() {
    return apiRequest('/emergency-events/');
  },

  async createEmergencyEvent(data) {
    return apiRequest('/emergency-events/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSystemLogs() {
    return apiRequest('/logs/');
  },
};

export default djangoApi;
