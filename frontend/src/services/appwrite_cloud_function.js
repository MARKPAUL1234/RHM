/*
 * Appwrite Serverless Cloud Function index.js
 * Trigger event: databases.health_records.collections.health_records.documents.create
 * 
 * Flow:
 * 1. Safely extracts enqueued health journal document fields (temperature, SpO2, symptoms array).
 * 2. Connects to Appwrite NoSQL Database service.
 * 3. Queries the 'users_metadata' collection to check for patient baseline diagnosed conditions.
 * 4. Runs the logical clinical rules engine:
 *    - Rule A: Active Malaria Treatment Fever + Chills Alert.
 *    - Rule B: Active Typhoid Abdominal distress gastrointestinal check.
 *    - Rule C: Hypoxia / Hyperpyrexia priority alert & SMS gateway mock dispatch.
 * 5. Writes output to 'recommendations' or 'alerts' database collections dynamically.
 */

const sdk = require('node-appwrite');

module.exports = async function (req, res) {
  // Initialize Appwrite Client inside Serverless Context
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  // Appwrite system environmental parameters (supplied natively by Serverless container)
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    req.log('Configuration Error: Missing system environment variables.');
    return res.json({ success: false, error: 'BaaS configuration misaligned.' }, 500);
  }

  client
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  // Database and Collection Constants matching NoSQL schemas
  const DATABASE_ID = 'remote_health_db';
  const METADATA_COLLECTION_ID = 'users_metadata';
  const RECOMMENDATIONS_COLLECTION_ID = 'recommendations';
  const ALERTS_COLLECTION_ID = 'alerts';

  try {
    // 1. Parse trigger event payload document (health_records Collection)
    const record = JSON.parse(req.variables['APPWRITE_FUNCTION_EVENT_DATA']);
    
    if (!record) {
      req.log('Event Error: Empty document payload intercepted.');
      return res.json({ success: false, error: 'Document data empty.' }, 400);
    }

    const {
      $id: recordId,
      user_id: userId,
      temperature,
      heart_rate: heartRate,
      spo2,
      symptoms_array: symptomsArray,
      meds_taken: medsTaken,
      wellbeing_score: wellbeingScore,
      timestamp
    } = record;

    req.log(`Processing Health Record ID: ${recordId} for Patient: ${userId}`);

    // 2. Query user profile medical baseline (users_metadata collection)
    let userMetadata;
    try {
      userMetadata = await databases.getDocument(
        DATABASE_ID,
        METADATA_COLLECTION_ID,
        userId
      );
    } catch (dbErr) {
      req.log(`Profile Fetch Warning: users_metadata document not found for ${userId}. Fallback active.`);
      userMetadata = {
        age: 24,
        weight: 70,
        height: 175,
        blood_group: 'O+',
        diagnosed_conditions: ['None']
      };
    }

    const diagnosedConditions = userMetadata.diagnosed_conditions || [];
    const symptoms = symptomsArray || [];

    req.log(`Diagnosed baseline conditions: ${diagnosedConditions.join(', ')}`);
    req.log(`Symptoms enqueued in log: ${symptoms.join(', ')}`);

    // 3. EXECUTE LOGICAL RULES ENGINE

    // --- RULE A: Malaria Treatment Fever Trigger ---
    // Condition: Patient profile contains "Malaria", temperature > 38.0°C, and symptoms list has chills or severe headache
    if (
      diagnosedConditions.includes('Malaria') &&
      temperature > 38.0 &&
      (symptoms.includes('Chills') || symptoms.includes('Severe Headache') || symptoms.includes('chills') || symptoms.includes('severe headache'))
    ) {
      const recPayload = {
        rec_id: `rec_mal_${Date.now()}`,
        user_id: userId,
        meal_plan: 'Calorie-dense baseline with vitamins (Steamed salmon, leafy greens, citrus fruits).',
        fluid_target: '3.0 Liters',
        lifestyle_guideline: 'Fever flare-up and chills detected during active Malaria treatment. Minimize physical strain, set a strict 3L fluid intake goal for today, and cross-check your prescription tracking sheet.',
        created_at: new Date().toISOString()
      };

      await databases.createDocument(
        DATABASE_ID,
        RECOMMENDATIONS_COLLECTION_ID,
        sdk.ID.unique(),
        recPayload
      );
      req.log('Rule A matched successfully. Pushed guideline document to Appwrite Recommendations collection.');
    }

    // --- RULE B: Typhoid Abdominal Stress Trigger ---
    // Condition: Patient profile contains "Typhoid" and symptoms checked contains stomach pain
    if (
      diagnosedConditions.includes('Typhoid') &&
      (symptoms.includes('Stomach Pain') || symptoms.includes('stomach pain'))
    ) {
      const recPayload = {
        rec_id: `rec_typh_${Date.now()}`,
        user_id: userId,
        meal_plan: 'Non-spicy soft diet: Barley water, vegetable broth, oatmeal, pureed apples.',
        fluid_target: '2.5 Liters',
        lifestyle_guideline: 'Abdominal stress flagged. Drink strictly boiled or purified water and focus on soft, easily digestible meals today to prevent gastrointestinal complications.',
        created_at: new Date().toISOString()
      };

      await databases.createDocument(
        DATABASE_ID,
        RECOMMENDATIONS_COLLECTION_ID,
        sdk.ID.unique(),
        recPayload
      );
      req.log('Rule B matched successfully. Pushed guideline document to Appwrite Recommendations collection.');
    }

    // --- RULE C: Critical Oxygen / High Fever Alert Trigger ---
    // Condition 1: SpO2 levels strictly under 92% (Hypoxia Alert)
    if (spo2 < 92) {
      const alertPayload = {
        alert_id: `alert_spo2_${Date.now()}`,
        user_id: userId,
        severity: 'critical',
        alert_message: 'Oxygen depletion detected. Check vitals and contact emergency support immediately.',
        status: 'unread',
        timestamp: new Date().toISOString()
      };

      await databases.createDocument(
        DATABASE_ID,
        ALERTS_COLLECTION_ID,
        sdk.ID.unique(),
        alertPayload
      );
      req.log('Rule C matched (Hypoxia). Priority alarm document created in Appwrite Alerts collection.');
      
      // Simulate/Mock TWILIO SMS API dispatch for offline alert channels
      req.log(`[SMS EMERGENCY DISPATCH - Twilio Gateway] Priority trigger activated! SMS dispatched: "EMERGENCY DISTRESS: User ${userId} has triggered an emergency alert. Last recorded SpO2: ${spo2}%."`);
    } 
    // Condition 2: Temperature strictly over 38.5°C (High Fever Alert)
    else if (temperature > 38.5) {
      const alertPayload = {
        alert_id: `alert_temp_${Date.now()}`,
        user_id: userId,
        severity: 'critical',
        alert_message: `Elevated fever baseline detected (${temperature}°C). Rest, maintain hydration, and verify medication schedule.`,
        status: 'unread',
        timestamp: new Date().toISOString()
      };

      await databases.createDocument(
        DATABASE_ID,
        ALERTS_COLLECTION_ID,
        sdk.ID.unique(),
        alertPayload
      );
      req.log('Rule C matched (High Fever). Alert document created in Appwrite Alerts collection.');
      
      // Simulate/Mock TWILIO SMS API dispatch for fever alerts
      req.log(`[SMS EMERGENCY DISPATCH - Twilio Gateway] Priority trigger activated! SMS dispatched: "EMERGENCY DISTRESS: User ${userId} has triggered an emergency alert. Last recorded Temp: ${temperature}°C."`);
    }

    return res.json({ success: true, message: 'Logical clinical rules processing engine ran successfully.' });
  } catch (error) {
    req.log(`Execution Interrupt: ${error.message}`);
    return res.json({ success: false, error: error.message }, 500);
  }
};
