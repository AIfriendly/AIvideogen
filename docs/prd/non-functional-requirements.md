# Non-Functional Requirements

### NFR 1: Technology Stack
*   **Requirement:** The system must be implemented using a hybrid local-first and cloud architecture, prioritizing free and open-source (FOSS) technologies for core components.
*   **Rationale:** To ensure the project is accessible, modifiable, and has minimal licensing costs while leveraging cloud services where they provide significant quality improvements.
*   **Implication:** This constrains the choice of services for AI models (LLMs, TTS), stock media providers, and all underlying libraries. Any external service must have a free tier that is sufficient for the project's purposes without requiring payment.
*   **Cloud API Exception:** Cloud APIs with free tiers (e.g., Google Cloud Vision API, Gemini API) are acceptable for non-core processing tasks such as content filtering and quality verification. Users may optionally upgrade to paid tiers for increased quotas and better results. This does not conflict with the FOSS philosophy as the system operates in a hybrid local+cloud model.

---
