// test-sections.js - Pure JavaScript test for CRUD operations on 'sections' collection
// Assumes Trailbase backend is running on http://localhost:8080
// Uses pure fetch for HTTP requests
// Schema: sections {id: blob (uuid), name: text, created: int, updated: int}

const BASE_URL = 'http://localhost:4000';

// Helper function to log results
function log( message ) {
  console.log( message );
}

// Helper function to check response
function checkResponse( response, expectedStatus ) {
  if ( response.status !== expectedStatus ) {
    log( `Error: Expected status ${expectedStatus}, got ${response.status}` );
    return false;
  }
  return true;
}

// Helper function to generate UUID string
function generateId() {
  return crypto.randomUUID();
}

async function login() {
  log( 'Logging in...' );
  const response = await fetch( `${BASE_URL}/api/auth/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify( { email: 'admin@localhost', password: 'datamini' } )
  } );
  if ( !checkResponse( response, 200 ) ) return null;
  const result = await response.json();
  log( 'Login successful' );
  return result.auth_token;
}

// Test GET schema
async function testGetSchema( token ) {
  log( 'Testing GET schema...' );
  const response = await fetch( `${BASE_URL}/api/records/v1/sections/schema`, {
    headers: { 'Authorization': `Bearer ${token}` }
  } );
  if ( !checkResponse( response, 200 ) ) return null;
  const result = await response.json();
  log( `Schema: ${JSON.stringify( result )}` );
  return result;
}

// Test CREATE (POST)
async function testCreateSection( token ) {
  log( 'Testing CREATE section...' );
  const data = { id: generateId(), name: 'Test Section', created: Math.floor( Date.now() / 1000 ), updated: Math.floor( Date.now() / 1000 ) };
  const response = await fetch( `${BASE_URL}/api/records/v1/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify( data )
  } );
  console.log( response );
  if ( response.status !== 200 ) {
    const errorText = await response.text();
    log( `Error response body: ${errorText}` );
  }
  if ( !checkResponse( response, 200 ) ) return null;
  const result = await response.json();
  log( `Created section: ${JSON.stringify( result )}` );
  return result.ids[ 0 ]; // ID from response
}

// Test LIST (GET all)
async function testListSections( token ) {
  log( 'Testing LIST sections...' );
  const response = await fetch( `${BASE_URL}/api/records/v1/sections`, {
    headers: { 'Authorization': `Bearer ${token}` }
  } );
  if ( !checkResponse( response, 200 ) ) return null;
  const result = await response.json();
  log( `Sections list: ${JSON.stringify( result )}` );
  return result;
}

// Test READ (GET by ID)
async function testReadSection( token, id ) {
  log( `Testing READ section by ID: ${id}` );
  const response = await fetch( `${BASE_URL}/api/records/v1/sections/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  } );
  if ( !checkResponse( response, 200 ) ) return null;
  const result = await response.json();
  log( `Section: ${JSON.stringify( result )}` );
  return result;
}

// Test UPDATE (PATCH)
async function testUpdateSection( token, id ) {
  log( `\nTesting UPDATE section ID: ${id}` );
  const data = { name: 'Updated Test Section' };
  const response = await fetch( `${BASE_URL}/api/records/v1/sections/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify( data )
  } );
  console.log( "\n" )
  console.log( response.text() )
  if ( response.status !== 200 ) {
    const errorText = await response.text();
    log( `Update error: ${errorText}` );
  }
  if ( !checkResponse( response, 200 ) ) return null;
  log( 'Section updated successfully' );
  return true;
}

// Test DELETE
async function testDeleteSection( token, id ) {
  log( `Testing DELETE section ID: ${id}` );
  const response = await fetch( `${BASE_URL}/api/records/v1/sections/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  } );
  if ( !checkResponse( response, 200 ) ) return false;
  log( 'Section deleted successfully' );
  return true;
}

// Run all tests
async function runTests() {
  log( 'Starting CRUD tests for sections...' );

  // Login
  const token = await login();
  if ( !token ) {
    log( 'Login failed, aborting tests' );
    return;
  }

  // Get schema
  const schema = await testGetSchema( token );
  if ( !schema ) {
    log( 'Schema not found, aborting' );
    return;
  }

  // Create
  const id = await testCreateSection( token );
  if ( !id ) {
    log( 'Create failed, aborting' );
    return;
  }

  // List
  await testListSections( token );

  // Read
  await testReadSection( token, id );

  // Update
  await testUpdateSection( token, id );

  // Read again
  await testReadSection( token, id );

  // Delete
  await testDeleteSection( token, id );

  // List again
  await testListSections( token );

  log( 'Tests completed.' );
}

// Run the tests
runTests().catch( err => log( 'Test error:', err ) );