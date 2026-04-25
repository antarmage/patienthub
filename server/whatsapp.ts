export interface WhatsAppMessageOptions {
    to: string;
    template?: string;
    language?: string;
    components?: any[];
    text?: string;
}

export class WhatsAppService {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly phoneNumberId: string;
    private readonly version: string;

    constructor() {
        this.token = process.env.WHATSAPP_API_TOKEN || "";
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
        this.version = process.env.WHATSAPP_VERSION || "v21.0";
        this.baseUrl = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`;
    }

    get isConfigured(): boolean {
        return !!(this.token && this.phoneNumberId);
    }

    /**
     * Sends a text message.
     * Note: This works only if the patient has sent a message within the last 24 hours.
     */
    async sendTextMessage(to: string, text: string) {
        if (!this.isConfigured) {
            console.log("------------------------------------------");
            console.log("🟡 WHATSAPP SIMULATION (MOCK MODE)");
            console.log(`To: ${to}`);
            console.log(`Message: ${text}`);
            console.log("🟡 Config required: WHATSAPP_API_TOKEN & WHATSAPP_PHONE_NUMBER_ID");
            console.log("------------------------------------------");
            return { success: "SIMULATED", message: "Mock message logged to console" };
        }

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.formatPhoneNumber(to),
            type: "text",
            text: { body: text },
        };

        return this.sendRequest(payload);
    }

    /**
     * Sends a template message.
     * Required for initiating conversations with patients.
     */
    async sendTemplateMessage(to: string, templateName: string, components: any[] = [], language = "en_US") {
        if (!this.isConfigured) {
            console.warn("WhatsApp API is not configured. Message not sent.");
            return;
        }

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.formatPhoneNumber(to),
            type: "template",
            template: {
                name: templateName,
                language: { code: language },
                components: components,
            },
        };

        return this.sendRequest(payload);
    }

    private formatPhoneNumber(phone: string): string {
        // Basic format: ensure it starts with country code and has no spaces/dashes
        let cleaned = phone.replace(/[\s\-\(\)]/g, "");
        if (!cleaned.startsWith("+") && cleaned.length === 10) {
            cleaned = "91" + cleaned; // Default to India if only 10 digits
        } else {
            cleaned = cleaned.replace("+", "");
        }
        return cleaned;
    }

    private async sendRequest(payload: any) {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                console.error("WhatsApp API error:", data);
                throw new Error(data.error?.message || "Failed to send WhatsApp message");
            }

            console.log(`WhatsApp message sent to ${payload.to}:`, data);
            return data;
        } catch (error: any) {
            console.error("WhatsApp integration error:", error.message);
            throw error;
        }
    }
}

export const whatsapp = new WhatsAppService();
