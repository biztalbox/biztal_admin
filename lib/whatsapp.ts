import axios from 'axios';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://backend.aisensy.com/campaign/t1/api/v2';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const WHATSAPP_CAMPAIGN_ID = process.env.WHATSAPP_CAMPAIGN_ID || '';
const WHATSAPP_USER_NAME = process.env.WHATSAPP_USER_NAME || 'Biztalbox';
const WHATSAPP_SOURCE = process.env.WHATSAPP_SOURCE || 'new-landing-page form';
const WHATSAPP_MEDIA_URL = process.env.WHATSAPP_MEDIA_URL || '';
const WHATSAPP_MEDIA_FILENAME = process.env.WHATSAPP_MEDIA_FILENAME || 'biztalbox_logo.png';

export interface WhatsAppOptions {
  templateParams?: string[];
  media?: {
    url: string;
    filename: string;
  };
  tags?: string[];
  attributes?: Record<string, string>;
  source?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  response?: any;
  messageId?: string;
  httpCode?: number;
}

function formatPhoneNumber(phone: string): string {
  // Clean the phone number (keep only digits and +)
  let cleaned = phone.replace(/[^0-9+]/g, '');
  
  // Handle phone number formatting
  let numberOnly: string;
  if (cleaned.startsWith('+')) {
    numberOnly = cleaned.substring(1);
  } else {
    numberOnly = cleaned;
  }
  
  // Remove leading 91 if present (to avoid double country code)
  if (numberOnly.length > 10 && numberOnly.startsWith('91')) {
    numberOnly = numberOnly.substring(2);
  }
  
  // If it's a 10-digit number (likely Indian), add +91
  if (numberOnly.length === 10) {
    return `+91${numberOnly}`;
  } else if (numberOnly.length > 10) {
    // Has country code but no +, add +
    return `+${numberOnly}`;
  } else {
    // Less than 10 digits - assume it needs country code
    // Default to India (+91) as per API docs
    return `+91${numberOnly}`;
  }
}

export async function sendWhatsApp(
  to: string,
  message: string,
  options: WhatsAppOptions = {}
): Promise<WhatsAppResponse> {
  if (!WHATSAPP_API_KEY || !WHATSAPP_CAMPAIGN_ID) {
    return {
      success: false,
      message: 'WhatsApp API not configured',
    };
  }

  try {
    const formattedPhone = formatPhoneNumber(to);

    // Build data array according to Aisensy API documentation
    const data: any = {
      apiKey: WHATSAPP_API_KEY,
      campaignName: WHATSAPP_CAMPAIGN_ID,
      destination: formattedPhone,
      userName: WHATSAPP_USER_NAME,
    };

    // Optional: source
    if (options.source || WHATSAPP_SOURCE) {
      data.source = options.source || WHATSAPP_SOURCE;
    }

    // Optional: media
    let mediaUrl = options.media?.url || WHATSAPP_MEDIA_URL;
    const mediaFilename = options.media?.filename || WHATSAPP_MEDIA_FILENAME;

    if (mediaUrl) {
      data.media = {
        url: mediaUrl,
        filename: mediaFilename,
      };
    }

    // Handle message - use as templateParams if provided
    if (message) {
      if (!options.templateParams) {
        data.templateParams = [message];
      }
      // Also try adding message field directly (experimental)
      data.message = message;
    }

    // Optional: templateParams
    if (options.templateParams && options.templateParams.length > 0) {
      data.templateParams = options.templateParams;
    }

    // Optional: tags
    if (options.tags && options.tags.length > 0) {
      data.tags = options.tags;
    }

    // Optional: attributes
    if (options.attributes && Object.keys(options.attributes).length > 0) {
      data.attributes = options.attributes;
    }

    console.log('WhatsApp API Request:', {
      ...data,
      apiKey: data.apiKey.substring(0, 20) + '...',
    });

    const response = await axios.post(WHATSAPP_API_URL, data, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    const httpCode = response.status;
    const result = response.data;

    console.log('WhatsApp API Response (HTTP ' + httpCode + '):', result);

    // Check for success conditions
    let isSuccess = false;

    if (httpCode === 200 || httpCode === 201) {
      if (
        result.status &&
        (result.status.toLowerCase() === 'success' || result.status === 'SUCCESS')
      ) {
        isSuccess = true;
      } else if (result.messageId || result.message_id) {
        isSuccess = true;
      } else if (result.success === true || result.success === 'true' || result.success === 1) {
        isSuccess = true;
      } else if (
        result.data &&
        result.data.status &&
        result.data.status.toLowerCase() === 'success'
      ) {
        isSuccess = true;
      } else if (result.data && (result.data.messageId || result.data.message_id)) {
        isSuccess = true;
      } else if (result.id || result.campaign_id || result.campaignId) {
        isSuccess = true;
      } else if (!result.error && !result.errorMessage && !result.message) {
        isSuccess = true;
      }
    }

    if (isSuccess) {
      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        response: result,
        messageId: result.messageId || result.message_id || result.data?.messageId || result.data?.message_id || null,
      };
    } else {
      // Extract error message
      let errorMsg = 'Unknown error';
      if (result.message) {
        errorMsg = result.message;
      } else if (result.error) {
        errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      } else if (result.data?.message) {
        errorMsg = result.data.message;
      } else if (result.data?.error) {
        errorMsg = typeof result.data.error === 'string' ? result.data.error : JSON.stringify(result.data.error);
      } else if (result.errorMessage) {
        errorMsg = result.errorMessage;
      } else if (result.error_message) {
        errorMsg = result.error_message;
      } else if (httpCode !== 200 && httpCode !== 201) {
        errorMsg = `HTTP ${httpCode}: ${JSON.stringify(result)}`;
      }

      console.error('WhatsApp API error:', errorMsg, '| Full response:', result);
      return {
        success: false,
        message: `Failed to send WhatsApp message: ${errorMsg}`,
        response: result,
        httpCode,
      };
    }
  } catch (error: any) {
    console.error('WhatsApp error:', error.message);
    return {
      success: false,
      message: `Failed to send WhatsApp message: ${error.message || 'Unknown error'}`,
    };
  }
}

export async function sendWelcomeMessage(phone: string, clientName: string): Promise<WhatsAppResponse> {
  const appName = process.env.APP_NAME || 'Admin Panel';
  const message = `🎉 Welcome to ${appName}!\n\nDear ${clientName},\n\nYour account has been successfully created. We're excited to have you on board!\n\nOur team is here to support you every step of the way.\n\nIf you have any questions, feel free to reach out to us.\n\nBest regards,\n${appName} Team`;

  return sendWhatsApp(phone, message);
}

export async function sendPaymentReminder(
  phone: string,
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  daysOverdue?: number
): Promise<WhatsAppResponse> {
  let message = `🔔 Payment Reminder\n\nDear ${clientName},\n\nThis is a friendly reminder that your invoice #${invoiceNumber} is pending payment.\n\nInvoice Details:\nAmount: ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nDue Date: ${dueDate}`;
  
  if (daysOverdue && daysOverdue > 0) {
    message += `\nDays Overdue: ${daysOverdue}`;
  }
  
  message += `\n\nPlease make the payment at your earliest convenience.\n\nThank you!`;

  return sendWhatsApp(phone, message);
}

