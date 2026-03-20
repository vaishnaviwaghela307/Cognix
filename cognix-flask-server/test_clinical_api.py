"""
Test Clinical Assessment API
Tests the new clinical screening endpoints
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_analyze_answers():
    """Test the /clinical/analyze endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Analyzing Text Answers")
    print("="*60)
    
    # Test cognitive domain
    payload = {
        "domain": "cognitive",
        "answers": [
            "Yes, I frequently forget recent conversations and where I put things",
            "I find it very difficult to plan my day or solve simple problems",
            "Sometimes I get confused about what day it is",
            "Daily tasks like cooking are much harder than before"
        ]
    }
    
    response = requests.post(f"{BASE_URL}/clinical/analyze", json=payload)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()


def test_clinical_prediction():
    """Test the /clinical/predict endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Clinical Prediction with 4 Domain Scores")
    print("="*60)
    
    # Example: Patient with moderate cognitive and motor symptoms
    payload = {
        "demographic_score": 3.5,
        "cognitive_score": 7.2,
        "motoric_score": 4.8,
        "neuropsychiatric_score": 2.1,
        "user_answers": {
            "demographic": [
                "I am 68 years old",
                "Sometimes I get confused about my exact age",
                "My family has corrected me a few times",
                "Age-related details sometimes confuse me"
            ],
            "cognitive": [
                "Yes, I frequently forget recent conversations",
                "I find it very difficult to plan or solve daily problems",
                "I often feel confused about time and date",
                "Familiar tasks are much harder than before"
            ],
            "motoric": [
                "I have noticed slight shaking in my hands",
                "My muscles feel a bit stiff sometimes",
                "I feel slower while walking",
                "I have some balance problems"
            ],
            "neuropsychiatric": [
                "No, I haven't seen things that aren't there",
                "No unusual sounds or voices",
                "I sleep normally",
                "My alertness is fine"
            ]
        }
    }
    
    response = requests.post(f"{BASE_URL}/clinical/predict", json=payload)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()


def test_full_workflow():
    """Test complete workflow: analyze answers -> get scores -> predict"""
    print("\n" + "="*60)
    print("TEST 3: Full Clinical Assessment Workflow")
    print("="*60)
    
    # Step 1: Define all answers
    all_answers = {
        "demographic": [
            "I am 72 years old",
            "Yes, I sometimes feel confused about my age",
            "My family has corrected me multiple times",
            "Age-related details often confuse me"
        ],
        "cognitive": [
            "Yes, I always forget recent conversations and events",
            "I find it extremely difficult to plan or solve problems",
            "I am constantly confused about time, date, and place",
            "Daily tasks are very hard now"
        ],
        "motoric": [
            "Yes, I have severe shaking in my hands and legs",
            "My muscles are very stiff and rigid",
            "I am extremely slow while walking",
            "I frequently have balance problems and fall"
        ],
        "neuropsychiatric": [
            "Yes, I often see things that others say aren't there",
            "I frequently hear voices without a source",
            "I constantly move and talk during sleep",
            "I have severe changes in alertness"
        ]
    }
    
    # Step 2: Analyze each domain
    scores = {}
    for domain, answers in all_answers.items():
        print(f"\n📊 Analyzing {domain.upper()} domain...")
        response = requests.post(
            f"{BASE_URL}/clinical/analyze",
            json={"domain": domain, "answers": answers}
        )
        if response.status_code == 200:
            result = response.json()
            scores[f"{domain}_score"] = result['severity_score']
            print(f"   ✅ Score: {result['severity_score']}/10")
        else:
            print(f"   ❌ Error: {response.text}")
            return
    
    # Step 3: Make prediction
    print(f"\n🧠 Making prediction with scores: {scores}")
    scores['user_answers'] = all_answers
    
    response = requests.post(f"{BASE_URL}/clinical/predict", json=scores)
    
    if response.status_code == 200:
        result = response.json()
        prediction = result['prediction']
        
        print("\n" + "="*60)
        print("🎯 PREDICTION RESULTS")
        print("="*60)
        print(f"\n🏥 Predicted Disease: {prediction['predicted_disease']}")
        print(f"📊 Confidence: {prediction['confidence']*100:.1f}%")
        print(f"\n📈 All Probabilities:")
        for disease, prob in prediction['probabilities'].items():
            print(f"   {disease:20s}: {prob*100:5.1f}%")
        print("\n" + "="*60)
    else:
        print(f"❌ Prediction Error: {response.text}")


if __name__ == "__main__":
    print("\n🧪 CLINICAL ASSESSMENT API TESTS")
    print("="*60)
    
    try:
        # Test 1: Analyze answers
        test_analyze_answers()
        
        # Test 2: Direct prediction with scores
        test_clinical_prediction()
        
        # Test 3: Full workflow
        test_full_workflow()
        
        print("\n✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to Flask server")
        print("   Make sure the server is running on http://localhost:5000")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
