import { Client, Account, Databases, Functions, ID } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Initialize Appwrite Client
const client = new Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1') // Replace with actual Endpoint
  .setProject('65f3a09b002c0b001a1a');         // Replace with actual Project ID

if (typeof client.setPlatform === 'function') {
  client.setPlatform('com.rhmt.health');
}

export const appwriteAccount = new Account(client);
export const appwriteDatabases = new Databases(client);
export const appwriteFunctions = new Functions(client);
export { client }; // Export client for Realtime SDK WebSocket subscriptions

// Keys for local caching & BaaS collection simulation
const QUEUE_KEY = '@rhmt_offline_queue';
const LOGS_KEY = '@rhmt_system_logs';
const VITALS_CACHE_KEY = '@rhmt_vitals_cache';
const METADATA_KEY = '@rhmt_users_metadata';
const CLOUD_DB_KEY = '@rhmt_cloud_database';
const RECOMMENDATIONS_KEY = '@rhmt_cloud_recommendations';
const ALERTS_KEY = '@rhmt_cloud_alerts';

// 2. HealthSyncManager Engine
export const HealthSyncManager = {
  /**
   * Adds an item to the offline sync queue
   * @param {string} type - 'vital', 'nutrition', 'emergency', 'profile'
   * @param {object} payload - The data payload to sync
   */
  async enqueueAction(type, payload) {
    try {
      const timestamp = new Date().toISOString();
      const id = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const queueItem = { id, type, payload, timestamp };

      // Retrieve existing queue
      const existingQueueRaw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = existingQueueRaw ? JSON.parse(existingQueueRaw) : [];
      queue.push(queueItem);

      // Save updated queue
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      // Append log entry
      await this.logSystemAction(
        'QUEUE',
        `Journal enqueued offline (Pending Sync: ${queue.length})`
      );

      return queueItem;
    } catch (error) {
      console.error('Failed to enqueue offline action:', error);
      await this.logSystemAction('ERROR', `Enqueue failed: ${error.message}`);
      return null;
    }
  },

  /**
   * Retrieves the current offline queue list
   */
  async getQueue() {
    try {
      const queueRaw = await AsyncStorage.getItem(QUEUE_KEY);
      return queueRaw ? JSON.parse(queueRaw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Clears the current offline queue
   */
  async clearQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
      await this.logSystemAction('QUEUE', 'Offline queue cleared manually.');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Retrieves user medical baseline metadata profile
   */
  async getUsersMetadata(userId) {
    try {
      const raw = await AsyncStorage.getItem(METADATA_KEY);
      return raw ? JSON.parse(raw) : {
        user_id: userId || 'usr_default',
        age: 24,
        weight: 70.0,
        height: 175.0,
        blood_group: 'O+',
        diagnosed_conditions: ['Malaria']
      };
    } catch (e) {
      return {
        user_id: userId || 'usr_default',
        age: 24,
        weight: 70.0,
        height: 175.0,
        blood_group: 'O+',
        diagnosed_conditions: ['Malaria']
      };
    }
  },

  /**
   * Saves user medical baseline metadata profile
   */
  async saveUsersMetadata(metadata) {
    try {
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      await this.logSystemAction('INFO', `Medical baseline saved: ${metadata.diagnosed_conditions.join(', ')}`);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Retrieves generated recommendations kept in Appwrite collection
   */
  async getRecommendations() {
    try {
      const raw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Retrieves active alerts fired to the Appwrite alerts collection
   */
  async getAlerts() {
    try {
      const raw = await AsyncStorage.getItem(ALERTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Clears alerts & recommendations in database
   */
  async clearCloudAnalytics() {
    try {
      await AsyncStorage.removeItem(RECOMMENDATIONS_KEY);
      await AsyncStorage.removeItem(ALERTS_KEY);
      await this.logSystemAction('INFO', 'Appwrite Cloud recommendation/alert caches purged.');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Processes all queued items and pushes them to Appwrite Databases / Functions
   * @param {boolean} isOnline - Current internet status
   * @returns {object} Summary of sync operation
   */
  async syncNow(isOnline) {
    if (!isOnline) {
      const errorMsg = 'Cannot sync: App is currently offline.';
      await this.logSystemAction('SYNC', errorMsg);
      return { success: false, syncedCount: 0, error: errorMsg };
    }

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        return { success: true, syncedCount: 0 };
      }

      await this.logSystemAction('SYNC', `Starting synchronization of ${queue.length} items...`);
      let successCount = 0;
      let failedItems = [];

      // Retrieve existing simulated database collections
      const existingCloudRaw = await AsyncStorage.getItem(CLOUD_DB_KEY);
      const cloudDb = existingCloudRaw ? JSON.parse(existingCloudRaw) : [];

      const recsRaw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY);
      const cloudRecommendations = recsRaw ? JSON.parse(recsRaw) : [];

      const alertsRaw = await AsyncStorage.getItem(ALERTS_KEY);
      const cloudAlerts = alertsRaw ? JSON.parse(alertsRaw) : [];

      // Fetch user profile metadata baseline
      const metadata = await this.getUsersMetadata();
      const diagnosedConditions = metadata.diagnosed_conditions || [];

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'vital':
              await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
              break;
            case 'emergency':
              await new Promise(resolve => setTimeout(resolve, 600));
              break;
            default:
              await new Promise(resolve => setTimeout(resolve, 200));
              break;
          }

          // Add records to simulated external cloud database storage (health_records Collection)
          const record = {
            record_id: `rec_${Math.floor(100000 + Math.random() * 900000)}`,
            user_id: metadata.user_id || 'usr_default',
            temperature: parseFloat(item.payload.temperature),
            heart_rate: parseInt(item.payload.heartRate || item.payload.heart_rate),
            symptoms_array: item.payload.symptoms_array || [],
            meds_taken: !!item.payload.meds_taken,
            wellbeing_score: parseInt(item.payload.wellbeing_score || 3),
            timestamp: item.payload.timestamp || new Date().toISOString(),
            is_synced: true,
          };
          cloudDb.push(record);

          // RUN LOGICAL CLINICAL RULES ENGINE (Simulating Appwrite Serverless Cloud Function locally)
          const symptoms = record.symptoms_array || [];
          
          // Rule A: Malaria Case
          if (
            diagnosedConditions.includes('Malaria') && 
            record.temperature > 38.0 && 
            (symptoms.includes('Chills') || symptoms.includes('Severe Headache'))
          ) {
            cloudRecommendations.unshift({
              rec_id: `rec_mal_${Math.floor(100000 + Math.random() * 900000)}`,
              user_id: record.user_id,
              meal_plan: 'Calorie-dense baseline with vitamins (Steamed salmon, leafy greens, citrus fruits).',
              fluid_target: '3.0 Liters',
              lifestyle_guideline: 'Fever flare-up and chills detected during active Malaria treatment. Minimize physical strain, set a strict 3L fluid intake goal for today, and cross-check your prescription tracking sheet.',
              created_at: new Date().toISOString(),
            });
            await this.logSystemAction('RULE_TRIGGER', 'Rule A triggered: Malaria Fever Guideline generated.');
          }

          // Rule B: Typhoid Case
          if (diagnosedConditions.includes('Typhoid') && symptoms.includes('Stomach Pain')) {
            cloudRecommendations.unshift({
              rec_id: `rec_typh_${Math.floor(100000 + Math.random() * 900000)}`,
              user_id: record.user_id,
              meal_plan: 'Non-spicy soft diet: Barley water, vegetable broth, oatmeal, pureed apples.',
              fluid_target: '2.5 Liters',
              lifestyle_guideline: 'Abdominal stress flagged. Drink strictly boiled or purified water and focus on soft, easily digestible meals today to prevent gastrointestinal complications.',
              created_at: new Date().toISOString(),
            });
            await this.logSystemAction('RULE_TRIGGER', 'Rule B triggered: Typhoid Abdominal Guideline generated.');
          }

          // Rule C: Critical Threat Trigger (Fever alert Collections)
          if (record.temperature > 38.5) {
            cloudAlerts.unshift({
              alert_id: `alert_${Math.floor(100000 + Math.random() * 900000)}`,
              user_id: record.user_id,
              severity: 'critical',
              alert_message: `Elevated fever baseline detected (${record.temperature}°C). Rest, maintain hydration, and verify medication schedule.`,
              status: 'unread',
              timestamp: new Date().toISOString(),
            });
            await this.logSystemAction('RULE_TRIGGER', 'Rule C triggered: High Fever Alert fired.');
            await this.logSystemAction('SMS_GATEWAY', `[SMS Gateway Mock] Dispatched Twilio warning to contact node: "Fever baseline elevated (${record.temperature}°C) for user ${record.user_id}."`);
          }

          successCount++;
          await this.logSystemAction('SYNC_SUCCESS', `Synced record ${record.record_id} to Appwrite Health Collection.`);
        } catch (itemErr) {
          failedItems.push(item);
          await this.logSystemAction('SYNC_FAILED', `Failed to sync: ${itemErr.message}`);
        }
      }

      // Save updated storage collections back
      await AsyncStorage.setItem(CLOUD_DB_KEY, JSON.stringify(cloudDb));
      await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(cloudRecommendations));
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(cloudAlerts));

      // Save remaining failed items back to queue
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));

      return {
        success: failedItems.length === 0,
        syncedCount: successCount,
        pendingCount: failedItems.length,
      };
    } catch (error) {
      await this.logSystemAction('SYNC', `Sync process interrupted: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Logs activities to be displayed on the Admin Dashboard console
   * @param {string} level - 'INFO', 'WARN', 'QUEUE', 'SYNC', 'ERROR'
   * @param {string} message - Detail log text
   */
  async logSystemAction(level, message) {
    try {
      const logsRaw = await AsyncStorage.getItem(LOGS_KEY);
      const logs = logsRaw ? JSON.parse(logsRaw) : [];
      const newLog = {
        id: `log_${Date.now()}_${Math.floor(Math.random() * 100)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
      };

      // Keep only last 100 logs
      logs.unshift(newLog);
      if (logs.length > 100) {
        logs.pop();
      }

      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to write system log:', e);
    }
  },

  /**
   * Retrieves system operational logs
   */
  async getSystemLogs() {
    try {
      const logsRaw = await AsyncStorage.getItem(LOGS_KEY);
      return logsRaw ? JSON.parse(logsRaw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Clears system logs
   */
  async clearSystemLogs() {
    try {
      await AsyncStorage.removeItem(LOGS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Cache telemetry readings locally for instant startup load
   */
  async cacheVitals(vitalsData) {
    try {
      await AsyncStorage.setItem(VITALS_CACHE_KEY, JSON.stringify(vitalsData));
    } catch (e) {
      console.error('Vitals caching failed:', e);
    }
  },

  /**
   * Retrieves cached telemetry readings
   */
  async getCachedVitals() {
    try {
      const cacheRaw = await AsyncStorage.getItem(VITALS_CACHE_KEY);
      return cacheRaw ? JSON.parse(cacheRaw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Retrieves all records kept in simulated external Appwrite Cloud Database storage
   */
  async getCloudDatabaseRecords() {
    try {
      const recordsRaw = await AsyncStorage.getItem(CLOUD_DB_KEY);
      return recordsRaw ? JSON.parse(recordsRaw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Clears simulated external Appwrite Cloud Database storage
   */
  async clearCloudDatabase() {
    try {
      await AsyncStorage.removeItem(CLOUD_DB_KEY);
      await AsyncStorage.removeItem(RECOMMENDATIONS_KEY);
      await AsyncStorage.removeItem(ALERTS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }
};
