
import requests
import json
import time

# API Endpoint
base_url = 'http://localhost:5000'
predict_url = f'{base_url}/predict'
features_url = f'{base_url}/model/info' # Or /features depending on app.py routes

def get_required_features():
    try:
        # Try /model/info first as it has 'features_list'
        resp = requests.get(features_url)
        if resp.status_code == 200:
            data = resp.json()
            if 'features_list' in data:
                print(f"✅ Fetched {len(data['features_list'])} features from server")
                return data['features_list']
        
        # Fallback to hardcoded list if fetch fails (debug backup)
        print("⚠️ Failed to fetch features, using backup list...")
        return [
            "visual_hallucination_freq", "motor_symptom_severity", "cognitive_decline_rate", 
            "memory_loss_score", "age", "attention_span_score", "cortical_thickness", 
            "gait_speed", "short_term_memory_score", "reaction_time", "problem_solving_score", 
            "ventricle_size_index", "white_matter_integrity", "fine_motor_control", 
            "brainstem_integrity", "corpus_callosum_thickness", "hand_movement_accuracy", 
            "brain_iron_concentration", "facial_expression_score", "decision_making_score", 
            "parietal_lobe_volume", "synaptic_density_index", "glucose_metabolism_rate", 
            "neuro_transmitter_level", "neuronal_activity_rate", "balance_stability_score", 
            "neuroinflammation_index", "temporal_lobe_volume", "oxygenation_level", 
            "protein_aggregation_level", "neural_connectivity_strength"
        ]
    except Exception as e:
        print(f"❌ Error fetching features: {e}")
        return []

# Fetch features
features_list = get_required_features()

# Helper function to create payload
def create_payload(overrides):
    # Default "Healthy-ish" baseline
    data = {f: 0.1 for f in features_list} 
    
    # Set known function scores to high
    for k in data:
        if 'score' in k or 'accuracy' in k or 'control' in k or 'stability' in k or 'strength' in k:
            if 'loss' not in k and 'symptom' not in k: # Don't set symptom scores high
                 data[k] = 0.9

    data['age'] = 65.0
    
    # Apply applies
    for k, v in overrides.items():
        # Only add valid features to the payload to be clean
        # But wait, if override has a key NOT in features_list, it's fine, server ignores extra?
        # Or server errors if missing?
        # Let's ensure we include ALL required.
        pass

    # Update with overrides
    for k, v in overrides.items():
        if k in features_list:
            data[k] = v
        # Assuming server doesn't care about extra keys, but we won't send them just in case
            
    return data

# Test Scenarios
scenarios = [
    {
        "name": "TEST 1: Likely Alzheimer's (High Memory Loss, Old Age)",
        "data": {
            "memory_loss_score": 0.95,
            "short_term_memory_score": 0.1, 
            "cognitive_decline_rate": 0.85,
            "age": 82.0,
            "cortical_thickness": 0.2 
        }
    },
    {
        "name": "TEST 2: Likely Parkinson's (Motor Symptoms)",
        "data": {
            "motor_symptom_severity": 0.9,
            "fine_motor_control": 0.1,
            "hand_movement_accuracy": 0.2,
            "gait_speed": 0.2,
            "facial_expression_score": 0.1,
            "age": 70.0
        }
    },
    {
        "name": "TEST 3: Likely LBD (Hallucinations)",
        "data": {
            "visual_hallucination_freq": 0.95,
            "cognitive_decline_rate": 0.7,
            "motor_symptom_severity": 0.6,
            "age": 75.0
        }
    },
    {
        "name": "TEST 4: Likely FTD (Behavioral/Cognitive)",
        "data": {
            "cognitive_decline_rate": 0.9,
            "decision_making_score": 0.1,
            "problem_solving_score": 0.1,
            "temporal_lobe_volume": 0.2,
            "age": 60.0 
        }
    },
    {
        "name": "TEST 5: Healthy Control",
        "data": {
            "memory_loss_score": 0.05,
            "motor_symptom_severity": 0.05,
            "cognitive_decline_rate": 0.05,
            "age": 55.0,
            "cortical_thickness": 0.9,
            "neural_connectivity_strength": 0.9
        }
    }
]

print(f"{'='*60}")
print("🚀 TESTING API WITH 5 SCENARIOS")
print(f"Features Count: {len(features_list)}")
print(f"{'='*60}\n")

for i, scenario in enumerate(scenarios, 1):
    print(f"\n🔹 {scenario['name']}")
    if not features_list:
        print("❌ SKIPPING: No features list available")
        continue

    payload = create_payload(scenario['data'])
    
    # Validation: Ensure all 31 keys are present
    missing = [f for f in features_list if f not in payload]
    if missing:
        print(f"   ⚠️ WARNING: Creating payload missing keys: {missing}")
    
    try:
        start_time = time.time()
        # Wrap payload in 'features' key as expected by the server
        request_body = {'features': payload}
        response = requests.post(predict_url, json=request_body)
        duration = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                prediction_data = result['prediction']
                pred_disease = prediction_data['predicted_disease']
                conf = prediction_data['confidence']
                print(f"   ✅ Prediction: {pred_disease}")
                print(f"   📊 Confidence: {conf:.2%}")
                print(f"   ⏱️ Latency:    {duration:.0f}ms")
            else:
                print(f"   ❌ API Error: {result.get('error')}")
                if 'missing' in str(result.get('error')).lower():
                     print(f"      Payload keys: {len(payload.keys())}")
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"   ❌ Connection Failed: {e}")

print(f"\n{'='*60}")
