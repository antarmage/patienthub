export const consultationDirectionsByPath: Record<string, string[]> = {
    "Fertility evaluation": ["Ovulatory timing", "Tubal or uterine factors", "Partner evaluation"],
    "Menstrual concern": ["Cycle pattern and timing", "Bleeding impact", "Hormonal or structural context"],
    "Pelvic pain": ["Pain timing and pattern", "Pregnancy or infection safety screen", "Relevant pelvic history"],
    "Vaginal discharge or infection": ["Discharge pattern and duration", "Exposure and infection risk", "Previous treatment response"],
    "Pregnancy-related concern": ["Gestational timing", "Maternal symptoms", "Fetal wellbeing"],
    "Menopause": ["Vasomotor or genitourinary symptoms", "Bleeding after menopause", "Bone and cardiometabolic context"],
    "Routine gynecology": ["Preventive care due", "Current symptoms", "Screening and contraception"],
    "Other": ["Symptom timeline", "Related symptoms", "Relevant medical history"],
};

export const guidedQuestionsByDirection: Record<string, string[]> = {
    "Ovulatory timing": ["What is the average cycle length?", "Has ovulation been confirmed previously?", "Are cycles regular?", "Have follicular scans or ovulation medicines been used?"],
    "Tubal or uterine factors": ["Any history of pelvic infection or surgery?", "Has an ultrasound or tubal assessment been done?", "Any prior pregnancy or procedure?", "What findings need review?"],
    "Partner evaluation": ["Has partner evaluation been discussed?", "Any relevant partner history?", "Are semen analysis results available?", "What would the patient like help understanding?"],
    "Cycle pattern and timing": ["When was the last menstrual period?", "How long are cycles typically?", "How many days does bleeding last?", "Has the pattern changed recently?"],
    "Bleeding impact": ["How heavy is the bleeding?", "Is there bleeding between periods?", "Any dizziness, fatigue, or impact on daily activities?", "What treatments have been tried?"],
    "Hormonal or structural context": ["Any known thyroid or hormonal condition?", "Any relevant medication changes?", "Has pelvic imaging been done?", "Any previous related diagnosis?"],
    "Pain timing and pattern": ["When did the pain begin?", "Where is it located and how severe is it?", "Is it related to the cycle or activity?", "What makes it better or worse?"],
    "Pregnancy or infection safety screen": ["Could the patient be pregnant?", "Any fever, fainting, or sudden severe pain?", "Any urinary or bowel symptoms?", "Any new discharge or bleeding?"],
    "Relevant pelvic history": ["Any prior pelvic surgery or infection?", "Any history of endometriosis or cysts?", "What investigations are available?", "What previous treatments were tried?"],
    "Discharge pattern and duration": ["When did the discharge start?", "What are the color, consistency, and odor?", "Any itching, irritation, or pain?", "Any associated bleeding or urinary symptoms?"],
    "Exposure and infection risk": ["Any recent new sexual partner?", "Any known exposure or partner symptoms?", "Any recent antibiotics or treatment?", "Are there relevant test results to review?"],
    "Previous treatment response": ["What treatment was used?", "When was it started and completed?", "Did symptoms improve or return?", "Were there side effects?"],
    "Gestational timing": ["What is the last menstrual period or estimated gestational age?", "Has antenatal care started?", "Any recent scan or laboratory results?", "What is the main concern today?"],
    "Maternal symptoms": ["Any pain, bleeding, fluid loss, or fever?", "Any headache, vision change, or swelling?", "Any change in fetal movement when applicable?", "When did symptoms begin?"],
    "Fetal wellbeing": ["Are fetal movements as expected for gestation?", "What were the latest growth or wellbeing findings?", "Any prior pregnancy complications?", "What follow-up has already been arranged?"],
    "Vasomotor or genitourinary symptoms": ["Which symptoms are most bothersome?", "How often do they occur?", "How are sleep or daily activities affected?", "What treatments have been tried?"],
    "Bleeding after menopause": ["When was the last menstrual period?", "Has there been any bleeding since?", "How much and for how long?", "What evaluation has already been completed?"],
    "Bone and cardiometabolic context": ["Any history of fracture or low bone density?", "Any cardiovascular risk factors?", "What screening is current?", "Any relevant medicines or supplements?"],
    "Preventive care due": ["When was the last cervical screening?", "Are vaccines or routine screenings due?", "Any family history relevant to screening?", "What preventive care does the patient want to discuss?"],
    "Current symptoms": ["What symptoms, if any, are present today?", "When did they start?", "What affects them?", "What is the patient most concerned about?"],
    "Screening and contraception": ["Is contraception or preconception planning relevant?", "What screening history is available?", "Any preferences or concerns?", "What follow-up is desired?"],
    "Symptom timeline": ["When did the concern begin?", "Is it constant or intermittent?", "Has it changed over time?", "What prompted the visit now?"],
    "Related symptoms": ["What other symptoms occur with it?", "Any urgent or severe symptoms?", "What makes it better or worse?", "What has already been tried?"],
    "Relevant medical history": ["What past conditions may be relevant?", "Any prior procedures or treatment?", "Any medication or allergy concerns?", "What records should be reviewed?"],
};

