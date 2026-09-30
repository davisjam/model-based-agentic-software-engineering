# Purdue University — CS 59200-ASE "AI-Assisted Software Engineering"

**Gathered:** 2026-09-30 · **Preliminary class:** exclude (a graduate ML4SE research seminar — students read the AI4SE research literature and "design and implement AI-based software engineering tools"; it is principally about *building/improving* AI systems for SE, not about practicing software engineering with AI assistants)

**Identity check (per batch instructions):** This is NOT the course under separate comparison. It is a Computer Science department course (CS 59200, variable-title section "ASE", also listed as CS 59200-HAI on the department Spring 2024 page), taught by **Tianyi Zhang, Assistant Professor of Computer Science** — not ECE 30861 and not taught by James C. Davis or his group. Per instructions it is therefore covered fully below.

## Sources consulted
- https://tianyi-zhang.github.io/files/CS59200_AI_Assisted_Software_Engineering_Syllabus.pdf — official 15-page course syllabus (primary source; read in full)
- https://tianyi-zhang.github.io/teaching/ — instructor teaching page (search-result confirmation of course/instructor)
- https://www.cs.purdue.edu/academic-programs/courses/2024_spring_courses.html — department Spring 2024 course list (search-result confirmation: "AI-Assisted Software Engr.", Tianyi Zhang, TTh 12:00–1:15pm, LWSN B134)
- https://arxiv.org/html/2608.05898 — Geng et al. survey; Table 1 cites the syllabus PDF URL above for "Purdue — AI-Assisted Software Engineering, Spring 2024"
- (Lecture slides and assignment instructions are stated to live on Purdue BrightSpace — behind login, not public)

## A. Explicit course content (quoted / cited)

### Identity
Purdue University · Department of Computer Science · CS 59200-ASE · "AI-Assisted Software Engineering" · Spring 2024 · Instructor: Tianyi Zhang (tianyi@purdue.edu) · graduate level · face-to-face, 3.0 credits, TTh 12:00pm–1:15pm, LWSN B134. Prerequisites: "Python programming skills and basic understanding of machine learning are required. Knowing how to use scikit-learn and PyTorch (or Keras) is recommended."

### Stated learning objectives
Verbatim ("Learning Outcomes", syllabus p.3): "At the end of this course, students should be able to:
- design and implement AI-based software engineering tools
- develop effective mechanisms to improve the performance, robustness, and usability of your tools
- evaluate an AI-based software engineering tool through quantitative experiments and user studies
- assess the strengths and weaknesses of a research idea or paper
- write a research paper and give research presentations"

From the Course Description (p.1), the course teaches "concepts and research topics about (1) the role of human programmers in the age of AI, (2) how AI and ML technologies have been applied in different software engineering tasks such as code generation and software testing, (3) how AI-based software development tools work with or clash against the existing workflow of programmers, and (4) how to improve AI-based software development tools for better performance, robustness, and usability." Also: "we will focus on Deep Learning models, especially the recent advances in Large Language Models, in this course."

The description opens with motivating questions, verbatim: "Will programming jobs no longer exist because of large language models like ChatGPT? / Will software engineering become prompt engineering in the next decade? / How far are we from the 'black art' of natural language programming as Dijkstra called it 40 years ago? / What essential software engineering skills are needed in the age of AI?"

### Organizing sequence
16-week schedule (verbatim week titles, syllabus pp.3–8):
1. Introduction to AI-assisted Software Engineering
2. Machine Learning Basics (Probability Theory and Linear Algebra; MLE, Loss Functions, and Gradient Descent)
3. Deep Learning Models (Neural Networks and Backpropagation; Popular Neural Network Architectures)
4. Transformers and Large Language Models
5. Representation Learning for Code (code2vec, CodeBERT, GraphCodeBERT, SPT-Code — student paper presentations begin)
6. Machine Learning for Code Generation I (incl. the Codex paper, RepoCoder)
7. Machine Learning for Code Generation II (incl. CodeT, Self-Debug)
8. Machine Learning for Software Testing and Vulnerability Detection
9. Machine Learning for Fault Localization and Program Repair
10. No Class (Spring Break)
11. Machine Learning for Requirements Engineering
12. Machine Learning for Software Documentation
13. Machine Learning for Software Maintenance (incl. code editing, code review automation)
14. Explainable AI for Code Models (incl. "What Do Code Models Memorize?")
15. Open Challenges in AI-based Software Engineering (two lecture sessions with large optional reading lists, e.g. "Grounded Copilot: How Programmers Interact with Code-Generating Models", "Asleep at the Keyboard? Assessing the Security of GitHub Copilot's Code Contributions", "Trust Enhancement Issues in Program Repair")
16. Final Project Presentation

"From Week 1 to Week 4, the instructor will give lectures on ML basics and deep learning. In the following weeks, students will take turns to present and discuss research papers." (p.1)

### Assignments and project structure
Grading (p.3): "Reading assignments [20%] / Paper presentation [10%] / Course project [55%] (Project proposal [5%], Midterm project report [10%], Final project report [30%], Final presentation and video demo [10%]) / Pop Quizzes [10%, 2% each quiz] / Class participation and discussion [5%]".

