import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

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

const apiRequest = async (url, options = {}) => {
  const config = {
    headers: getHeaders(),
    ...options,
  };
  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  if (!response.ok) {
    let detail = `API error: ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.detail || payload.message || JSON.stringify(payload);
    } catch (e) {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
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
      throw new Error('Login failed');
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
      let detail = 'Registration failed';
      try {
        const errorData = await response.json();
        if (errorData.password && Array.isArray(errorData.password)) {
          detail = errorData.password.join(', ');
        } else if (errorData.username && Array.isArray(errorData.username)) {
          detail = errorData.username.join(', ');
        } else {
          detail = JSON.stringify(errorData);
        }
      } catch (e) {
        detail = response.statusText || detail;
      }
      throw new Error(detail);
    }
    return response.json();
  },

  async getCurrentUser() {
    return apiRequest('/users/me/');
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
};

export default djangoApi;