export const surveyDirectionLabels: Record<string, string> = {
    "Ovulatory timing": "My cycles and ovulation",
    "Tubal or uterine factors": "Previous womb or tube tests and treatment",
    "Partner evaluation": "My partner's fertility history",
    "Cycle pattern and timing": "My period pattern",
    "Bleeding impact": "Heavy bleeding or its effect on daily life",
    "Hormonal or structural context": "Hormone conditions or previous scans",
    "Pain timing and pattern": "When and where I have pain",
    "Pregnancy or infection safety screen": "Pregnancy possibility or infection symptoms",
    "Relevant pelvic history": "Previous pelvic conditions or treatment",
    "Discharge pattern and duration": "Changes in vaginal discharge",
    "Exposure and infection risk": "Possible infection or partner symptoms",
    "Previous treatment response": "How previous treatment worked",
    "Gestational timing": "My pregnancy dates and care so far",
    "Maternal symptoms": "My symptoms during pregnancy",
    "Fetal wellbeing": "My baby's movements and scan results",
    "Vasomotor or genitourinary symptoms": "Hot flushes, dryness or urinary symptoms",
    "Bleeding after menopause": "Bleeding after periods have stopped",
    "Bone and cardiometabolic context": "Bone, heart or metabolic health",
    "Preventive care due": "Routine screening and prevention",
    "Current symptoms": "Symptoms I want to discuss",
    "Screening and contraception": "Screening, contraception or pregnancy planning",
    "Symptom timeline": "When my concern started",
    "Related symptoms": "Other symptoms",
    "Relevant medical history": "My past health and treatments",
};

const concernPaths: Record<string, string> = {
    "Fertility": "Fertility evaluation",
    "Missed or late period": "Menstrual concern",
    "Irregular or heavy bleeding": "Menstrual concern",
    "Abdominal or pelvic pain": "Pelvic pain",
    "Vaginal discharge or infection": "Vaginal discharge or infection",
    "Possible pregnancy": "Pregnancy-related concern",
    "I am pregnant": "Pregnancy-related concern",
    "Pregnancy care": "Pregnancy-related concern",
    "Menopause": "Menopause",
    "Birth control": "Routine gynecology",
    "Routine checkup": "Routine gynecology",
};

export function surveyDirectionsForConcerns(concerns: string[]): string[] {
    const paths = [...new Set(concerns.map((concern) => concernPaths[concern] || "Other"))];
    return [...new Set(paths.flatMap((path) => consultationDirectionsByPath[path]))];
}

export function surveyQuestions(directions: string[]): string[] {
    return [...new Set(directions.flatMap((direction) => guidedQuestionsByDirection[direction] || []))];
}

