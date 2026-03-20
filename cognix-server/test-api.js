/**
 * Quick Test Script for Backend API
 * Run this to verify MongoDB connection and API endpoints
 */

const BACKEND_URL = "http://172.18.16.1:3000";

async function testBackend() {
  console.log("🧪 Testing Backend API...\n");

  // Test 1: Health Check
  try {
    console.log("1️⃣ Testing Health Check...");
    const response = await fetch(`${BACKEND_URL}/`);
    const data = await response.json();
    console.log("✅ Health Check:", data);
    console.log("");
  } catch (error) {
    console.error("❌ Health Check Failed:", error.message);
    console.log("");
  }

  // Test 2: Create Test User
  try {
    console.log("2️⃣ Testing User Creation...");
    const testUser = {
      clerkId: "test_user_" + Date.now(),
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      profileImageUrl: "https://example.com/image.jpg"
    };

    const response = await fetch(`${BACKEND_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();
    console.log("✅ User Creation:", data);
    console.log("");

    // Test 3: Get User
    if (data.success) {
      console.log("3️⃣ Testing Get User...");
      const getResponse = await fetch(
        `${BACKEND_URL}/api/users/${testUser.clerkId}`
      );
      const userData = await getResponse.json();
      console.log("✅ Get User:", userData);
      console.log("");
    }
  } catch (error) {
    console.error("❌ User Operations Failed:", error.message);
    console.log("");
  }

  console.log("🎉 Backend API Test Complete!");
}

// Run the test
testBackend();
