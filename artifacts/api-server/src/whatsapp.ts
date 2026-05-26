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

    /**
     * Sends a welcome message to a newly registered patient.
     */
    async sendWelcomeMessage(phone: string, patientName: string) {
        const message =
            `Welcome to Saivie! 🌸\n\n` +
            `Hi ${patientName}, your registration is complete. ` +
            `We're here to support your reproductive health journey every step of the way.\n\n` +
            `Reply HELP for assistance or visit us at your scheduled appointment. See you soon! 💜`;
        return this.sendTextMessage(phone, message);
    }

    /**
     * Sends an appointment confirmation message.
     */
    async sendAppointmentConfirmation(
        phone: string,
        patientName: string,
        date: string,
        time: string,
        visitMode: string = "in-clinic",
        telemedicineLink?: string | null,
    ) {
        const modeLabel =
            visitMode === "telemedicine" ? "Video Consultation" :
            visitMode === "home-visit" ? "Home Visit" :
            "In-Clinic Visit";

        let message =
            `✅ *Appointment Confirmed – Saivie Clinic*\n\n` +
            `Hi ${patientName},\n` +
            `Your appointment has been scheduled.\n\n` +
            `📅 Date: ${date}\n` +
            `🕐 Time: ${time}\n` +
            `📍 Type: ${modeLabel}\n`;

        if (visitMode === "telemedicine" && telemedicineLink) {
            message += `\n🔗 Join your video consultation:\n${telemedicineLink}\n`;
        }

        message += `\nReply *CONFIRM* to confirm or *CANCEL* to cancel your appointment.\n\n_Saivie Reproductive Intelligence_`;
        return this.sendTextMessage(phone, message);
    }

    /**
     * Sends a reminder 24 hours before the appointment.
     */
    async sendReminder24h(
        phone: string,
        patientName: string,
        date: string,
        time: string,
        visitMode: string = "in-clinic",
        telemedicineLink?: string | null,
    ) {
        const modeLabel =
            visitMode === "telemedicine" ? "video consultation" :
            visitMode === "home-visit" ? "home visit" :
            "in-clinic appointment";

        let message =
            `⏰ *Reminder – Saivie Clinic*\n\n` +
            `Hi ${patientName}, this is a reminder that you have a ${modeLabel} *tomorrow*.\n\n` +
            `📅 ${date} at ${time}\n`;

        if (visitMode === "home-visit") {
            message += `\nOur team will visit you at your registered address. Please ensure someone is available.\n`;
        } else if (visitMode === "telemedicine" && telemedicineLink) {
            message += `\n🔗 Your video link:\n${telemedicineLink}\n`;
        } else {
            message += `\nPlease arrive 10 minutes early to complete any paperwork.\n`;
        }

        message += `\nReply *CONFIRM* or *CANCEL*.\n\n_Saivie Reproductive Intelligence_`;
        return this.sendTextMessage(phone, message);
    }

    /**
     * Sends a reminder 1 hour before the appointment.
     */
    async sendReminder1h(
        phone: string,
        patientName: string,
        time: string,
        visitMode: string = "in-clinic",
        telemedicineLink?: string | null,
    ) {
        const modeLabel =
            visitMode === "telemedicine" ? "video consultation" :
            visitMode === "home-visit" ? "home visit" :
            "appointment";

        let message =
            `🔔 *Starting in 1 Hour – Saivie Clinic*\n\n` +
            `Hi ${patientName}, your ${modeLabel} begins in *1 hour* at ${time}.\n`;

        if (visitMode === "telemedicine" && telemedicineLink) {
            message += `\n🔗 Join here:\n${telemedicineLink}\n`;
        } else if (visitMode === "home-visit") {
            message += `\nOur team is on the way!\n`;
        }

        message += `\n_Saivie Reproductive Intelligence_`;
        return this.sendTextMessage(phone, message);
    }

    public formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/[\s\-\(\)]/g, "");
        if (!cleaned.startsWith("+") && cleaned.length === 10) {
            cleaned = "91" + cleaned;
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

            const data = await response.json() as { error?: { message?: string } };
            if (!response.ok) {
                console.error("WhatsApp API error:", data);
                throw new Error(data.error?.message || "Failed to send WhatsApp message");
            }

            console.log("WhatsApp message sent successfully:", data);
            return data;
        } catch (error: any) {
            console.error("WhatsApp integration error:", error.message);
            throw error;
        }
    }
}

export const whatsapp = new WhatsAppService();
