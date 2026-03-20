const { Webhook } = require('svix');
const userService = require('../services/userService');

class WebhookController {
  /**
   * @route POST /api/webhooks/clerk
   * @desc Handle Clerk webhooks
   */
  async handleClerkWebhook(req, res) {
    try {
      console.log('🔔 Clerk Webhook received');
      
      const payload = req.body;
      const headers = req.headers;

      const svix_id = headers["svix-id"];
      const svix_timestamp = headers["svix-timestamp"];
      const svix_signature = headers["svix-signature"];

      if (!svix_id || !svix_timestamp || !svix_signature) {
        console.log('❌ Missing svix headers');
        return res.status(400).json({
          success: false,
          message: 'Error occurred -- no svix headers'
        });
      }

      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('❌ Missing CLERK_WEBHOOK_SECRET');
        return res.status(500).json({ 
          success: false, 
          message: 'Server misconfiguration' 
        });
      }

      // Verify webhook signature
      const wh = new Webhook(webhookSecret);
      let evt;

      try {
        evt = wh.verify(payload, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      } catch (err) {
        console.log('❌ Webhook verification failed:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      // Handle the event
      const eventType = evt.type;
      const data = evt.data;

      console.log(`✅ Webhook Verified. Event: ${eventType}, User ID: ${data.id}`);

      switch (eventType) {
        case 'user.created':
        case 'user.updated':
          await userService.createOrUpdateUser({
            clerkId: data.id,
            email: data.email_addresses[0]?.email_address,
            firstName: data.first_name,
            lastName: data.last_name,
            profileImageUrl: data.image_url || data.profile_image_url,
          });
          console.log(`✅ User ${eventType === 'user.created' ? 'created' : 'updated'} via webhook`);
          break;

        case 'user.deleted':
          await userService.deleteUser(data.id);
          console.log('✅ User deleted via webhook');
          break;

        default:
          console.log('ℹ️ Unhandled webhook type:', eventType);
      }

      res.json({ success: true, message: 'Webhook received' });

    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new WebhookController();