- **Paper reading:** "Starting from Week 4, you should expect to read two research papers on a specific topic in AI-assisted Software Engineering for each class. For each paper, you need to submit a short paper review (one or two paragraphs) in the form of questions and comments, no matter you are the presenter or not." Reviews are graded on "the overall quantity and quality of your questions and comments" along four axes, verbatim: "Motivation of the work… Novelty and significance of the work… Limitations, flaws, and blind spots… Future work."
- **Paper presentation:** one ~30-minute presentation per student; in-class discussion follows a "think-pair-share format".
- **Course project (55%):** "You are expected to work on a course project either alone or in groups (3 to 5 students in a group). You can pick any topics related to AI-based software engineering, e.g., a new LLM-based code generation pipeline, a new code summarization model, a new ML-based bug detection tool, etc." Final report "should be in the double-column ACM conference format… structured like a conference paper" with "Abstract… Evaluation results… Discussion of your approach, threats to validity, and additional experiments…". Implementation projects must include a GitHub link and README.
- **Quizzes:** "five pop quizzes… assess your understanding about the research topics covered in the previous two or three weeks."

### AI tools and agent frameworks used
Not evident in available materials as *practice tools for students' own development work*. AI tools (Copilot, ChatGPT, Codex) appear as **objects of study** in the paper list (e.g., the Codex paper; "Is GitHub's Copilot as Bad as Humans at Introducing Vulnerabilities in Code?"; "Exploring the Potential of ChatGPT in Automated Code Refinement"). Frameworks recommended as prerequisites: scikit-learn, PyTorch/Keras.

### Readings
"Since this is a relatively new research topic, there is currently no textbook available for this course." Recommended surveys (verbatim citations, p.2): Yang et al., "A survey on deep learning for software engineering" (CSUR 2022); Zan et al., "Large language models meet NL2Code: A survey" (ACL 2023); Fan et al., "Large language models for software engineering: Survey and open problems" (arXiv 2023). ML background: Bishop, *Pattern Recognition and Machine Learning*; Goodfellow et al., *Deep Learning*. HCI/Human-AI-interaction: "To develop useful AI-assisted programming tools, it is very important to understand user interface design and Human-AI Interaction" — Nielsen's 10 Usability Heuristics, Google PAIR People + AI Guidebook, Apple HIG for Machine Learning, Microsoft HAX Toolkit. Plus ~50 assigned research papers in the weekly schedule.

### Treatment of: conventional SE activities
SE activities (code generation, testing, vulnerability detection, fault localization, program repair, requirements engineering, documentation, maintenance, code review) organize the syllabus weeks — but each is treated as an *application domain for ML techniques*, studied through research papers, not as a practice the students perform with AI assistance.

### Treatment of: human responsibility and judgment
Course description names "(1) the role of human programmers in the age of AI" and "(3) how AI-based software development tools work with or clash against the existing workflow of programmers" as course topics. Week 15 optional readings include human-factors studies ("Grounded Copilot", "Reading Between the Lines: Modeling User Behavior and Costs in AI-Assisted Programming", "Expectation vs. Experience: Evaluating the Usability of Code Generation Tools"). Beyond this research-literature treatment, not evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
Present as a *research-methods* concern: the learning outcome "evaluate an AI-based software engineering tool through quantitative experiments and user studies"; project reports must include "Evaluation results" and "threats to validity". Week 14 is Explainable AI for Code Models; Week 15 readings cover reliability/robustness ("On the Reliability and Explainability of Language Models for Program Generation", "Asleep at the Keyboard?", "Deep Learning Based Vulnerability Detection: Are We There Yet?"). Verification of AI output in a *practitioner workflow* sense: not evident in available materials.

### Treatment of: persistent engineering knowledge beyond source code
Week 12 "Machine Learning for Software Documentation" treats documentation generation (comment generation, commit-message generation, API-doc augmentation) as an ML task. As a practice of maintaining engineering knowledge: not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
Not evident in available materials, beyond standard university policies (academic integrity via the departmental policy and Purdue Code of Honor; late-submission policy; no AI-use policy for students' own coursework is stated in the syllabus).

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps in the public record:** the syllabus PDF is complete and rich; only the BrightSpace materials (slides, assignment instructions) are non-public. Evidence strength: rich.
- **Organizing logic (interpretation):** this is a classic graduate *AI4SE research seminar* — 4 weeks of ML/DL foundations, then a paper-per-class tour of ML applied to each SE lifecycle activity, capped by a conference-paper-shaped research project in which students build or study an AI-based SE tool. The intellectual spine is "SE task × ML technique," organized by SE task. The human-programmer/workflow angle exists but as a research-literature topic (Week 15), not as trained practice.
- **Classification reasoning (interpretation):** although the title matches "AI-assisted software engineering," the learning outcomes ("design and implement AI-based software engineering tools") and project genre place it on the *building-AI-systems* side of the survey's dividing line → exclude. If the survey wants a softer call, "mixed" is defensible only via the Week-15 human-factors material; the center of mass is clearly tool-building research.
