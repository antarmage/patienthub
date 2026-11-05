import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VaccinationSeal } from "./HpvBadge";
import { HPV_BADGE_COPY, hpvVaccinationStatus, type HpvProtection, type HpvVaccinationStatus } from "@/lib/hpvProtection";

const copy: Record<HpvVaccinationStatus, { label: string; message: string }> = {
    ...HPV_BADGE_COPY,
    "not-vaccinated": { label: "HPV not vaccinated", message: "Patient reports no HPV vaccination. Discuss vaccination with the care team." },
    unknown: { label: "HPV vaccination unknown", message: "Patient is unsure of their HPV vaccination status." },
    "not-recorded": { label: "HPV vaccination not recorded", message: "No vaccination answer or clinic dose status is available." },
};

export function HpvPrintBadge({ status }: { status: HpvVaccinationStatus }) {
    const positive = status === "protected" || status === "in-progress";
    return <div data-testid={`hpv-print-badge-${status}`} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", margin: "0 0 16px",
        border: "1px solid #9aafa8", borderRadius: 12, breakInside: "avoid",
        background: status === "protected" ? "#CFE2DC" : status === "in-progress" ? "#E5C4DB" : "#FFFFFC",
        color: "#55344F", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
    }}>
        {positive && <VaccinationSeal complete={status === "protected"} style={{ width: 64, height: 64, flexShrink: 0 }} />}
        <div>
            <strong style={{ display: "block", fontSize: 14 }}>{copy[status].label}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 11 }}>{copy[status].message}</span>
        </div>
    </div>;
}

export function hpvPrintBadgeHtml(surveyAnswer?: string | null, clinicStatus?: HpvProtection | null): string {
    return renderToStaticMarkup(<HpvPrintBadge status={hpvVaccinationStatus(surveyAnswer, clinicStatus)} />);
}

export function CervicalCancerPrevention({ status }: { status: HpvVaccinationStatus }) {
    if (status === "protected") return null;
    const vaccination = status === "not-vaccinated"
        ? "Patient reports no HPV vaccination. Without vaccination, protection against vaccine-covered HPV types is missing."
        : status === "in-progress"
            ? "HPV vaccination has started, but completion is not documented. Ask the care team to review previous doses and complete the appropriate schedule."
            : "HPV vaccination status is unknown or not recorded. Check vaccination records before deciding whether vaccination is needed; missing information does not mean unvaccinated.";
    return <section data-testid={`cervical-cancer-prevention-${status}`} style={{
        marginTop: 20, marginBottom: 16, padding: "12px 16px", border: "1px solid #9aafa8",
        borderRadius: 12, color: "#55344F", fontSize: 12, lineHeight: 1.5, breakInside: "avoid",
    }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Cervical cancer prevention: risk and options</h2>
        <p>{vaccination}</p>
        <p>Persistent infection with high-risk HPV causes almost all cervical cancers. Most HPV infections clear naturally. Not being vaccinated does not mean you have HPV or cancer, and vaccination status alone cannot determine your personal cancer risk.</p>
        <ul style={{ paddingLeft: 20 }}>
            <li><strong>Vaccination:</strong> Discuss starting or completing an HPV vaccine course. Eligibility, vaccine choice and number of doses depend on age, earlier doses, immune status, local guidance and availability. Vaccines prevent new infections; they do not treat existing HPV or cervical disease. HPV vaccination is deferred during pregnancy; discuss starting or resuming after pregnancy.</li>
            <li><strong>Cervical screening:</strong> Ask whether HPV testing, a Pap smear or visual inspection with acetic acid (VIA) is appropriate and available. Starting age and intervals depend on local guidance, prior results and health history. Screening is still needed after vaccination.</li>
            <li><strong>Follow-up:</strong> An abnormal screening result is not a cancer diagnosis. Follow the recommended repeat testing, colposcopy or biopsy; confirmed precancerous changes can often be treated before cancer develops.</li>
            <li><strong>Other prevention:</strong> Avoid tobacco. Condoms reduce, but do not eliminate, HPV transmission.</li>
        </ul>
        <p>Seek prompt medical assessment for bleeding after sex, between periods or after menopause, unusual persistent discharge or persistent pelvic pain. Symptoms need assessment rather than waiting for routine screening.</p>
        <p style={{ fontSize: 10 }}>General education, not a diagnosis or individual risk score. Discuss a personal plan with your clinician. Sources: <a href="https://www.who.int/news-room/fact-sheets/detail/cervical-cancer">WHO: cervical cancer</a>; <a href="https://www.cdc.gov/hpv/hcp/vaccination-considerations/">CDC: HPV vaccination considerations</a>.</p>
    </section>;
}

export function cervicalCancerPreventionHtml(surveyAnswer?: string | null, clinicStatus?: HpvProtection | null): string {
    return renderToStaticMarkup(<CervicalCancerPrevention status={hpvVaccinationStatus(surveyAnswer, clinicStatus)} />);
}
