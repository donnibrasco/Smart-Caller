const twilio = require('twilio');

class TwilioController {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  // Get all phone numbers from Twilio account
  async listPhoneNumbers(req, res) {
    try {
      const incomingPhoneNumbers = await this.client.incomingPhoneNumbers.list({ limit: 50 });
      
      const numbers = incomingPhoneNumbers.map(number => ({
        id: number.sid,
        number: number.phoneNumber,
        label: number.friendlyName || number.phoneNumber,
        region: number.region || 'Unknown',
        capabilities: number.capabilities
      }));

      res.json({
        success: true,
        numbers
      });
    } catch (error) {
      console.error('Error fetching Twilio phone numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch phone numbers from Twilio',
        error: error.message
      });
    }
  }
}

module.exports = new TwilioController();