const patientPrompts: Record<string, string> = {
    "What would the patient like help understanding?": "What would you like help understanding?",
    "Could the patient be pregnant?": "Could you be pregnant?",
    "What is the patient most concerned about?": "What are you most concerned about?",
    "What preventive care does the patient want to discuss?": "What preventive care would you like to discuss?",
    "Are fetal movements as expected for gestation?": "If you already feel your baby move, have the movements changed?",
    "What were the latest growth or wellbeing findings?": "What were you told at your latest pregnancy scan or checkup?",
    "What is the last menstrual period or estimated gestational age?": "When did your last period start, or how many weeks pregnant are you?",
};

export function patientSurveyPrompt(question: string): string {
    return patientPrompts[question] || question;
}

export interface ConsultationSurvey {
    directions: string[];
    answers: Record<string, string>;
}

export function readConsultationSurvey(value: unknown): ConsultationSurvey {
    if (!value || typeof value !== "object" || !("directions" in value) || !("answers" in value)) {
        return { directions: [], answers: {} };
    }
    const directions = Array.isArray(value.directions)
        ? [...new Set(value.directions.filter((item): item is string => typeof item === "string" && Object.hasOwn(guidedQuestionsByDirection, item)))].slice(0, 3)
        : [];
    const questions = new Set(surveyQuestions(directions));
    const answers = value.answers && typeof value.answers === "object"
        ? Object.fromEntries(Object.entries(value.answers).filter(([question, answer]) => questions.has(question) && typeof answer === "string"))
        : {};
    return { directions, answers };
}

export function consultationSurveyForVisit(history: unknown, appointmentId: unknown): ConsultationSurvey {
    if (!history || typeof history !== "object" || !("onboardingAppointmentId" in history)
        || !appointmentId || String(history.onboardingAppointmentId) !== String(appointmentId)
        || !("onboarding" in history) || !history.onboarding || typeof history.onboarding !== "object"
        || !("consultation" in history.onboarding)) return { directions: [], answers: {} };
    return readConsultationSurvey(history.onboarding.consultation);
}

export const consultationPaths = Object.keys(consultationDirectionsByPath);
export const MAX_CONSULTATION_DIRECTIONS = 3;

export function pathsForDirections(directions: string[]): string[] {
    return consultationPaths.filter((path) => consultationDirectionsByPath[path].some((direction) => directions.includes(direction)));
}

/** Doctor edits layered over the patient survey; undefined lists mean "use the survey selection". */
export interface ConsultationSurveyEdits {
    paths?: string[];
    directions?: string[];
    answers: Record<string, string>;
}

export interface EffectiveConsultationSurvey {
    paths: string[];
    directions: string[];
    answers: Record<string, string>;
    fromPatient: (question: string) => boolean;
}

export function effectiveConsultationSurvey(survey: ConsultationSurvey, edits: ConsultationSurveyEdits): EffectiveConsultationSurvey {
    const directions = edits.directions ?? survey.directions;
    const paths = edits.paths ?? pathsForDirections(survey.directions);
    const answers = { ...survey.answers, ...edits.answers };
    return {
        paths,
        directions,
        answers,
        fromPatient: (question) => Boolean(survey.answers[question]?.trim()) && answers[question] === survey.answers[question],
    };
}

export function toggleConsultationPath(current: EffectiveConsultationSurvey, edits: ConsultationSurveyEdits, path: string): ConsultationSurveyEdits {
    if (!current.paths.includes(path)) return { ...edits, paths: [...current.paths, path], directions: current.directions };
    const paths = current.paths.filter((item) => item !== path);
    const kept = new Set(paths.flatMap((item) => consultationDirectionsByPath[item] || []));
    return { ...edits, paths, directions: current.directions.filter((direction) => kept.has(direction)) };
}

export function toggleConsultationDirection(current: EffectiveConsultationSurvey, edits: ConsultationSurveyEdits, direction: string): ConsultationSurveyEdits {
    const selected = current.directions.includes(direction);
    if (!selected && current.directions.length >= MAX_CONSULTATION_DIRECTIONS) return edits;
    return {
        ...edits,
        paths: current.paths,
        directions: selected ? current.directions.filter((item) => item !== direction) : [...current.directions, direction],
    };
}
