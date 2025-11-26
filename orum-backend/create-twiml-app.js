// Script to create SignalWire TwiML Application for browser calling
const { RestClient } = require('@signalwire/compatibility-api');

const projectId = process.env.SIGNALWIRE_PROJECT_ID;
const authToken = process.env.SIGNALWIRE_API_TOKEN;
const spaceUrl = process.env.SIGNALWIRE_SPACE_URL;
const backendUrl = process.env.BACKEND_URL;

const client = new RestClient(projectId, authToken, { signalwireSpaceUrl: spaceUrl });

async function createTwiMLApp() {
  try {
    console.log('Creating TwiML Application for browser calling...');
    
    const application = await client.applications.create({
      friendlyName: 'Smart Caller Browser App',
      voiceUrl: `${backendUrl}/api/calls/make`,
      voiceMethod: 'POST',
      statusCallback: `${backendUrl}/api/webhooks/call-status`,
      statusCallbackMethod: 'POST'
    });

    console.log('\n✅ TwiML Application created successfully!');
    console.log('Application SID:', application.sid);
    console.log('\nAdd this to your .env file:');
    console.log(`SIGNALWIRE_APP_SID=${application.sid}`);
    
    return application.sid;
  } catch (error) {
    console.error('Error creating TwiML app:', error);
    throw error;
  }
}

createTwiMLApp();
