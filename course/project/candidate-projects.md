---
title: Regulations and Candidate Projects
week:
mage_readings: []
objectives: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
---

The following sections list relevant regulations and candidate projects. Each names the regulation, the software-engineering problems it creates, and two example projects that fit the pod / cross-test model.

## Americans with Disabilities Act — Title II Digital Accessibility Rule

The U.S. Department of Justice recently updated its regulations implementing Title II of the Americans with Disabilities Act. The rule establishes WCAG 2.1 Level AA as the technical accessibility standard for web content and mobile applications provided by state and local governments, including public universities. These obligations also create accessibility problems involving documents, course materials, and third-party software used to provide public services.

This creates software-engineering problems involving accessibility evaluation, remediation, testing, content transformation, user interfaces, and compliance.

### Example project A — Multi-format accessibility remediation

Build a system that accepts inaccessible digital content in many formats—such as Word, PowerPoint, Excel, PDF, HTML, LibreOffice documents, LaTeX, or Typst—identifies accessibility problems, automatically repairs problems where possible, and produces evidence of the resulting accessibility. The engineering challenge is to provide consistent behavior across formats with very different representations while preserving the meaning, appearance, and functionality of the original content.

### Example project B — Accessible interface synthesis

Build a system that makes an inaccessible web, mobile, or desktop application accessible without modifying the original application. The system could observe the application through accessibility APIs, screenshots, computer vision, OCR, or interaction traces; infer a model of its controls, states, and actions; and synthesize an accessible interface over it. Evaluation could determine whether users of the synthesized interface can accomplish the same tasks as users interacting directly with the original application.

## European Union Artificial Intelligence Act

The European Union Artificial Intelligence Act establishes requirements for the development, deployment, and use of artificial intelligence systems. The obligations depend on how an AI system is used and the risks associated with that use. They include transparency requirements for certain AI systems and more extensive requirements concerning risk management, technical documentation, record keeping, human oversight, accuracy, robustness, and cybersecurity for high-risk systems.

This creates software-engineering problems involving AI governance, transparency, provenance, monitoring, documentation, risk management, and assurance.

### Example project A — AI transparency and provenance infrastructure

Build a service that integrates with an AI application and ensures that required information about AI use is disclosed and recorded. The system might track which models produced particular outputs, preserve relevant provenance and interaction records, provide appropriate disclosures to users, and support machine-readable identification of AI-generated content. The challenge is to make transparency a property of the engineered system rather than something developers must remember to add manually.

### Example project B — AI compliance evidence system

Build a system that continuously collects evidence about the development and operation of an AI application and evaluates that evidence against selected AI Act obligations. It might connect requirements to model documentation, evaluation results, logs, risk assessments, human-oversight mechanisms, and cybersecurity controls; identify missing or inconsistent evidence; and produce a structured compliance report. The system would help an organization determine what it can substantiate about an AI system and where additional engineering work is required.

## European Union Cyber Resilience Act

The European Union Cyber Resilience Act establishes cybersecurity requirements for products with digital elements. Manufacturers must address cybersecurity during design, development, and maintenance; manage vulnerabilities throughout the supported lifetime of a product; provide appropriate security information to users; and report certain actively exploited vulnerabilities and severe security incidents.

The regulation creates software-engineering problems involving secure development, software inventories, vulnerability management, monitoring, incident response, lifecycle support, and compliance evidence.

### Example project A — Vulnerability response manager

Build a system that maintains an inventory of the software components used in a product, monitors vulnerability information, determines which products may be affected, and manages investigation and remediation. The system could connect vulnerabilities to affected components and releases, track evidence about exploitability and remediation, enforce response deadlines, and support required reporting. Evaluation could use simulated products and vulnerability disclosures to determine whether the system correctly identifies and manages affected products.

### Example project B — CRA release gate

Build a system integrated with a software repository or continuous-integration pipeline that determines whether a product release satisfies a defined set of cybersecurity and documentation requirements. The system could examine dependency information, vulnerability scans, security tests, configuration, required documentation, and unresolved security findings; block releases that violate selected requirements; and produce evidence supporting releases that pass. The engineering challenge is to translate regulatory obligations into controls that can operate continuously as software changes.

## SEC Cybersecurity Disclosure Rules

The U.S. Securities and Exchange Commission requires public companies to disclose material cybersecurity incidents and information about their cybersecurity risk management, strategy, and governance. Once a company determines that a cybersecurity incident is material, disclosure is generally required within four business days.

The difficult engineering problem begins before the filing. Evidence about an incident may be distributed across security tools, logs, tickets, communications, affected systems, and people. Organizations need to determine what happened, understand its consequences, preserve the evidence supporting consequential decisions, coordinate review under time pressure, and ultimately produce an accurate disclosure.

This creates software-engineering problems involving evidence integration, incident response, workflow, traceability, decision support, reporting, and assurance.

### Example project A — Cybersecurity incident evidence and materiality workflow

Build a system that ingests evidence about an ongoing cybersecurity incident from multiple sources, maintains a structured model of what is known and unknown, tracks evidence relevant to a materiality determination, records decisions and approvals, and manages the disclosure timeline. The system should help decision-makers reason from evolving technical evidence while leaving the consequential materiality judgment to the appropriate people.

### Example project B — Incident-to-disclosure traceability system

Build a system that connects claims in a cybersecurity disclosure to the underlying technical and organizational evidence. For example, a statement about affected systems, data exposure, operational impact, or remediation could be linked to logs, incident records, analyses, and approvals supporting it. The system could identify unsupported or conflicting claims and preserve an auditable record of how the disclosure evolved as the investigation progressed.
