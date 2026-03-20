import requests
import json

print("=" * 80)
print("TESTING GROQ QUESTION GENERATION - Quick Test")
print("=" * 80)

# Test 1: Quick Test - First Call
print("\n🎯 QUICK TEST - CALL 1:")
print("-" * 80)
r1 = requests.post('https://cognix-flask-server-x2u5.onrender.com/test/quick/generate-questions')
data1 = r1.json()
if data1.get('success'):
    print(f"✅ Generated {len(data1['questions'])} questions")
    print(f"📝 First 2 questions:")
    for q in data1['questions'][:2]:
        print(f"   Q{q['id']}: {q['question']}")
else:
    print(f"❌ Error: {data1.get('error')}")

# Test 2: Quick Test - Second Call
print("\n🎯 QUICK TEST - CALL 2:")
print("-" * 80)
r2 = requests.post('https://cognix-flask-server-x2u5.onrender.com/test/quick/generate-questions')
data2 = r2.json()
if data2.get('success'):
    print(f"✅ Generated {len(data2['questions'])} questions")
    print(f"📝 First 2 questions:")
    for q in data2['questions'][:2]:
        print(f"   Q{q['id']}: {q['question']}")
else:
    print(f"❌ Error: {data2.get('error')}")

# Compare
print("\n🔍 COMPARISON:")
print("-" * 80)
if data1.get('success') and data2.get('success'):
    q1_text = [q['question'] for q in data1['questions']]
    q2_text = [q['question'] for q in data2['questions']]
    
    if q1_text == q2_text:
        print("⚠️  SAME QUESTIONS - Not dynamic!")
    else:
        print("✅ DIFFERENT QUESTIONS - Dynamic generation working!")
        
        # Show differences
        same_count = sum(1 for q in q1_text if q in q2_text)
        print(f"   - Call 1: {len(q1_text)} questions")
        print(f"   - Call 2: {len(q2_text)} questions")
        print(f"   - Same questions: {same_count}")
        print(f"   - Different questions: {len(q1_text) - same_count}")

print("\n" + "=" * 80)
print("TESTING GROQ QUESTION GENERATION - Clinical Test")
print("=" * 80)

# Test 3: Clinical Test - First Call
print("\n🏥 CLINICAL TEST - CALL 1:")
print("-" * 80)
r3 = requests.post('https://cognix-flask-server-x2u5.onrender.com/test/clinical/generate-questions')
data3 = r3.json()
if data3.get('success'):
    print(f"✅ Generated {len(data3['questions'])} questions")
    print(f"📝 First 2 questions:")
    for q in data3['questions'][:2]:
        print(f"   Q{q['id']}: {q['question']} ({q.get('category', 'N/A')})")
else:
    print(f"❌ Error: {data3.get('error')}")

# Test 4: Clinical Test - Second Call
print("\n🏥 CLINICAL TEST - CALL 2:")
print("-" * 80)
r4 = requests.post('https://cognix-flask-server-x2u5.onrender.com/test/clinical/generate-questions')
data4 = r4.json()
if data4.get('success'):
    print(f"✅ Generated {len(data4['questions'])} questions")
    print(f"📝 First 2 questions:")
    for q in data4['questions'][:2]:
        print(f"   Q{q['id']}: {q['question']} ({q.get('category', 'N/A')})")
else:
    print(f"❌ Error: {data4.get('error')}")

# Compare
print("\n🔍 COMPARISON:")
print("-" * 80)
if data3.get('success') and data4.get('success'):
    q3_text = [q['question'] for q in data3['questions']]
    q4_text = [q['question'] for q in data4['questions']]
    
    if q3_text == q4_text:
        print("⚠️  SAME QUESTIONS - Not dynamic!")
    else:
        print("✅ DIFFERENT QUESTIONS - Dynamic generation working!")
        
        # Show differences
        same_count = sum(1 for q in q3_text if q in q4_text)
        print(f"   - Call 1: {len(q3_text)} questions")
        print(f"   - Call 2: {len(q4_text)} questions")
        print(f"   - Same questions: {same_count}")
        print(f"   - Different questions: {len(q3_text) - same_count}")

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
