const twilio = require('twilio');
const { Call, User } = require('./src/models');

const client = twilio(
  process.env.SIGNALWIRE_PROJECT_ID,
  process.env.SIGNALWIRE_API_TOKEN,
  { signalwireSpaceUrl: `https://${process.env.SIGNALWIRE_SPACE_URL}` }
);

(async () => {
  try {
    const users = await User.findAll();
    const userMap = {};
    users.forEach(user => {
      userMap[`client:${user.email}`] = user.id;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const calls = await client.calls.list({
      startTimeAfter: thirtyDaysAgo,
      limit: 100
    });

    console.log(`Found ${calls.length} calls from SignalWire`);

    let imported = 0;

    for (const twilioCall of calls) {
      const existing = await Call.findOne({ where: { twilioSid: twilioCall.sid } });
      if (existing) continue;

      let userId = null;
      if (twilioCall.from.startsWith('client:')) {
        userId = userMap[twilioCall.from];
      }
      if (!userId && users.length > 0) {
        userId = users[0].id;
      }
      if (!userId) continue;

      await Call.create({
        userId,
        twilioSid: twilioCall.sid,
        to: twilioCall.to || 'Unknown',
        from: twilioCall.from || process.env.SIGNALWIRE_PHONE_NUMBER,
        contactName: twilioCall.to || 'Unknown',
        direction: twilioCall.direction === 'inbound' ? 'inbound' : 'outbound',
        status: twilioCall.status,
        duration: twilioCall.duration || 0,
        createdAt: twilioCall.startTime,
        updatedAt: twilioCall.endTime || twilioCall.startTime
      });

      imported++;
    }

    console.log(`Imported ${imported} calls`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();
