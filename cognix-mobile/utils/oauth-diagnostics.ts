/**
 * OAuth Diagnostics Utility
 * 
 * This utility helps diagnose OAuth flow issues by logging detailed information
 * about the OAuth response from Clerk.
 */

export interface OAuthFlowResult {
  createdSessionId: string | null;
  signIn?: {
    createdSessionId?: string;
    status?: string;
  };
  signUp?: {
    createdSessionId?: string;
    status?: string;
  };
  setActive?: (params: { session: string }) => Promise<void>;
}

export function logOAuthResult(result: OAuthFlowResult, context: 'sign-in' | 'sign-up') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 OAuth Diagnostics - ${context.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log('\n🔍 Top-level Session:');
  console.log(`   createdSessionId: ${result.createdSessionId || 'null'}`);
  
  console.log('\n🔍 SignIn Object:');
  if (result.signIn) {
    console.log(`   exists: true`);
    console.log(`   createdSessionId: ${result.signIn.createdSessionId || 'null'}`);
    console.log(`   status: ${result.signIn.status || 'null'}`);
  } else {
    console.log(`   exists: false`);
  }
  
  console.log('\n🔍 SignUp Object:');
  if (result.signUp) {
    console.log(`   exists: true`);
    console.log(`   createdSessionId: ${result.signUp.createdSessionId || 'null'}`);
    console.log(`   status: ${result.signUp.status || 'null'}`);
  } else {
    console.log(`   exists: false`);
  }
  
  console.log('\n🔍 SetActive Function:');
  console.log(`   exists: ${!!result.setActive}`);
  
  console.log(`\n${'='.repeat(60)}\n`);
}

export function getSessionId(result: OAuthFlowResult): string | null {
  // Check all possible locations for session ID
  if (result.createdSessionId) {
    console.log('✅ Found session ID at top level');
    return result.createdSessionId;
  }
  
  if (result.signUp?.createdSessionId) {
    console.log('✅ Found session ID in signUp object');
    return result.signUp.createdSessionId;
  }
  
  if (result.signIn?.createdSessionId) {
    console.log('✅ Found session ID in signIn object');
    return result.signIn.createdSessionId;
  }
  
  console.log('❌ No session ID found in OAuth result');
  return null;
}

export function diagnoseOAuthFailure(result: OAuthFlowResult): string {
  if (!result.createdSessionId && !result.signIn && !result.signUp) {
    return 'User likely cancelled the OAuth flow';
  }
  
  if (result.signUp?.status === 'missing_requirements') {
    return 'OAuth sign-up requires additional information';
  }
  
  if (result.signIn?.status === 'needs_first_factor') {
    return 'OAuth sign-in requires additional authentication';
  }
  
  return 'Unknown OAuth failure - check Clerk configuration';
}
