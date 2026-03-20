/**
 * Test Clinical Assessment Node.js API
 * Tests the integration between Node.js and Flask for clinical assessments
 */

const axios = require('axios');

const NODE_API_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test_user_' + Date.now();

async function testClinicalAssessment() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING CLINICAL ASSESSMENT FLOW');
  console.log('='.repeat(60));

  try {
    // Step 1: Define all user answers
    const allAnswers = {
      demographic: [
        'I am 72 years old',
        'Yes, I sometimes feel confused about my age',
        'My family has corrected me a few times',
        'Age-related details sometimes confuse me'
      ],
      cognitive: [
        'Yes, I frequently forget recent conversations',
        'I find it very difficult to plan my day',
        'I often get confused about the date',
        'Daily tasks are harder than before'
      ],
      motoric: [
        'I have noticed some shaking in my hands',
        'My muscles feel stiff sometimes',
        'I feel slower while walking',
        'I have occasional balance problems'
      ],
      neuropsychiatric: [
        'No, I haven\'t seen things that aren\'t there',
        'No unusual sounds',
        'I sleep normally',
        'My alertness is fine'
      ]
    };

    // Step 2: Analyze each domain and collect scores
    console.log('\n📊 STEP 1: Analyzing Answers...\n');
    const scores = {};

    for (const [domain, answers] of Object.entries(allAnswers)) {
      console.log(`   Analyzing ${domain.toUpperCase()} domain...`);
      
      const response = await axios.post(`${NODE_API_URL}/api/clinical/analyze`, {
        domain,
        answers
      });

      if (response.data.success) {
        scores[`${domain}_score`] = response.data.severity_score;
        console.log(`   ✅ Score: ${response.data.severity_score}/10`);
      } else {
        console.log(`   ❌ Error: ${response.data.error}`);
        return;
      }
    }

    // Step 3: Complete assessment and save to database
    console.log('\n🧠 STEP 2: Completing Assessment...\n');
    
    const assessmentPayload = {
      userId: TEST_USER_ID,
      ...scores,
      user_answers: allAnswers
    };

    const assessmentResponse = await axios.post(
      `${NODE_API_URL}/api/clinical/assess`,
      assessmentPayload
    );

    if (assessmentResponse.data.success) {
      const result = assessmentResponse.data.data;
      
      console.log('   ✅ Assessment Saved Successfully!');
      console.log(`   📝 History ID: ${result.historyId}`);
      
      console.log('\n' + '='.repeat(60));
      console.log('🎯 PREDICTION RESULTS');
      console.log('='.repeat(60));
      console.log(`\n🏥 Predicted Disease: ${result.prediction.predicted_disease}`);
      console.log(`📊 Confidence: ${(result.prediction.confidence * 100).toFixed(1)}%`);
      console.log(`⚠️  Risk Level: ${result.prediction.riskLevel}`);
      
      console.log('\n📈 All Probabilities:');
      for (const [disease, prob] of Object.entries(result.prediction.probabilities)) {
        console.log(`   ${disease.padEnd(20)}: ${(prob * 100).toFixed(1)}%`);
      }
      
      console.log('\n📊 Domain Scores:');
      for (const [domain, score] of Object.entries(result.domainScores)) {
        console.log(`   ${domain.padEnd(20)}: ${score}/10`);
      }
      
      console.log('\n' + '='.repeat(60));

      // Step 4: Retrieve assessment history
      console.log('\n📚 STEP 3: Retrieving Assessment History...\n');
      
      const historyResponse = await axios.get(
        `${NODE_API_URL}/api/clinical/history/${TEST_USER_ID}`
      );

      if (historyResponse.data.success) {
        console.log(`   ✅ Found ${historyResponse.data.data.length} assessment(s)`);
        console.log(`   📊 Total: ${historyResponse.data.pagination.total}`);
      }

      // Step 5: Get specific assessment details
      console.log('\n🔍 STEP 4: Retrieving Assessment Details...\n');
      
      const detailsResponse = await axios.get(
        `${NODE_API_URL}/api/clinical/assessment/${result.historyId}`
      );

      if (detailsResponse.data.success) {
        const assessment = detailsResponse.data.data;
        console.log('   ✅ Assessment Details Retrieved');
        console.log(`   📅 Date: ${new Date(assessment.createdAt).toLocaleString()}`);
        console.log(`   🧠 Disease: ${assessment.prediction.disease}`);
        console.log(`   📊 Confidence: ${(assessment.prediction.confidence * 100).toFixed(1)}%`);
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL TESTS PASSED!');
      console.log('='.repeat(60) + '\n');

    } else {
      console.log(`   ❌ Assessment Error: ${assessmentResponse.data.error}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure both servers are running:');
      console.log('   - Flask server: http://localhost:5000');
      console.log('   - Node.js server: http://localhost:3000');
    }
  }
}

// Run the test
testClinicalAssessment();
