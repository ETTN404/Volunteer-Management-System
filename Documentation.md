# Contents 

|CHAPTER ONE......................................................................................................................................4|
|---|
|Introduction..........................................................................................................................................4|
|1.1 Background of the Project.............................................................................................................4|
|1.2 Statement of the Problem and Justification...................................................................................5|
|1.3 Objective of the Project.................................................................................................................6|
|1.3.1 General Objective...................................................................................................................6|
|1.3.2 Specific Objectives.................................................................................................................6|
|1.4 Methodologies...............................................................................................................................7|
|1.4.1 Data Collection.......................................................................................................................7|
|1.4.2 System Design and Analysis...................................................................................................8|
|1.5 System Development Tools.........................................................................................................10|
|1.5.1 Software Requirement..........................................................................................................10|
|1.6 Scope and Limitation...................................................................................................................12|
|1.6.1 Scope of the Project.............................................................................................................. 12|
|1.6.2 Limitation of the Project.......................................................................................................13|
|1.7 Significance of the Project...........................................................................................................13|
|1.8 Feasibility Study.......................................................................................................................... 14|
|1.8.1 Technical Feasibility.............................................................................................................14|
|1.8.2 Operational Feasibility..........................................................................................................15|
|1.8.3 Financial Feasibility..............................................................................................................15|
|1.8.4 Legal and Regulatory Feasibility..........................................................................................16|
|1.9 Risk, Assumptions and Constraints.............................................................................................16|
|1.9.1 Risk....................................................................................................................................... 16|
|1.9.2 Assumptions..........................................................................................................................17|
|1.9.3 Constraints............................................................................................................................ 17|
|1.10 Work Breakdown.......................................................................................................................18|
|Chapter Two..........................................................................................................................................21|
|2.1 Introduction..................................................................................................................................21|
|2.2 Detailed Analysis.........................................................................................................................21|
|2.3 Current System............................................................................................................................23|
|2.3.1 Problems Observed...............................................................................................................24|
|2.3.2 Players of the Existing System.............................................................................................24|
|2.4 Business Rules............................................................................................................................. 25|
|2.5 Proposed System..........................................................................................................................25|
|2.5.1 Overview...............................................................................................................................25|



1 

|2.5.2 Functional Requirements......................................................................................................27|
|---|
|2.5.3 Non-Functional Requirements..............................................................................................28|
|2.5.4 System Models......................................................................................................................29|
|**_Figure 2.2 Use Case Diagram for Organization Admin_**.............................................................34|
|**_Figure 2.3 Use Case Diagram for System Admin_**........................................................................35|
|**Figure 2.4****_Volunteer Coordinator_**...............................................................................................35|
|CHAPTER THREE...............................................................................................................................64|
|3.1 Introduction..................................................................................................................................64|
|3.2 Purpose of the System..................................................................................................................64|
|3.3 Design Goals................................................................................................................................65|
|3.4 Current Software Architecture.....................................................................................................65|
|3.5 Proposed Software Architecture..................................................................................................66|
|3.5.1 Architectural Pattern.............................................................................................................66|
|3.5.2 Subsystem Decomposition....................................................................................................68|
|3.5.3 Component Diagram.............................................................................................................72|
|3.5.4 Deployment Diagram............................................................................................................73|
|3.5.5 Persistent Data Management................................................................................................ 75|
|**3.5.7 Global Software Control**....................................................................................................87|
|3.5.8 Boundary Conditions............................................................................................................ 88|



2 

3 

# **CHAPTER ONE** 

## **Introduction** 

## **1.1 Background of the Project** 

Non-governmental organizations (NGOs), community groups, and non-profit institutions play a critical role in addressing social, humanitarian, and environmental challenges worldwide. In Ethiopia alone, over 2,300 organizations were registered at the federal level as of 2007, with local NGOs making up the majority [1], and the sector has continued to grow since. These organizations depend heavily on the dedication of volunteers to carry out their missions effectively. 

Efficient volunteer management is essential for ensuring operational continuity, task accountability, and sustained volunteer engagement. However, many organizations continue to rely on traditional manual methods to coordinate their volunteer workforce. Relying on manual data entry housed in multiple locations is not only time-consuming but also increases the risk of errors, and without an integrated system, important details get siloed and communication breaks down. Furthermore, research shows that nearly half of nonprofit leaders, 46.8%  identify recruiting sufficient volunteers as a major challenge, especially those with the time and skills needed. [2] 

Moreover, as organizations grow and their volunteer base expands, the complexity of scheduling, attendance tracking, and impact reporting increases significantly. Lack of staff time to train and supervise volunteers is as large a problem for nonprofits as recruiting enough volunteers, pointing to persistent under-investment in volunteer administration.[3] Without a proper digital system in place, coordinators struggle to maintain volunteer records, manage shift assignments, and produce the accurate reporting demanded by donors and stakeholders. 

To address these challenges, we propose the development of a comprehensive Volunteer Management System (VMS) designed to serve multiple organizations through a centralized, web-based platform. This system will automate core volunteer coordination functions including recruitment, scheduling, attendance tracking, and performance reporting  while incorporating AI-assisted features such as an intelligent chatbot for volunteer support, QRbased check-in, and automated certificate generation. The solution aims to enhance operational 

4 

efficiency, improve the volunteer experience, and provide organizations with the data-driven insights needed to maximize their social impact. 

## **1.2 Statement of the Problem and Justification** 

Across Ethiopia and the broader developing world, NGOs, community-based organizations, and non-profit institutions face significant operational challenges in managing their volunteer workforce. Many of these organizations lack the technological infrastructure required to streamline volunteer recruitment, scheduling, attendance tracking, and impact reporting. As a result, their coordinators spend a disproportionate amount of time on administrative tasks rather than focusing on the organization's core mission. 

Currently, most organizations rely heavily on manual processes or basic tools such as spreadsheets, paper sign-up sheets, and email chains to manage their volunteers. According to a study by Adobe, 75% of participants reported that manual, paper-based processes were boring, time-consuming, and challenging, and 33% of respondents were forced to cancel a project due to poor office task management.[4] This reality is reflected in the day-to-day operations of many volunteer-driven organizations, where coordinators manually track attendance, match volunteers to tasks based on skill, manage shift schedules, and compile service hour reports all without any centralized digital support. 

Moreover, the absence of a unified system creates additional layers of operational difficulty. The global market for volunteer management platforms is projected to grow significantly, driven by the fact that 82% of nonprofits are now prioritizing digital tools for volunteer coordination [5], yet a large portion of organizations in developing regions remain far behind this transition. Without a proper system in place, organizations suffer from scheduling conflicts, loss of volunteer records, poor skill-to-task matching, and an inability to generate accurate reports for donors and stakeholders all of which directly undermine organizational credibility and operational sustainability. 

To address these challenges, we propose the development of a centralized, web-based Volunteer Management System capable of serving multiple organizations through a single platform, with role-based access for administrators, coordinators, and volunteers. 

In general, the proposed system aims to address the following identified gaps: 

5 

- Lack of a centralized, automated system for volunteer recruitment, scheduling, and tracking across multiple organizations. 

- Heavy reliance on manual processes leading to frequent errors, scheduling conflicts, and data loss. 

- Absence of real-time communication tools, causing missed shifts and poor volunteer engagement. 

- Difficulty in accurately tracking volunteer hours and generating impact reports for donor accountability. 

- Administrative overload on coordinators due to the absence of integrated digital management tools. 

- No mechanism for recognizing volunteer contributions or tracking individual performance over time. 

## **1.3 Objective of the Project** 

## **1.3.1 General Objective** 

The general objective of this project is to design and develop a comprehensive, web-based Volunteer Management System that enables multiple organizations to efficiently recruit, schedule, track, and manage their volunteers through a centralized digital platform, improving operational efficiency and enhancing the overall volunteer experience. 

## **1.3.2 Specific Objectives** 

The specific objectives of this project are: 

- Building a multi-tenant platform that enables independent management of volunteers, events, and coordinators through role-based access. 

- Implementing a digital onboarding module to simplify registration and eliminate inefficient paper-based recruitment methods. 

- Automating administrative tasks such as scheduling, attendance, and hour calculations to reduce coordinator workload. 

- Integrating an AI chatbot to provide real-time assistance for schedules, service history, and organizational updates. 

6 

- Developing an automated reporting module to track impact and generate accurate contribution summaries for donors and stakeholders. 

- Ensuring cross-device accessibility through a responsive, user-friendly interface designed for users of all technical skill levels. 

## **1.4 Methodologies** 

The methodology is designed to pinpoint areas for improvement by thoroughly evaluating the current processes and challenges faced by volunteer-driven organizations. By assessing existing manual workflows and their limitations, it allows us to identify gaps and deficiencies in volunteer coordination, scheduling, and reporting. This analysis provides the foundation for developing a system that effectively addresses these identified issues and meets the real operational needs of its users. 

## **1.4.1 Data Collection** 

There are various methods available for collecting relevant information during the development of a software project. For this project, we plan to adopt the following data gathering techniques to understand the existing volunteer management processes across organizations: 

- Interview and Survey 

- Observation 

- Document Analysis 

### **1.4.1.1 Interview and Survey** 

We will conduct structured interviews and distribute surveys targeting volunteer coordinators, NGO administrators, and active volunteers within selected reference organizations. This will allow us to gather direct insights into their current coordination workflows, recurring pain points, and expectations from a digital management solution, providing a strong foundation for defining system requirements. 

### **1.4.1.2 Observation** 

Direct observation will be carried out by visiting selected organizations and witnessing how volunteer coordination tasks are handled in practice how shifts are assigned, how attendance is 

7 

recorded, and how communication flows between coordinators and volunteers. This hands-on approach helps uncover inefficiencies and workflow gaps that may not surface through interviews alone. 

### **1.4.1.3 Document Analysis** 

We will examine existing documents used by organizations in their current processes, including paper sign-up forms, attendance registers, scheduling spreadsheets, and donor impact reports. Reviewing these materials provides clarity on the data structures, record formats, and reporting requirements that the proposed system must support. 

## **1.4.2 System Design and Analysis** 

### **1.4.2.1 Software Development Process Model** 

For this project, we adopt the Iterative Software Development Model an approach where the system is built and refined through repeated development cycles, each encompassing planning, design, implementation, and testing. The basic idea behind this method is to develop a system through repeated cycles and in smaller portions at a time, allowing continuous improvement and adaptation throughout the project.[6] Rather than delivering the entire system at once, functionality is released incrementally, with each iteration building upon the last based on evaluation and feedback. 

This model is selected for the following reasons: 

- It allows the team to respond to evolving requirements as a deeper understanding of volunteer management workflows emerges during development. 

- Breaking the project into smaller iterations makes it easier to detect technical risks early and resolve them before they affect the broader system. 

- Regular iteration cycles create natural checkpoints for gathering feedback from stakeholders including NGO administrators and volunteer coordinators ensuring the final product genuinely reflects user needs. 

- The model promotes consistent collaboration and communication within the development team, keeping all members aligned throughout the project lifecycle. 

### **1.4.2.2 Software Analysis and Design Model** 

8 

System analysis and design form a critical phase in the development process, providing a structured understanding of what the system must do and how it should be built. For this project, we adopt the Object-Oriented Analysis and Design (OOAD) model, which approaches the system through the lens of real-world entities such as volunteers, organizations, events, and shifts and the relationships between them. 

OOAD is selected for the following reasons: 

- It provides a structured and systematic path from requirement gathering through to implementation, keeping the development process organized and traceable. 

- The use of multiple modeling perspectives behavioral, structural, and functional gives the team a complete picture of the system before a single line of code is written. 

- Modeling the system around real-world objects makes it easier to communicate design decisions with non-technical stakeholders such as NGO managers, who can recognize familiar concepts in the models. 

- Object-oriented principles such as encapsulation and modularity result in components that are self-contained and reusable, reducing long-term maintenance effort. 

This model operates in two stages: 

Object-Oriented Analysis (OOA): In this stage, the focus is on fully understanding and documenting system requirements by identifying the core entities and their behaviors within the volunteer management domain. The goal is to define what the system must accomplish before considering how it will be built. 

Object-Oriented Design (OOD): Building on the OOA findings, this stage transforms the conceptual models into concrete design specifications defining class structures, relationships, interfaces, and system behavior which serve as the direct blueprint for implementation. 

### **1.4.2.3 Design Architecture Pattern** 

For this project, we adopt the Model-View-Controller (MVC) architectural pattern to guide the design of the web application. MVC organizes the system into three clearly separated layers: the Model, which handles data and business logic; the View, which is responsible for what users see and interact with; and the Controller, which processes incoming requests and coordinates the flow between the two. This separation of concerns promotes modularity, 

9 

maintainability, and scalability qualities that are especially important for a platform designed to serve multiple organizations with different roles and workflows simultaneously. 

Laravel, the selected backend framework for this project, is built natively around the MVC pattern, making it a natural and well-supported architectural choice that aligns the framework's strengths directly with the system's design goals. 

## **1.5 System Development Tools** 

## **1.5.1 Software Requirement** 

_Table 1.1 System Development Tools_ 

|Category|Tools|Description|
|---|---|---|
|Programming|PHP|Primary backend language for server-side logic,|
|Languages||volunteer coordination workflows, and API<br>development.|
||JavaScript|Frontend interactivity, dynamic UI updates, and real-<br>time dashboard behavior.|
||SQL|Database querying, relational data management, and<br>report generation.|
|Frameworks &|Laravel|Core backend framework providing MVC|
|Libraries||architecture, routing, authentication, and task<br>scheduling for the multi-organization platform.|
||Laravel<br>Sanctum|API token-based authentication for secure session<br>management across multiple organization roles.|
||Alpine.js|Lightweight JavaScript framework for reactive UI<br>components without heavy overhead.|
||Tailwind CSS|Utility-first CSS framework for building responsive,|
|||role-specific dashboards and volunteer-facing<br>interfaces.|
||Laravel|Full-stack component library for building dynamic|
||Livewire|interfaces without leaving the Laravel ecosystem.|
|AI Integration|Gemini API|Powers the AI chatbot feature, enabling volunteers to|



10 

|||query their schedules, service hours, and event details<br>through natural language.|
|---|---|---|
|Database<br>&|MySQL|Relational database for storing volunteer profiles,|
|Server||organizations, events, shifts, attendance records, and<br>impact data.|
||Redis|In-memory data store used for caching, session<br>management, and background job queuing.|
||Apache / Nginx|Web server for handling HTTP requests, load<br>balancing, and serving the application in production.|
|Development|Visual Studio|Primary code editor for PHP, JavaScript, and Blade|
|Tools|Code|template development.|
||Git & GitHub|Version control system for collaborative|
|||development, branch management, and code<br>tracking.|
||Composer|PHP dependency manager for installing and<br>managing Laravel packages.|
||npm|Node package manager for frontend dependencies<br>including Tailwind CSS and Alpine.js.|
||Postman|API testing tool for validating and manually testing<br>backend endpoints during development.|
|API|L5-Swagger|Swagger/OpenAPI integration package for Laravel|
|Documentation||that auto-generates interactive API documentation<br>from controller annotations.|
|Design<br>&|Figma|UI/UX design tool for creating wireframes, interface|
|Prototyping||prototypes, and volunteer-facing screen mockups.|
||Draw.io|Used for system architecture diagrams, flowcharts,<br>and UML modeling.|
|QR & Location|QRCode.js|JavaScript library for generating QR codes used in|
|Features||volunteer event check-in.|
||Browser<br>Geolocation<br>API|Built-in browser API for capturing volunteer location<br>at the time of check-in for geo-verification.|
|Testing|PHPUnit|Laravel's built-in testing framework for unit and|



11 

|||integration testing of backend logic.|
|---|---|---|
||Laravel Dusk|Browser automation testing tool for end-to-end UI|
|||testing of volunteer and coordinator workflows.|
|Documentation|Microsoft Word|Used for drafting project reports, user manuals, and|
|||formal academic documentation.|



## **1.6 Scope and Limitation** 

## **1.6.1 Scope of the Project** 

- Facilitate a streamlined registration process for volunteers to create accounts, manage profiles, and list skills. 

- Enable multi-tenant organizational workspaces to allow independent management of volunteers, events, and roles. 

- Develop a centralized event dashboard for coordinators to create events, define shifts, and set requirements. 

- Implement an automated shift matching system to assign volunteers based on their specific skills and schedules. 

- Deploy QR-code and GPS-verified check-in tools to ensure accurate attendance tracking at event locations. 

- Provide a volunteer self-service portal for tracking service hours, viewing shifts, and receiving notifications. 

- Integrate an AI-powered chatbot for natural language queries regarding schedules, history, and event details. 

- Automate PDF certification generation to issue digital certificates upon reaching service milestones. 

- Establish an impact reporting module to produce summaries of hours logged and project completion for donors. 

- Coordinate urgent shift broadcasts to instantly notify qualified volunteers of immediate coverage needs. 

## **1.6.2 Limitation of the Project** 

12 

- Exclusion of native mobile apps: The system is limited to a web-based platform, though it maintains a responsive design for mobile browsers. 

- No financial management: The platform does not process payments, volunteer stipends, or expense reimbursements. 

- Status-only background checks: No integration with external government APIs; the system only records verification statuses manually. 

- Dependency on device location: Geo-verification requires active user permission, enabled GPS, and stable internet to function. 

- Internalized AI chatbot: The chatbot is restricted to system-specific data and cannot perform external web searches or provide general advice. 

- Internet dependency: Requires continuous connectivity, which may limit accessibility in areas with poor network infrastructure. 

## **1.7 Significance of the Project** 

By developing a comprehensive, web-based Volunteer Management System, this project delivers meaningful benefits to all parties involved in volunteer-driven operations: 

- The platform eliminates the need for paper-based coordination by providing organizations with a fully digital environment for managing recruitment, scheduling, and reporting, significantly reducing the administrative burden on coordinators and freeing their time for mission-critical work. 

- By serving multiple organizations through a single platform, the system promotes resource efficiency each organization benefits from a professionally built management infrastructure without the cost of developing or maintaining its own independent solution. 

- Volunteers gain direct visibility into their schedules, service history, and milestone progress through a self-service portal, improving their sense of ownership, engagement, and long-term retention within organizations. 

- The automated impact reporting module enables organizations to generate accurate, data-backed summaries of volunteer contributions, strengthening their credibility with donors and improving their capacity to secure continued funding and grants. 

13 

- The AI chatbot feature reduces the communication workload on coordinators by allowing volunteers to get instant answers to common queries at any time, without requiring manual responses from staff. 

- Automated certificate generation provides volunteers particularly students with verified, exportable proof of community service, adding tangible professional and academic value to their participation. 

- The QR-based check-in and geo-location verification features replace unreliable manual attendance logging with accurate, timestamped records, improving the integrity of hours data across all organizations on the platform. 

## **1.8 Feasibility Study** 

A feasibility study is essential to assess whether the proposed Volunteer Management System is practical, technically achievable, and capable of meeting its objectives within the constraints of the project. The study evaluates the technical, operational, financial, and legal aspects of the project to determine its overall viability. In the context of this project, we examine the following feasibility areas: 

## **1.8.1 Technical Feasibility** 

This aspect evaluates whether the necessary technology and resources are available to successfully develop and deploy the system. 

- The technical stack will be built on Laravel and MySQL, which are well-documented and open-source, so the development process will remain stable and easy to maintain. 

- The platform will be designed as a responsive web application, which will be accessible through any standard browser, so it will eliminate the need for expensive hardware or high IT costs. 

- The system integration will use public APIs like Gemini and Geolocation, which are stable and widely available, so the project will avoid complex licensing or negotiation hurdles. 

- The security framework will implement HTTPS and Laravel Sanctum, which are industry-standard protocols, so all organizational and volunteer data will remain protected and secure. 

14 

Therefore, from a technical standpoint, the project is highly feasible. 

## **1.8.2 Operational Feasibility** 

This aspect assesses whether the system addresses real operational needs and whether its intended users can realistically adopt and operate it after deployment. 

- The interface will be designed with simplicity and clarity, so administrators and volunteers of all technical backgrounds will be able to navigate the platform with minimal training. 

- The self-service portal will automate routine tracking and scheduling, so the administrative workload on coordinators will be reduced, allowing them to focus on core tasks. 

- The architecture will be built on isolated multi-tenant workspaces, so onboarding new organizations will remain a seamless process that will not disrupt existing users. 

- The maintenance plan will involve routine updates and bug fixes, so the system will remain reliable and will be managed efficiently by the technical team. 

## **1.8.3 Financial Feasibility** 

This aspect examines whether the project can be completed within the available budget and whether its cost structure is sustainable. 

- The development tools and frameworks will be open-source, including Laravel, MySQL, and Tailwind CSS, so the project will keep licensing costs at zero throughout the development phase. 

- The AI integration will utilize the free tier of the Gemini API, which will be sufficient for the chatbot's scope, so the system will avoid integration expenses during initial deployment. 

- The hosting for testing and demonstration will use free-tier cloud options, which will provide adequate resources for this stage, so the project will incur minimal to no infrastructure costs. 

- The project expenditures will be kept to a minimum as an academic endeavor, so the development will remain financially sustainable without requiring external funding or complex financial plans. 

15 

## **1.8.4 Legal and Regulatory Feasibility** 

- The system will handle volunteer personal data including contact information, location data during check-in, and service records in accordance with applicable data privacy principles, ensuring that data is stored securely and used only for its intended purpose within the platform. 

- Organizations registering on the platform will be responsible for obtaining appropriate consent from their volunteers for data collection and usage, and the system will provide the structural support to enforce this through its onboarding flow. 

- Since the system does not process financial transactions or payroll, it falls outside the scope of financial regulatory requirements, simplifying its legal compliance obligations significantly. 

## **1.9 Risk, Assumptions and Constraints** 

## **1.9.1 Risk** 

During developing and managing this project, we may face the following challenges: 

- Unstable internet connectivity which will affect the system's usability and cause disruptions for users in areas with poor network access. 

- Resistance to digital transition from users accustomed to manual processes, which will potentially slow down the system's adoption and initial impact. 

- Data privacy and security concerns regarding personal information and location tracking, which will influence how volunteers engage with key features. 

- Inaccuracies in AI chatbot responses due to edge cases or complex queries, which will result in confusing or misleading information for volunteers. 

- Architectural complexity in data isolation, which will increase the risk of misconfigurations or data leakage between different organizations. 

- Unforeseen technical bugs and integration issues with third-party APIs, which will lead to performance bottlenecks or delays in the development timeline. 

## **1.9.2 Assumptions** 

During the development and management of this project, the following assumptions are made: 

16 

- It is assumed that target users including volunteer coordinators and volunteers have access to internet-enabled devices capable of running a modern web browser. 

- The development team is assumed to possess the necessary skills in Laravel, MySQL, and frontend technologies to design, implement, and deliver the system within the academic timeline. 

- It is assumed that representative organizations and volunteers will be available to participate in interviews, surveys, and feedback sessions during the data collection and testing phases. 

- It is assumed that the Gemini API will remain accessible under its current free tier throughout the project's development and demonstration period. 

- It is assumed that stakeholders will engage actively and provide timely feedback during iterative development cycles, enabling the team to refine the system according to real user needs. 

- University lab resources, including computers and local servers, are assumed to be available for development, testing, and demonstration purposes. 

## **1.9.3 Constraints** 

- Budget Constraint: Reliance on free-tier services and open-source tools due to zero allocation for paid licenses or commercial hosting. 

- Time Constraint: A fixed academic semester deadline, which limits the number of features that can be fully developed and tested. 

- Scope Constraint: Exclusion of native apps, offline support, and financial processing to remain aligned with the project's defined boundaries. 

- Technology Constraint: Dependency on the availability and rate limits of third-party APIs like Gemini and Browser Geolocation. 

## **1.10 Work Breakdown** 

_Table 1.2 Work Breakdown Structure_ 

|Task Name||Description|Estimated|
|---|---|---|---|
||||Duration|
|Requirements||Conduct interviews and surveys with NGO|3 Weeks|
|Gathering|and|administrators and volunteer coordinators, gather||



17 

|Analysis|functional and non-functional requirements, and<br>analyze existing manual volunteer management<br>workflows to define clear system specifications.||
|---|---|---|
|Managing|Establish a structured process to handle, document,|Throughout the|
|Requirement|and incorporate requirement changes that emerge|Project|
|Changes|throughout the project lifecycle, ensuring the<br>system continues to align with stakeholder needs.||
|System Modeling|Develop system models and UML diagrams<br>including use case, sequence, activity, and class<br>diagrams that represent the structure, behavior, and<br>interactions of the Volunteer Management System.|3 Weeks|
|Design|Design the system architecture, database schema,<br>and user interface for all platform roles<br>Administrator, Coordinator, and Volunteer<br>including wireframes and prototypes created in<br>Figma.|4 Weeks|
|Refine<br>the<br>Architecture|Review and improve the system architecture<br>iteratively based on design decisions, stakeholder<br>feedback, and technical discoveries made during<br>coding and testing phases.|Distributed<br>Throughout<br>Design, Coding,<br>and Testing|
|Coding<br>/|Implement all system components including multi-|6 Weeks|
|Implementation|organization management, role-based access<br>control, shift scheduling, QR check-in, geo-<br>location verification, AI chatbot integration,<br>impact reporting, and certificate generation using<br>Laravel and MySQL.||
|Testing|Conduct unit testing, integration testing, and end-<br>to-end testing of all implemented features using<br>PHPUnit and Laravel Dusk, validate system<br>behavior across roles, and resolve identified<br>defects before submission.|1 Week|
|Submission|Finalize all project deliverables including the<br>complete documentation, source code, and<br>demonstration materials, ensuring everything is|1 Week|



18 



<!-- Start of picture text -->
© Requirements Gaterng & Anais<br>© ‘Sytem mMedeing&Wertow Des. Downe<br>© WNUxPrttyring<br>© system Arntectre& Design<br>@ Feature DevelopmentPhase 1) LE<br>© Becument<br>Upload Vali. aD<br>© Pyros<br>Report Generation er —)<br>© Basic Payment Hang SS)<br>© Testing#4 haces CE<br>@ Feedback Revisions CGLe——E—EE—EU<br>© Feeture DevelopmentPhase2<br>€@. Testing& 0A ase 2) LE<br>©. ArentoctureRetiament<br>© ongoing Change Tracking<br>©. beplyment etn EE<br>©. Pecumentatin& Fina Reporting |<br>© Fiat resentation Gua»<br><!-- End of picture text -->



<!-- Start of picture text -->
&er Analy.“Ss‘<br>SS &<br>Initial S& fe)<br>Planning L@ &.oyD<br>aa |<br>© © Deployment<br>z =<br>A =<br>“%BK AS<br>70,y<br><!-- End of picture text -->

at the end of each iteration is used to make targeted adjustments, ensuring the system evolves in direct response to real user needs. By following this iterative approach, the team can identify and address technical risks early, manage scope changes in a controlled manner, and deliver a reliable, user-centered Volunteer Management System that meets both academic standards and practical deployment expectations. 

20 

# **Chapter Two** 

## **Requirement Analysis and Specification** 

## **2.1 Introduction** 

In this chapter, we analyze the functional and operational landscape of volunteer management to provide a blueprint for the proposed system. The primary objective is to gain a deep understanding of the existing coordination workflows, communication channels, and administrative activities within non-governmental organizations (NGOs) and community groups. By evaluating current manual processes through interviews, observations, and document analysis, we aim to identify the specific pain points such as data siloed in spreadsheets and the lack of real-time impact tracking that hinder organizational efficiency. This analysis identifies the key stakeholders, including NGO administrators, volunteer coordinators, and the volunteers themselves, ensuring the proposed solution serves the needs of every user role. 

Building on this foundation, we define the functional requirements that will drive the development of the multi-tenant platform, including automated scheduling, QR-based attendance, and AI-driven support. These features are specifically designed to address identified gaps like administrative overload and poor skill-to-task matching. Furthermore, we outline non-functional requirements to ensure the system is secure, scalable, and responsive for users in various technical environments. To provide a clear technical roadmap, this chapter also introduces system models including Use Case, Activity, and Sequence diagrams that visualize how these requirements translate into a cohesive digital ecosystem. 

## **2.2 Detailed Analysis** 

In order to conduct a comprehensive analysis of the proposed Volunteer Management System (VMS), we employed various data collection techniques, including interviews, surveys, observations, and document analysis. These methods were used specifically within selected reference NGOs and community-based organizations to gather localized insights and better understand the unique challenges and requirements of coordinating a volunteer workforce. 

21 

We conducted interviews with key stakeholders in these organizations, including NGO administrators, volunteer coordinators, and active volunteers. During these interviews, we sought to gather information on several aspects, including: 

Process: We asked stakeholders about the current process of recruiting, onboarding, and managing volunteers. We inquired about the steps involved in shift assignment, the parties responsible for attendance tracking, and any existing challenges in the workflow. 

Timeframes: We inquired about the average time it takes to match a volunteer to a task and compile service reports. We wanted to understand if there are any delays in communication or inefficiencies in manual hour logging and identify potential areas for improvement. 

Workload for Staff: We inquired about the administrative burden on coordinators involved in supervising volunteers. We wanted to understand if the current manual system—relying on spreadsheets and paper—puts an excessive burden on staff and if resource constraints affect operational mission success. 

Communication Methods: We asked stakeholders about the existing tools used for updates and emergency shift broadcasts. We sought to understand if the current reliance on email chains or phone calls results in miscommunication or missed shifts. 

We gathered survey data using Google Forms from active volunteers and students, with the majority of respondents primarily aged 18–30, representing the core demographic of community service participants. When asked about the time it took to receive shift confirmations or service certificates, a significant portion reported delays of several days due to manual processing. Opinions on the ease of finding volunteering opportunities were mixed, with many rating current access as "difficult" or "unorganized". 

The main challenges identified in the manual process were long administrative wait times and the lack of a centralized schedule, cited by approximately 88% of respondents. Many also reported frustration with tracking their own impact, with the vast majority preferring a digital self-service portal for viewing their service history. Regarding the potential for an AI-assisted management system, the majority of respondents expressed strong support, believing that automated check-ins and an intelligent chatbot would significantly improve the volunteer experience. 

22 

Lastly, we conducted observations to directly examine the practical aspects of volunteer coordination, gathering insights on the physical check-in environment and staff-volunteer interactions during events. Additionally, we reviewed relevant documents, including paper attendance registers, sign-up forms, and donor impact reports. This document analysis complemented the broader findings from the interviews and surveys, providing a comprehensive view of the existing system and its pain points. 

## **2.3 Current System** 

When we visited the reference organizations, we noticed that volunteer management activities were often divided between two primary functional areas. One section handled **Volunteer Recruitment and Onboarding** (processing new applications and verifying skills), while the other section was responsible for **Event Coordination and Attendance** (scheduling shifts and logging service hours). 

Our analysis of the current system included several key observations. The process of managing volunteers involves a multi-step, largely manual workflow. Individuals who wish to volunteer must physically visit the organization’s office or contact a coordinator via email. Upon arrival, they submit paper application forms and copies of supporting documents, such as academic credentials or certifications, to the staff members. 

The coordinators manually collect volunteer information using these paper forms and by conducting face-to-face interviews. After gathering the necessary details, the staff members often enter the data manually into basic digital tools like Excel spreadsheets or simple Word documents, which serve as the primary database for storing volunteer profiles. Information is stored in a hybrid format, using both physical folders and localized digital files. 

The submitted details are then processed by coordinators who verify the volunteer's availability and match them to upcoming events. By obtaining verbal confirmation from the volunteer regarding their assigned shifts before finalizing the schedule, the system aims to reduce the likelihood of scheduling conflicts. This allows for manual corrections to be made during the interaction between the coordinator and the volunteer, ensuring the shift assignments reflect the volunteer's current availability. 

23 

Once the event is underway, attendance is typically recorded on paper sign-up sheets at the location. After the event, volunteers are not automatically informed about their total logged hours or the status of their service certificates. Instead, they need to contact the coordinator or return to the office at a later date to inquire about their service history and request physical proof of their contributions. In some cases, if the organization is small and the records are updated quickly, volunteers may receive verbal confirmation of their hours immediately after a shift. 

The time it takes for volunteers to be cleared for duty or to receive their service reports can vary from a few days to several weeks, depending on factors such as the coordinator's workload, the complexity of the manual data entry, and the lack of integrated communication tools. These factors result in significant administrative delays and inefficiencies, leading to prolonged waiting times for volunteers to receive feedback or recognition. 

The current system relies entirely on manual reporting and physical documentation. While some organizations use basic digital tools for data storage, it is important to note that volunteers do not have direct access to these records to view their own schedules or track their individual impact. 

## **2.3.1 Problems Observed** 

- The current registration process requires manual data entry from information collected in person or via paper forms at the organization's office. 

- Difficulties in matching volunteer skills to specific task requirements and delays in manual scheduling lead to long waiting times for project assignments. 

- Significant administrative workload on coordinators who must manually track hours and generate service reports. 

- Lack of real-time communication tools resulting in scheduling conflicts, missed shifts, and poor volunteer engagement. 

## **2.3.2 Players of the Existing System** 

The key players involved in the system include: 

- **Volunteers:** Individuals (often students or community members) who offer their time and skills for social impact. 

24 

- **Admin:** Responsible for managing organization-wide settings and oversight of staff member accounts. 

- **Volunteer Coordinators:** Staff members responsible for recruiting volunteers, assigning shifts, and verifying attendance. 

- **Donors/Stakeholders:** External entities that require impact reports and verified data on volunteer contributions to justify funding. 

## **2.4 Business Rules** 

- **BR-01:** The volunteer must provide correct and legitimate information during the digital onboarding process. 

- **BR-02:** For student volunteers under the age of 18, a signed parental or legal guardian consent form must be provided before they can be assigned to active shifts. 

- **BR-03:** Volunteers must undergo a verification process (manual or status-based) to ensure they possess the specific skills (e.g., medical, teaching) they list on their profiles. 

- **BR-04:** Attendance check-ins for events must be performed at the designated location to ensure the integrity of the logged service hours. 

- **BR-05:** To receive an automated service certificate, a volunteer must reach a specific milestone of logged hours as defined by the organization's policy. 

- **BR-06:** Coordinators must approve or verify all logged hours before they are included in the final impact reports for donors. 

- **BR-07:** Urgent shift broadcasts should only be sent to volunteers whose profiles match the required skill set and who have indicated availability for that specific timeframe. 

- **BR-08:** Multi-tenant isolation must be maintained; staff from one organization cannot access the volunteer records or event data of another organization on the platform. 

## **2.5 Proposed System** 

## **2.5.1 Overview** 

As mentioned in the introductory part of chapter one, our proposed system is a comprehensive **Volunteer Management System (VMS)** , which is an online platform designed to address the identified problems in the current manual coordination methods and provide organizations and volunteers with a streamlined digital environment. The VMS is built as a **multi-tenant, web-based platform** utilizing a responsive design to ensure 

25 

accessibility across desktop and mobile browsers, alongside a dedicated administrative dashboard for organization leaders. 

In our proposed system, volunteers can access the platform from any internet-enabled device. They will need to create an account by providing their contact information, skills, and availability. Once the account is created, users can login using their email and password to access the system's features, including a personalized self-service portal. Within the system, volunteers can browse available events and shifts that match their skills. They will be guided through a user-friendly interface to join events, track their service hours, and interact with an **AI-powered chatbot** for real-time assistance regarding their schedules and service history. 

Once a volunteer applies for a shift or registers for an event, the system will initiate an automated workflow for coordination. The system will route applications to the specific **Volunteer Coordinators** assigned to that organization or event for review and approval. For example, a request for a medical-based volunteer task will be routed to the coordinator overseeing health-related initiatives to verify the volunteer's credentials. 

Staff members and administrators assigned to specific organizations will have access to a unified dashboard within the system. This dashboard enables them to efficiently manage event creation, shift assignments, and volunteer verification. They can review volunteer profiles, verify the skills provided, and utilize **QR-code and GPS-verified check-in tools** to ensure accurate attendance tracking at event locations. The proposed system will implement a hierarchical role-based access control (RBAC) structure to ensure secure data isolation and management. The admin structure will consist of multiple levels, including the **General System Admin** (overseeing the platform), **Organization Admin** (managing specific NGOs), and **Volunteer Coordinators** (handling day-to-day tasks). 

To facilitate high-level reporting and accountability, the system will offer an automated impact reporting module. Organizations can securely generate accurate, data-backed summaries of volunteer contributions for their donors and stakeholders, while volunteers can instantly download verified PDF service certificates upon reaching specific milestones. 

26 

## **2.5.2 Functional Requirements** 

In this section, we define the functional requirements of the system. These requirements outline what the system is expected to do and outline the specific features and actions that our system should exhibit in order to meet the needs of its users. 

### **Volunteer** 

- Create an account to access the system. 

- Login with a valid email and password. 

- Manage personal profile, including skills, availability, and contact information. 

- Search and apply for specific volunteer events or shifts. 

- Upload supporting documents such as certifications or academic credentials. 

- Check-in/out of events using QR codes and GPS-verified location tools. 

- Interact with the AI chatbot to query schedules and service history. 

- View and download verified PDF service certificates. 

### **General Admin (System Level)** 

- Login with a valid username and password. 

- Manage Organization Admin accounts, including creating, modifying, and deactivating access for different NGOs or institutions. 

- Monitor system-wide activity and maintain the multi-tenant architecture. 

### **Organization Admin** 

- Login with a valid username and password. 

- Manage Volunteer Coordinator accounts, including creating, modifying, and deactivating roles within the organization. 

- Oversee organization-specific settings and branding. 

- View comprehensive impact reports and high-level analytics for donor accountability. 

### **Volunteer Coordinator** 

- Login with a valid username and password. 

- Manage events and tasks, including creating, modifying, and deleting shift details. 

27 

- View and search incoming volunteer applications for specific events. 

- Review volunteer data and uploaded documents for verification. 

- Approve or reject shift applications and update volunteer participation status. 

- Broadcast urgent shift notifications to qualified volunteers. 

- Verify logged hours and attendance records. 

## **2.5.3 Non-Functional Requirements** 

Non-functional requirements define the quality attributes, design constraints, and environmental factors that determine how the system performs its functions. These requirements ensure that the Volunteer Management System (VMS) is not only operational but also reliable, secure, and user-friendly. 

- Usability The system shall feature an intuitive, responsive interface built with Tailwind CSS, ensuring accessibility for users across desktop and mobile browsers. 

- The AI chatbot shall provide natural language assistance, allowing volunteers to navigate their service history without needing technical expertise. 

- Navigation shall be simplified through clear role-specific dashboards for volunteers, coordinators, and administrators. 

- Security The platform shall implement Laravel Sanctum for secure, token-based authentication across all user roles. 

- Multi-tenant isolation shall be strictly enforced to ensure that data from one organization remains completely inaccessible to others. 

- Sensitive volunteer information and location data captured during QR check-ins shall be stored securely in the MySQL database using industry-standard encryption protocols. 

- Performance The system shall utilize Redis for caching and session management to maintain high speed and responsiveness during peak event registration times. 

- The backend, powered by Laravel, shall be optimized to handle concurrent requests from multiple organizations simultaneously without significant latency. 

- The automated generation of PDF certificates and impact reports shall be processed efficiently to ensure minimal wait times for users. 

- Availability and Reliability The system aims for high availability to ensure coordinators can manage urgent shift broadcasts at any time. 

28 

- Reliability will be maintained through an Iterative Development Model, with continuous testing using PHPUnit and Laravel Dusk to identify and resolve bugs early. 

- The system shall provide clear error messages and validation feedback to prevent data entry errors by volunteers or staff. 

- Scalability and Maintainability The architecture shall be designed to allow for the seamless onboarding of new organizations without requiring changes to the core codebase. 

- The use of the MVC (Model-View-Controller) pattern ensures that the system is modular, making it easier to update individual features like the AI integration or reporting modules in the future. 

- Standardized documentation and version control via Git will be maintained to support long-term system maintenance. 

## **2.5.4 System Models** 

- In this section, we present various models that show the different features and workflows of the system, as well as how the various parts interact. These models serve important purposes; they help to understand how the system is designed and how it will function to support multi-tenant volunteer coordination. 

### **2.5.4.1 Use Case Model** 

### **2.5.4.1.1 Actor Identification** 

### **Table 2.1 Actor Identification** 

|**Volunteer**||
|---|---|
|**Identification**|AC-00|
|**Description**|An individual or student whose profile, skills, and service history are<br>stored in the system’s database.|
|**Role**|Can browse events, apply for shifts, upload certifications, perform QR-<br>based check-ins, and interact with the AI chatbot.|



29 

|**General**<br>**Admin**|
|---|
|**Identification**<br>AC-01|
|**Description**<br>A senior-level System Administrator who oversees the entire multi-tenant<br>platform.|
|**Role**<br>Controls and manages Organization Admin accounts and monitors system-<br>wide technical health.|
|**Organization**<br>**Admin**|
|**Identification**<br>AC-02|
|**Description**<br>An administrator representing a specific NGO or institution who<br>manages internal staff and high-level data.|
|**Role**<br>Manage Volunteer Coordinator accounts, oversee organizational<br>settings, and view comprehensive impact reports.|
|**Volunteer**<br>**Coordinator**|
|**Identification**<br>AC-03|
|**Description**<br>An individual who operates under an organization to manage the day-<br>to-day deployment of volunteers.|
|**Role**<br>Manage events and tasks, review volunteer applications, verify<br>attendance, and generate service certificates.|
|**AI**<br>**Chatbot**<br>**(System Actor)**|
|**Identification**<br>AC-04|



30 

|**Description**|An intelligent interface powered by the Gemini API that interacts|
|---|---|
||directly with volunteers.|
|**Role**|Provide real-time answers to queries regarding schedules, service|
||hours, and organizational updates.|



### **2.5.4.1.2 Use Case Identification** 

**Table 2.2 Use Case Identification** 

|**Use Case ID**|**Use Case Name**|
|---|---|
|**UC-1**|Sign up|
|**UC-2**|Login|
|**UC-3**|Manage profile (Skills, Availability)|
|**UC-4**|View event/shift list|
|**UC-5**|Apply for shift|
|**UC-6**|Perform QR check-in/out|
|**UC-7**|Upload certifications/documents|
|**UC-8**|Query AI Chatbot|
|**UC-9**|Manage Organization Admin accounts|



31 

|**UC-10**|Manage Volunteer Coordinator accounts|
|---|---|
|**UC-11**|Manage Volunteer accounts|
|**UC-12**|View impact reports|
|**UC-13**|Manage events and tasks|
|**UC-14**|View incoming shift applications|
|**UC-15**|Search volunteer records|
|**UC-16**|Review volunteer data and documents|
|**UC-17**|Approve or reject shift application|
|**UC-18**|Broadcast urgent shift notification|
|**UC-19**|Generate service certificate|
|**UC-20**|Verify Password/Authentication|
|**UC-21**|Display error message|
|**UC-22**|Log out|



32 



<!-- Start of picture text -->
manage profiled *s,<br>% ‘<br>*s. <<include>><br>Apply for Shift- }-._ <<inclne ude>>an=<br>O, <<include>>"*. °s,*s<br>. QR - a<br>Volunteer Check-in/out) ~~~ weet weetetat<br><<include>>,-" 47,"<br>Upload wr" <<include>»,-" +<br>Document wo<br>wo ssinclude#><br>Query Al ae ao “ <<include>>,<br>Chatbot rd<br>“ o<br>Download “ “<br>Certificate “a<br><!-- End of picture text -->



<!-- Start of picture text -->
Manage Coordinator<br>Account 2<br><<include>><br>Manage Volunteer TES<br>Accounts <<rcuse53C gin)<br><<include>>,’<br>Organization View Impact Reports ener<br>Admin ra<br><!-- End of picture text -->



<!-- Start of picture text -->
Manage Organization<br>Accounts A<br>C) <<include>><br>Verify Se<br>“a Password/Security <<include>>S<br>Organization =<br>Admin ae<br>> <<include>><br><!-- End of picture text -->



<!-- Start of picture text -->
manage events &<br>tasks<br>view incoming<br>applications nN<br>“xsinclude>=<br>search volunteer SS<br>ecords “s. <<inelude>><br><<include=>"._*s,<br>review data& Tea<br>O, documents -- -<<include>>__ rae<br>approve/reject weet aera<br>Coontinator applicationPp <<include>><<include=>; oe"6°J-7"a  64"<br>a .<br>broadcast urgent, .- a a=<includes>.“ot*<br>notification “4<br>=sinclude>><br>generate service.” a<br>certificate v<br><!-- End of picture text -->

||2. The user should have the required registration info (e.g., email, skills).|
|---|---|
|**Post-condition**|1. Display a message indicating successful account creation.|
||2. Store the volunteer information in the database.<br>3. Display the personalized dashboard.|
|**Basic Flow**|1. The user navigates to the sign-up page.<br>2. The system presents the sign-up form.<br>3. The user enters their personal information and skills.<br>4. The user submits the form.|
||5. The system confirms successful creation.<br>6. The system stores data in the MySQL database.<br>7. The system directs the user to the Volunteer Dashboard.|
|**Alternative**|If information is invalid (e.g., incorrect email format), the system|
|**Flow**|displays error messages.|



**Table 2.4 Use Case Description for Login** 

|**UC**|**UC-2**|
|---|---|
|**Identification**||
|**Use Case Name**|Login|
|**Description**|This use case allows logging into an existing account within the system.|
|**Actor**|All Actors (Volunteer, Coordinator, Admin)|
|**Pre-condition**|1. The user must have an existing account.|
||2. The user must have a valid email and password.|
|**Post-condition**|The user is successfully authenticated via Laravel Sanctum and logged|



36 

||in.|
|---|---|
|**Basic Flow**|1. The user navigates to the Login page.|
||2. The system presents the Login form.|
||3. The user enters their credentials.|
||4. The user submits the form.|
||5. The system validates the credentials against the database.|
||6. The system displays the appropriate role-based dashboard.|
|**Alternative**|If credentials do not match, the system displays an "Invalid Credentials"|
|**Flow**|error message.|



**Table 2.5 Use Case Description for Manage Profile** 

|**UC**|**UC-3**|
|---|---|
|**Identification**||
|**Use Case Name**|Manage Profile|
|**Description**|Allows users to update their profile information, such as skills or contact<br>details.|
|**Actor**|All Actors|
|**Pre-condition**|UC-2 (User must be logged in).|
|**Post-condition**|The profile information is updated in the database.|
|**Basic Flow**|1. The user navigates to the profile settings.<br>2. The system displays the current information.<br>3. The user edits desired fields (e.g., adding a new skill).<br>4. The user submits the changes.|
||5. The system updates the MySQL record.|



37 

||6. The system displays a success message.|
|---|---|
|**Alternative Flow**|If invalid data is entered, the system displays a validation error message.|



**Table 2.6 Use Case Description for View Event List and Apply for Shift** 

|**UC**<br>**Identification**|**UC-4 and UC-5**|
|---|---|
|**Use Case Name**|View Event List and Apply for Shift|
|**Description**|Allows volunteers to view available shifts and apply for them.|
|**Actor**|Volunteer|
|**Pre-condition**|Volunteer must be logged in.|
|**Post-condition**|The shift application is recorded and sent to the Coordinator for review.|
|**Basic Flow**|1. The volunteer navigates to the events page.<br>2. The system presents a list of available shifts.<br>3. The user selects a specific shift matching their skills.<br>4. The system records the application for Coordinator approval.|



**Table 2.7 Use Case Description for QR Check-in and Document Upload** 

|**UC**|**UC-6 and UC-7**|
|---|---|
|**Identification**||
|**Use Case Name**|Perform QR Check-in and Upload Document|
|**Description**|Allows volunteers to verify their attendance via QR/GPS and upload|
||necessary certifications.|
|**Actor**|Volunteer|
|**Pre-condition**|The volunteer must be logged in, have an approved shift, and be at the|



38 

||physical event location.|
|---|---|
|**Post-condition**|The service hours are logged in the database and documents are stored<br>for verification.|
|**Basic Flow**|1. The volunteer navigates to the event check-in section on the web<br>platform.|
||2. The system requests access to the device camera and GPS location.|
||3. The volunteer scans the event's unique QR code.|
||4. The system validates the location coordinates against the event's geo-<br>fence.|
||5. The volunteer uploads any required post-event documentation or<br>reports.|
||6. The system records the timestamped attendance.|
|**Alternative**|If the GPS location is outside the allowed radius, the system displays an|
|**Flow**|"Unauthorized Location" error.|



**Table 2.8 Use Case Description for Query AI Chatbot** 

|**UC**|**UC-8**|
|---|---|
|**Identification**||
|**Use Case Name**|Query AI Chatbot|
|**Description**|Allows volunteers to get instant information regarding their schedules or<br>history via natural language.|
|**Actor**|Volunteer|
|**Pre-condition**|The volunteer must be logged in to access their personalized service data.|
|**Post-condition**|The chatbot provides a relevant response based on system data.|
|**Basic Flow**|1. The volunteer opens the chatbot interface on the dashboard.|
||2. The user types a query (e.g., "When is my next shift?").|



39 

|3. The system sends the query and relevant database context to the|
|---|
|Gemini API.|
|4. The system displays the AI-generated response to the user.|



**Table 2.9 Use Case Description for Manage Organization Admins** 

|**UC**<br>**Identification**|**UC-9**|
|---|---|
|**Use Case Name**|Manage Organization Admins|
|**Description**|This use case allows the General Admin to manage the accounts of<br>different NGOs/Institutions on the platform.|
|**Actor**|General Admin|
|**Pre-condition**|The General Admin must be logged in with super-admin credentials.|
|**Post-condition**|A new organization tenant is created or modified in the system.|
|**Basic Flow**|1. The General Admin navigates to the Organization Management<br>dashboard.|
||2. The system displays a list of registered organizations.<br>3. The Admin enters the new organization's details and designates an<br>Organization Admin.<br>4. The system creates a secure, isolated data partition (tenant) for that<br>organization.|



**Table 2.10 Use Case Description for Manage Volunteer Coordinators** 

|**UC**|**UC-10**|
|---|---|
|**Identification**||
|**Use Case Name**|Manage Volunteer Coordinators|



40 

|**Description**|Allows the Organization Admin to manage staff accounts within their<br>specific NGO.|
|---|---|
|**Actor**|Organization Admin|
|**Pre-condition**|The Org Admin must be logged in to their specific organization<br>workspace.|
|**Post-condition**|Coordinator accounts are created, modified, or deactivated.|
|**Basic Flow**|1. The Org Admin navigates to the "Staff Management" section.|
||2. The system shows staff members belonging only to that organization.|
||3. The Admin creates a new Coordinator account with specific<br>permissions.|
||4. The system updates the internal role-based access list.|



**Table 2.11 Use Case Description for Manage Events and Tasks** 

|**UC**|**UC-13**|
|---|---|
|**Identification**||
|**Use Case Name**|Manage Events and Tasks|
|**Description**|Allows coordinators to create, modify, or delete volunteer opportunities<br>and shift requirements.|
|**Actor**|Volunteer Coordinator|
|**Pre-condition**|The Coordinator must be logged in to their organizational dashboard.|
|**Post-condition**|Event details are updated and made visible to qualified volunteers.|
|**Basic Flow**|1. The Coordinator navigates to the "Event Management" section.|
||2. The system presents options to create a new event or edit existing<br>ones.|
||3. The Coordinator enters event details (title, location, shift times,|



41 

|required skills).|
|---|
|4. The Coordinator saves the event.|
|5. The system stores the event in the database and updates the volunteer-|
|facing list.|



**Table 2.12 Use Case Description for Review and Approve Shift Applications** 

|**UC**<br>**Identification**|**UC-14, UC-16, and UC-17**|
|---|---|
|**Use Case Name**|Review and Approve Shift Applications|
|**Description**|This use case allows coordinators to evaluate volunteer requests and<br>assign them to shifts.|
|**Actor**|Volunteer Coordinator|
|**Pre-condition**|Volunteers must have submitted applications for an active event.|
|**Post-condition**|The volunteer's status is updated to "Approved" or "Rejected" and they<br>are notified.|
|**Basic Flow**|1. The Coordinator views the list of incoming applications for a specific<br>event.|
||2. The Coordinator reviews the volunteer's profile and uploaded<br>certifications.|
||3. The Coordinator selects "Approve" or "Reject" based on the<br>volunteer's qualifications.<br>4. The system updates the application status in the MySQL database.<br>5. The system triggers a notification to the volunteer.|



**Table 2.13 Use Case Description for View Reports and Generate Certificates** 

**<u>UC UC-12 and UC-19</u>** 

42 

|**Identification**||
|---|---|
|**Use Case Name**|View Reports and Generate Certificates|
|**Description**|Allows staff to view impact data and issue verified proof of service to<br>volunteers.|
|**Actor**|Volunteer Coordinator / Org Admin|
|**Pre-condition**|Volunteers must have completed shifts with verified attendance records.|
|**Post-condition**|A data-backed report or a PDF certificate is generated by the system.|
|**Basic Flow**|1. The user navigates to the "Reporting" or "Certificates" section.|
||2. The system aggregates hours and participation data for the selected<br>period or volunteer.<br>3. The user selects "Generate Report" or "Issue Certificate".<br>4. The system produces a PDF document containing the verified service<br>milestones.|



**Table 2.14 Use Case Description for Broadcast Urgent Shift Notification** 

|**UC**|**UC-18**|
|---|---|
|**Identification**||
|**Use Case Name**|Broadcast Urgent Shift Notification|
|**Description**|Allows coordinators to instantly notify qualified volunteers of<br>immediate coverage needs.|
|**Actor**|Volunteer Coordinator|
|**Pre-condition**|A critical shift remains unfilled or requires additional personnel.|
|**Post-condition**|Targeted volunteers receive an immediate notification alert.|
|**Basic Flow**|1. The Coordinator selects an event requiring urgent coverage.|
||2. The Coordinator inputs the message and triggers the broadcast.|



43 

|3. The system filters volunteers based on matching skills and location.|
|---|
|4. The system sends the notification to the identified volunteer pool.|



**Table 2.15 Use Case Description for Logout and Security Utilities** 

|**UC**<br>**Identification**|**UC-20, UC-21, and UC-22**|
|---|---|
|**Use Case Name**|Logout and Security Utilities|
|**Description**|Handles the secure termination of sessions and system feedback for<br>errors or password verification.|
|**Actor**|All Actors|
|**Pre-condition**|The user must be currently engaged with the system interface.|
|**Post-condition**|The session is securely closed or the user is informed of a processing<br>error.|
|**Basic Flow**|1. The user selects the "Logout" option or attempts an action requiring<br>password verification.<br>2. The system invalidates the current session token.<br>3. If an action fails, the system triggers a relevant error message (UC-21).<br>4. The system redirects the user to the login/landing page|



### **2.5.4.2 Sequence diagram** 

44 



<!-- Start of picture text -->
I sign-up Page Auth Controller User Model<br>Volunteeer : i i r<br>enter name , email, password & skills’ ' ' :<br>click "register" ' ' '<br>‘select a payslip period ‘ ‘ :<br>7 t—POST/ api/register (data) validate(data) ‘<br>; INSERT INTO users<br>£._...... Success<br>'1 [i]‘  created & Success, “oo===="user object --7- >">" >> 4 : Volunteer Sign-up<br>..-----. Display Success& .__....-_ Message H '<br>Redirect to Dashboard ' '<br>Event Dashboard Controller Event Model MySQL Database<br>tq Checkin<br>Volunteeer ' ' ' r<br>Select "Scan QR Code<br>Request GPS/Camera Acces '<br>Scans Event QR Code H H '<br>' POST/(QR_Data,lat/long)api/Gheck-i verifyGeoFence; '<br>i i SELECT event_location<br>' ' Location Data<br>woos"valid Textfion 777-777 ~<br>' ' UPDATE attendance_logs (check_in_time)<br>i dee. “check_inDisplaySuccessful" lull |7<br><!-- End of picture text -->



<!-- Start of picture text -->
Chatbot Interface Ai Controller Service History<br>Volunteeer : H : 7<br>il "Howmany hourshave i ' : :<br>; : OST! api/query getVolunteerHours(user_id)<br>' : SELECT event_location<br>t : Location Data<br>‘ : ----7-4"25Hours total™"~---~<br>' : Request Natural Language Response(Prompt + History)<br>' : _---------You have completed 25 hours of service!”<br>: fo Al Message’--~~>>> |<br><!-- End of picture text -->



<!-- Start of picture text -->
tk Admin Dashboard Event Controller Event Model MySQL Database<br>Cogrdinator H H H 1<br>Select "Create NEw Event" ' ' ‘<br>‘Show Event Form ‘ ‘ '<br>nter Title, Skills, and Shifts - H ‘<br>Click "Publish"<br>'OST/ api/events/store<br>‘ ' INSERT INTO events<br>H ' create(event_data)<br>: ' success<br>' ‘ ~--"""""Event Object -------~<br>' — Message --------<br>i<€-----~-Display Al Message-----------3 ' ' ‘<br><!-- End of picture text -->



<!-- Start of picture text -->
Review Panel Controller Application MySQL Database<br>tk . Application _—<br>Coardinator H } H 7<br>iew Application List ' '<br>GET! api/ applications/pending ' '<br>>" Display Applications ~~ ~~~> ~~ : H<br>Click "Approve" for Voluntee '<br>: Select * from applications where status equals pending<br>' PUT /APl/applications/ n<br>‘ {id}/approve '<br>:: 7H a ee list of applications<br>: update status("approved") 1<br>' ' update application status<br>' ' o> 7" "7 ">" "success “77777777<br>: ‘ ~~~ "Notification Trigger” ~~ ~~<br>' th UI to "Approved------<br><!-- End of picture text -->



<!-- Start of picture text -->
k AuperAdmin _<br>General Admin ! Tenant Controler4 : Mysat DatabaseH<br>‘Add New NGO ' : i<br>‘Show Organization Form ' '<br>Enter NGO Name and. ' ' '<br>admin Email H<br>Click "Create Tenant"<br>‘OST! apitendants/create’<br>‘ ' INSERT INTO organizations<br>H ' Initialize tenant{data)<br>H'<br>'' success (Tenant_ID created)<br>H Hy OTSTgucmess OTT<br>H‘<br>H‘<br>' ' ] Display ee<br>H 1 tenant created successfully" 7<br>::<br>: :<br><!-- End of picture text -->



<!-- Start of picture text -->
Dashboard Report Controller Stats Engine MySQL Database<br>me Analytics -<br>Org Admin H H H ;<br>Generate Monthly i : : : . ' :<br>mpact report GET/ api/ appli/reports. : :<br>/impact/month=Appril ‘ '<br>aggregate data :<br>H SUM<br>compiled stats aa ~77>>""Data Result"=="-"~+<br>.---- Render Charts ________- ee<br>and Data Tables '<br>Display Graphical Impact Report - '<br><!-- End of picture text -->



<!-- Start of picture text -->
fo l a<br>Submitted<br>L }<br>ordinator Opens Application<br>a 7<br>Under Review<br>. D,<br>ra (omos Not Met<br>Approveda raRejected—,<br>ee 7 se _<br>ra Volunteerwom Scan Success<br>Cancelled, raChecked_In™<br>ea<br>Mt_<br>Ended & Hours Logged<br>.<br>o ~y<br>Completed<br>L l P<br><!-- End of picture text -->



<!-- Start of picture text -->
' Pending Verification |<br>bs Verified<br>Active<br>Policyyaa Requests Deletion<br>a ~ ic - »<br>Suspended Deactivated<br>Me Ne | _<br><!-- End of picture text -->



<!-- Start of picture text -->
al 7,<br>Draft<br>‘ _/<br>7 bn Saves & Pasts<br>Published~<br>ia _!<br>Under-staffedomeaTime Reached<br>Urgent_Broadcast7 caIn_Progress7)<br>Oe a _<br>ca bs TimeReached™,<br>Finalizing<br>Me -<br>i ben Generated<br>Archived<br>ba |<br><!-- End of picture text -->



<!-- Start of picture text -->
Idle<br>L P.<br>User Opensom Timeout/Closed<br>o ,<br>Listening<br>\. r,<br>< oe“s Sent<br>Processing<br>(F ercninL peOne:  Database<br>iching_Cont xt |<br>_Terening Sv Onrext Response Rendered<br>L y,<br>i be to Gemini API<br>Generating Responseoy<br>L y,<br>et Received<br>i oy<br>Displaying<br>L D,<br><!-- End of picture text -->



<!-- Start of picture text -->
ie l aN<br>bsProvisioning “3|<br>@ bee schemaSs  Created<br>Pending_Onboarding<br>‘el aa<br>b Admin Password Set<br>(active |<br>A<br>System von AeComplete Subscription/License Expired ‘Payment Received<br>has 2 é a<br>NMaintenance | | Frozen<br>y, NS y,<br>|<br>( Terminated ben Closed<br><!-- End of picture text -->



<!-- Start of picture text -->
a ° ~<br>|_Volunteer navigates to Sign-up page |<br>a y 7,<br>| Enter email, password, and basic info<br>rr<br>io Es Email™y already exists?a a ™,<br>| Display “Email taken" error | | Enter skills and availability |<br>Me ae<br>6 | Submit Registration<br>‘i y<br>Me System creates isolated tenant record “<br>| System sends verification email |<br>a “y<br>\ Display “Registration Successful” )<br><!-- End of picture text -->



<!-- Start of picture text -->
selects "Check-In" on mobile |<br>(Volunteer ~<br>rn<br>a requests Camera and GPS access ]<br>| Display “Permissions Required" error | | Scan Event OR Code ©<br>| System captures current Coordinates |<br>i Display_ “You must be at the location”| errorNF Log Check-in—Timestamp ‘<br>S fo. oY<br>( Notify Coordinator of arrival )<br>| Update status to "Active" |<br><!-- End of picture text -->



<!-- Start of picture text -->
( Votunteer opens Chatbot |<br>~~ _—<br>|“aUser types: "When is my next shit?”a|<br>| System retrieves UserID and Session |<br>Op<br>_ System queries Local DB for upcoming events |<br>| Format data as prompt for Gemini Al |<br>Me as<br>oo<br>| Send prompt to Gemini API |<br>wo a<br>| Receive natural language response |<br>ann ™<br>Display response to Volunteer<br><!-- End of picture text -->



<!-- Start of picture text -->
logs into Dashboard |<br>[coordinator ~,J<br>f a<br>| EREE "Create New Event |<br>a<br>|Me Input Eveni Title, Date, and Location |<br>a<br>_ Define Required Skills and Shift Capacity |<br>ra a<br>Highlight missing fields | Save to MySQL Database |<br>ee ee ae<br>ra a i ™<br>‘, Retum to form é |NN System filters matching Volunteers f|<br>~ y<br>Ms Send “New Opportunity” notifications !<br>f ; “<br><!-- End of picture text -->



<!-- Start of picture text -->
if M ~<br>|SeCoordinator views "Pending Applications”-<br>( setect a specific Volunteer Applicaton<br>| Review uploaded Documents (Certificates/ID) |<br>|( , £ ,<br>She Enter Rejection Reason ra| |MaUpdate status to "Approved" rs|<br>a rn<br>Update status to “Rejected” | Notify Volunteer |<br>eei™eei Se™<br>|Me,Notify Volunteer “| Me,| Assign to requested Shift “|<br>| Update Event Capacity |<br><!-- End of picture text -->



<!-- Start of picture text -->
a ? ™~<br>| Coordinator selects "Broadcast Urgent Alert”<br>a<br>( System identifies "Under-staffed” shifts )<br>ws<br>a*<br>LSelect target shift and enter message )<br>| System identifies qualified Volunteers in area |<br>Fy ” Fi ”<br>Send Push Notification Send SMS/Email Alert<br>o™<br>|<br>te Wait for "Emergency Join" responses “|<br>a<br>| Automatically fill slot on first-come-first-serve basis |<br><!-- End of picture text -->



<!-- Start of picture text -->
[ Genera Admin logs into System Panel~,J|<br>rr<br>ss NGO Name and primary Admin email |<br>a<br>\_ System creates unique Tenant Identifier_<br>a<br>|we Initialize isolated Schema/Data partition |<br>| Generate default configuration (Branding/Settings) |<br>~<br>Send Invitation linktoNGO Admin |<br>i NF a<br>* Grant "Organization Admin” permissions “oN, Mark as “Pending Onboarding” -<br>rae a<br>| Update Status to "Active Tenant” |<br><!-- End of picture text -->



<!-- Start of picture text -->
Authenticatable ;<br>i ne a +tenant_id: UUID<br>+validateCredentials(): bool fst eae ed<br>+generateToken(): string seenietsillentes<br>\\ +initializeSchema(): void<br>I1<br>|<br>isolates<br>+password_hash: string pene tet<br>+resetPassword(): void Remsen Gooreneet: 008!<br>receives (\ 0..*<br>© ChatSession<br> Volunteer © «Service» © Staff ©<br>+skills:+total_hours:a json float uses |+model_version:GeminiAlService=  string- pester aapTAvCr +session_id:+start_time:+end_time: datetime UUIDdatetime<br>1 +closeSession(): void<br>Submitsa © Applicationz ©,’MediaManager © ChatMessage-<br>+app_id: int - +message_id: int<br>+status: string uploads} +file_path: string +sender_id: int<br>+logAuditTrail(): void SCE)p () | a echeideaitpe aking<br>@ Attendance 0.1 - +is_ai_response: bool<br>+attendance_id: UUID —$——————<br>+check_in: datetime © ServiceRecord ——_—_—_<br>+check_out:Stusattingdatetime P +record_id: int 1 a |@@ NeuralcontextstoreNeuralContextStore<br>+verification_method: string +calculateDuration(): float +context_path: string<br>i satsaiearcenaate a bool +refreshContext(texi): void<br><!-- End of picture text -->



<!-- Start of picture text -->
<><br>Ce) om Ca ‘<><br>cD en <p<br><>:<br>=)<br>Tenant & Staff Management netiore<br>F,<br>o<<br>; XS nD<br>org_name_id Ma)<br>a ‘<p | fe ry<br>Sad A CS Ld Qo [\=<br>eh <PC><br>Domain<br>Core Coe DG & Certification<br> a IY Attendance<br>Cais)<br>C - has.a<br>tite 2 Crane”) <> fe10> ea) 1 | QReheckin | —<br>Keaton gp Ci) | (GPS Verified)<br>-<br>Gogoi) an = | >| et DynanicmeGPS _ “by<br>creales user_{d<br>S © , QP<br>@ —<br>i ea) !<br>Pa] Ow] pes<br>1 Gun<br> — =)<br>we \ d Ce) | Austral& Compliance<br>ONC, CD)<br>conteat_-“ 4<br><i Gua ve<br><!-- End of picture text -->



<!-- Start of picture text -->
@ Dashboard<br>ZB Live Playground<br>S Knowledge Base<br>% Personality & Tone<br>Live Playground D Test Logic Live Query Log [ ]<br>© Context & Security<br>ANALYTICS<br>What are the policies for weekend volunteer shifts<br>& Query Logs in the NY branch? a “How do I log my hours for the food drive yesterday?”<br>3% Hallucinations 2<br>Based on the current guidelines for the NY<br>branch, weekend volunteer shifts require a<br>minimum commitment of 4 hours. You must also<br>complete the ‘Weekend Safety Protocol’ module<br>prior to your first shift “Can I bring my dog to the indoor shelter painting event?” |<br># adjust Logic<br>Admin User<br><!-- End of picture text -->



<!-- Start of picture text -->
© VolunTrack MonitorLive andAttendanceverify incomingQueuevolunteers for today's shifts. Tue OO<br>a<br>MAIN<br>Q V All Tasks v<br>@ Dashboard<br>| A Attendance Total Expected: 145 @ On-Site: 82 ®@ Pending: 58 @ Late: 5 @<br>42 Volunteers Elena Rodriguez<br>Marcus Johnson 08:45 AM Tare Vol ID: 89302<br>&% Schedules ID: 84726 Security Team Shift: 09:00 AM in-Site<br>SYSTEM (5 Shift: 09:30 AM - 05:00 PM<br>% Settings Elena Rodriguez —<br>ID: 89302 Registration Shift:eee 09:30eeeAM © Pending Manual Check-in Pending Action<br>for David Chen Late (25m)<br>é ID: 87291 Crowd Control Shift:caath08:00 *AM 4 Flagged CURRENT STATUS METHOD<br>Awaiting Scan or Manual<br>Override Entry<br>SJ Sarah Jenkins pears<br>RO ™ eae ie © Pending<br>IESSSES) USarertty ees fever eater = Volunteer Signature Required<br>& Aisha Patel 7: M<br>a ee dade v On-Site Sign here<br>Clear Pad<br>4j* Force Check-in<br>Sarah Jenkins Sroe Scan OR Code<br>Shift Manager<br>#2 _ AI Conflict Detection =<br><!-- End of picture text -->



<!-- Start of picture text -->
©} Guardian Queue Overview Applications Interviews Q Search applicants... ray &<br>Review Queue 74 Pending . Staff Context<br>Sarah Jenkins © 94% Internal notes and history<br>Y Filter 42 sort Registered Nurse + Volunteer since 2021 + Seattle, WA OVERALL MATCH<br>Sicontact Export Resume ezavid R. ssfoday,gos aaa10:42.<br>(‘s4%)) SarahAyPeleeJenkinsh ine emsnt ite Validatedportal. Everything her medical checks licenseout. viaHighly the state<br>Medical Logistics $ Inneciate start | | recommendfor the triage tent.<br>Skills Alignment io Reliability History Excellent<br>= Marcus Chen pee<br>Aepiaed thea ‘® System flagged background check as Clear.<br>Translation Adenin Leadership, bpeperreaeees—ax Yesterday, 4:15 PM<br>£ On-Time Arrival 95% @ sichaer +. Oct 12, 2023<br>65%) Applsed’40Elena Rodriguezago Medical —EEE Worked with Sarah duringa the flood relief:<br>mriver Security= oneeieen,” 42 1 150+ lastNeedsyear. no supervision.Exceptionalag under pressure.<br>¢Crisis Mgt Sa aa nos WFloodRelief23 Leadership<br>() Medical_License_WA.pdf ae<br>STATE OF WASHINGTON SEAL<br>Department of Health<br>>) Al DRAFTED FEEDBACK (MISSING CPR CERT) Edit<br>Hi Sarah, we'd love to have you onboard, but we need an updated CPR certificate before approval.<br>Could you upload the latest copy?<br>Decline & Send er Te ™ PEE<br>Feedback Move to Waitlist - PE PF Add a note... a<br><!-- End of picture text -->

# **CHAPTER THREE** 

## **System Design** 

## **3.1 Introduction** 

The system design phase is examined in this chapter as a critical step in translating the requirements defined in the previous chapters into a concrete, implementable software solution. This phase establishes the architecture, modules, components, and data structures necessary to satisfy all specified requirements for the Volunteer Management System. The system is designed with modularity and flexibility at its core, ensuring that individual components such as the AI chatbot, the multi-organization workspace, or the reporting module can be updated or extended without disrupting the platform as a whole. This chapter takes a step-by-step approach, covering the system's purpose, design goals, current state of volunteer management software in context, proposed architecture, data management strategy, and security considerations. 

## **3.2 Purpose of the System** 

The proposed system is designed to transform volunteer coordination operations for NGOs and non-profit organizations through a centralized digital platform. The main goals of the system are: 

- **Digitize volunteer operations:** Replace paper-based sign-up sheets, manual scheduling, and scattered spreadsheets with a unified web platform that manages the full volunteer lifecycle from registration to milestone recognition. 

- **Enable multi-organization management:** Provide each organization with its own isolated workspace, allowing multiple NGOs to operate independently on a shared platform without interfering with one another's data or workflows. 

- **Automate coordination workflows:** Eliminate manual scheduling conflicts and attendance errors through automated shift assignment, QR-based check-in, and realtime availability tracking. 

- **Empower volunteers through self-service:** Give volunteers direct access to their schedules, service history, and progress through a dedicated portal, reducing routine communication overhead on coordinators. 

64 

- **Integrate intelligent assistance:** Deploy an AI-powered chatbot that allows volunteers to interact with the system naturally, retrieving information without navigating complex interfaces. 

- **Strengthen organizational accountability:** Equip administrators with automated impact reports and service hour summaries that support donor reporting and strategic decision-making. 

## **3.3 Design Goals** 

The Volunteer Management System is built around key non-functional requirements including reliability, scalability, usability, and security to ensure it serves both organizations and volunteers effectively across varying operational contexts. Design goals are aligned with the needs of the two primary stakeholder groups: end users and the development team. 

From the user perspective, important design goals include: 

- Provide an intuitive, role-appropriate interface for Administrators, Coordinators, and Volunteers 

- Ensure accurate and consistent tracking of volunteer hours, attendance, and service milestones 

- Maintain responsive system performance across devices and screen sizes 

For the development team, key design goals include: 

- Apply a modular component structure that allows features to be developed, tested, and extended independently 

- Design a scalable database schema capable of supporting a growing number of organizations and volunteers 

- Implement robust access control ensuring strict data isolation between organizations on the shared platform 

### **3.4 Current Software Architecture** 

Volunteer management in most NGOs and community organizations currently relies on a fragmented combination of manual and basic digital tools. There is no unified software platform handling the end-to-end coordination of volunteers. Recruitment is typically managed 

65 

through email campaigns or social media posts, while scheduling is handled through shared spreadsheets or WhatsApp groups. Attendance is recorded manually on paper sheets during events, and service hours are tallied at the end of each period by coordinators without any automated support. 

In cases where organizations have attempted partial digitization, they use general-purpose tools such as Google Forms for registration and Google Sheets for tracking tools that were not designed for volunteer management and therefore lack features such as role-based access, automated notifications, shift conflict detection, or impact reporting. This fragmented approach results in data inconsistencies, scheduling errors, poor volunteer engagement, and an inability to generate accurate reports for donors and stakeholders. The absence of an integrated solution underscores the need for a purpose-built platform that addresses these gaps comprehensively. 

## **3.5 Proposed Software Architecture** 

The proposed software architecture for the Volunteer Management System aims to unify and streamline volunteer coordination operations for multiple organizations through a single, centralized web-based platform. It ensures efficient, secure, and scalable management of all volunteer-related activities across organizations of varying sizes. By replacing fragmented manual methods including spreadsheets, paper attendance sheets, and informal communication channels with an integrated digital solution, the architecture directly addresses the inefficiencies and data inconsistencies identified in the current state. The system is built entirely around the Model-View-Controller (MVC) architectural pattern, implemented natively through the Laravel framework, providing a clean separation of concerns across all layers of the application. 

## **3.5.1 Architectural Pattern** 

### **Model-View-Controller (MVC) for the Web Platform** 

The MVC pattern organizes the entire application into three clearly defined and interconnected layers, promoting modularity, maintainability, and scalability across the platform: 

**Model:** Encapsulates all business logic and data operations within the system. The Model layer is responsible for managing volunteer profiles, organization workspaces, event and shift data, attendance records, service hour calculations, impact scores, and certificate generation logic. It 

66 

interacts directly with the MySQL database through Laravel's Eloquent ORM, ensuring data integrity, enforcing relationships between entities such as organizations, volunteers, and events, and keeping all data access logic completely independent from the presentation layer. 

**View:** Serves as the presentation layer of the system, responsible for rendering role-specific interfaces for Administrators, Coordinators, and Volunteers. Built using Laravel Blade templating combined with Tailwind CSS and Alpine.js, the View layer delivers responsive, dynamic interfaces tailored to each user role. Volunteer-facing views present shift schedules, service history, and chatbot interactions, while coordinator and administrator views expose dashboards, scheduling tools, reporting modules, and organization management panels. The View layer receives only the data it needs from the Controller and contains no business logic of its own. 

**Controller:** Acts as the intermediary between the Model and the View, processing all incoming HTTP requests, enforcing authentication and authorization rules, and directing data flow across the application. Built with Laravel's routing and controller system, this layer handles volunteer registration and onboarding flows, shift assignment requests, attendance submissions from QR check-in, chatbot query routing to the Gemini API, certificate generation triggers, and report generation requests. The Controller validates all inputs before passing them to the Model and ensures that each request is served only to users with the appropriate role and organizational context. 

### **How the Layers Interact in the VMS Context** 

The three layers work together to deliver a seamless, role-aware experience across the platform. When a volunteer scans a QR code at an event, the Controller receives the check-in request, verifies the volunteer's identity and organizational membership, instructs the Model to record the timestamped attendance entry against the correct event and shift, and returns a confirmation response rendered by the View. Similarly, when a coordinator generates an impact report, the Controller processes the request, the Model queries and aggregates volunteer hours and performance data from the database, and the View renders a formatted summary ready for export. 

This unified MVC architecture creates a coherent, API-friendly platform where all features including multi-organization isolation, AI chatbot integration, automated certificate 

67 



<!-- Start of picture text -->
Laravel Backend (MVC)<br>MVC Layers<br>Controller<br>(HTTP Routing, Auth & Control<br>7. Al Chathot Integrationa4; mn 4, Passes Data for ‘oe j<br>rey 8. . DispatchesDispatches NotifNotifications Rendering 2, Queries && UpdatesUpdates DatData<br>External Services<br>Gemini API & APIsNotification Serviceoe View|mn 1. SendsHTTP Requests / ne Model|oe 3. Session2 & Queue<br>(Al Chatbot Subsystem) (Email!.  SMS Alerts) (Blade Templates & UI OR Scans (Business Logic & Eloquent Management<br>Rendering} ORM)<br>5, Returns Compiled 6, Reads/Writes (Eloquent<br>HTML/Assets ORM)<br>\ Client Layer | Persistent Storage Subsystem<br>{U. WeBrose ; MySQL Database Redis Cache<br> QR Scanning, Geo API (Relational Storage} (Sessions & Job Queue)<br>a ¥,<br>Client-side Geolocation APL 2<br><!-- End of picture text -->

**1. User & Organization Management Subsystem** Handles secure access, role-based authentication, and multi-organization workspace isolation. 

   - **Role-Based Access Control (RBAC):** Enforces authentication and permission boundaries for Volunteers, Coordinators, and Administrators, ensuring each user accesses only what their role permits within their organization. 

   - **Multi-Organization Isolation:** Ensures each registered organization operates within its own scoped workspace, preventing any cross-organization data access on the shared platform. 

   - **Profile Management:** Handles volunteer registration, skill and availability updates, profile deactivation, and cross-organization volunteer account linking. 

   - **Organization Onboarding:** Manages the registration and configuration of new organizations onto the platform, including defining roles and workflows specific to each organization. 

**2. Event & Shift Management Subsystem** Oversees the full lifecycle of volunteer events and shift coordination. 

   - **Event Creation & Management:** Allows coordinators to create, edit, and publish volunteer events with defined requirements, locations, and timeframes. 

   - **Shift Scheduling:** Enables coordinators to define shifts within events, set volunteer capacity per shift, and manage assignments based on volunteer availability and skills. 

   - **Conflict Detection:** Automatically identifies and flags scheduling conflicts when a volunteer is assigned to overlapping shifts. 

   - **Urgent Shift Broadcasting:** Allows coordinators to instantly notify all qualified available volunteers when a shift requires emergency coverage. 

**3. Volunteer Coordination Subsystem** Manages the relationship between volunteers and their assigned tasks across organizations. 

   - **Skill-Based Matching:** Filters and suggests volunteers for tasks based on their registered skills and current availability. 

   - **Self-Service Shift Selection:** Allows volunteers to browse open shifts and register themselves without waiting for manual coordinator assignment. 

69 

   - **Service Hour Tracking:** Automatically accumulates verified volunteer hours based on confirmed attendance records. 

   - **Impact Score Calculation:** Computes each volunteer's impact score based on hours contributed, task complexity, and reliability history. 

**4. Attendance & Check-in Subsystem** Handles accurate, verifiable attendance recording for all volunteer events. 

   - **QR Code Generation:** Produces unique QR codes per event or shift that coordinators display at the venue for volunteer check-in. 

   - **QR-Based Check-in:** Allows volunteers to scan the event QR code to register their attendance instantly without manual logging. 

   - **Geo-location Verification:** Captures the volunteer's browser-reported location at the time of check-in and validates it against the registered event location. 

   - **Attendance Records Management:** Stores timestamped check-in and check-out data linked to the correct volunteer, shift, and organization. 

**5. AI Chatbot Subsystem** Provides volunteers with intelligent, natural language access to their personal system data. 

- **Gemini API Integration:** Routes volunteer queries through the Gemini API, which processes natural language input and returns contextually accurate responses based on system data. 

- **Query Handling:** Responds to volunteer questions regarding upcoming shifts, accumulated service hours, event details, and milestone progress without requiring navigation through the interface. 

- **Context Management:** Maintains conversational context within a session to handle follow-up queries coherently. 

**6. Reporting & Recognition Subsystem** Generates impact summaries and automates volunteer recognition workflows. 

- **Impact Reporting:** Produces organization-level reports summarizing volunteer hours, event participation rates, and contribution trends for use in donor reporting and strategic planning. 

70 

   - **Automated Certificate Generation:** Automatically generates and issues downloadable PDF certificates to volunteers upon reaching defined service milestones, using DomPDF integrated within Laravel. 

   - **Volunteer Service History Export:** Allows individual volunteers to export their verified service records for use in academic or professional applications. 

   - **Announcement Board:** Provides coordinators with a communication channel to post event-specific or organization-wide updates visible to relevant volunteers on their dashboards. 

**7. Database Subsystem** Manages all persistent storage and data operations across the platform. 

   - **MySQL Storage:** Stores all organizational data including volunteer profiles, event records, shift assignments, attendance logs, service hours, and generated reports in a structured relational schema. 

   - **Redis Cache:** Handles session management, frequently accessed data caching, and background job queuing to maintain responsive system performance under concurrent usage. 

   - **Data Access Layer:** Provides standardized data operations for all subsystems through Laravel's Eloquent ORM, ensuring consistent and secure interaction with the database. 

   - **Backup Functionality:** Performs scheduled database backups to protect against data loss and maintain platform integrity across all hosted organizations. 

By decomposing the Volunteer Management System into these seven subsystems, the architecture ensures an organized, secure, and scalable approach to managing volunteer coordination across multiple organizations, enabling seamless feature integration and longterm platform growth. 

71 



<!-- Start of picture text -->
“a lser Interface pew<br>| ' ’ ’ ' ’<br>{| User &Organization - ; . 1<br>Management Event & Shift Management Volunteer Coordination Attendance & Check-in Al Chathot Reporting& Recognition<br>=f Database Subsystem {><br><!-- End of picture text -->



<!-- Start of picture text -->
Volunteet Management System — UML. Component plagram {<br>{capes unre ope pee | fae te, £. i<br>; i} = :<br>| it + i<br>H ‘AutnControtier ‘OrgWorkspaceMansger it EventControtler sShinescheduter H<br>{Ticcyroon vom conatn | {Titeyraes aunanceechoein }<br>' it = |<br>| it oO i<br>H ‘SkiliMatchingEngine ServiceHourtracker, b it QRCheckinControtier AttendanceRepository 5 H<br>tt sc eng rice shi tea dein sec ee no Pt i geranean: pence wy Aire recant hacia aaron i}<br>[7 <ettewne ar caamer | {Sion paren Reopen i<br>| it = |<br>| 1 | = ran |<br>H catnotControtier GeminiaPtadapter wr ReportGenerator | certmcatetngine ot. H<br>i: ; =f— wysatseore | i|<br>es | Sear | | cepa | | Sn i<br>i | | | | i<br><!-- End of picture text -->

- **QR Code Scanner:** Activated through the browser camera during volunteer event check-in, reading the event-specific QR code generated by the system. 

### **2. Server Infrastructure** 

Hosted on a standard Linux-based web server environment: 

- **Nginx / Apache:** Reverse proxy handling all incoming HTTP requests and routing them to the Laravel application. 

- **Laravel Application:** Core business logic layer implementing MVC architecture, handling routing, authentication, shift management, report generation, certificate generation, and AI chatbot query routing. 

- **MySQL Database:** Primary relational database storing all persistent organizational data including volunteer profiles, events, shifts, attendance records, service hours, and generated reports. 

- **Redis:** In-memory data store handling session caching, background job queuing for certificate generation and broadcast notifications, and frequently accessed query results. 

### **3. External Services** 

- **Gemini API:** Cloud-hosted AI service accessed via HTTPS from the Laravel backend to process and respond to volunteer chatbot queries in natural language. 

- **Notification Service:** External email or SMS gateway invoked by the Laravel backend to deliver shift alerts, urgent broadcast messages, and milestone notifications to volunteers and coordinators. 

### **4. Communication Protocols** 

- **HTTP Request / Response:** Between the web browser and Nginx for all user interface interactions across all roles. 

- **HTTPS API Request / Response:** Between the Laravel backend and the Gemini API for all AI chatbot query processing. 

- **Internal Socket:** Between Laravel and Redis for job queue management and session handling. 

74 



<!-- Start of picture text -->
Volunteer Management System — UML Deployment Diagram<br>chent Device ( Web Server [ Database Server :<br>WNoinx / Apache Mysat<br>Web Browser Loravel Application | | Redts Cache |<br>Volunteer Browzer Application Server External Services ,<br>On Code Scanner the source tee Caen APL<br>colocation API configuration tes Nouiniation Service<br>env ! quewe workers<br><!-- End of picture text -->

For performance optimization, **Redis** serves as an in-memory caching layer that stores frequently accessed data such as active session tokens, volunteer dashboard summaries, and pending job queues for background tasks including certificate generation and urgent shift broadcasts. This reduces database load and ensures responsive system behavior under concurrent multi-organization usage. 

Maintaining data quality and integrity remains a core priority throughout the system. We enforce strict data quality controls through two complementary mechanisms: database-level integrity constraints including foreign key relationships, unique constraints, and non-null rules enforced directly in the MySQL schema; and application-level input validation protocols implemented through Laravel's built-in validation layer, which sanitizes and verifies all incoming data before it reaches the database. 

### **3.5.5.1 EER Diagram** 

The Enhanced Entity-Relationship (EER) Diagram for the Volunteer Management System extends the traditional ER model to provide a more comprehensive and semantically rich representation of the system's data structure. While the standard ER model focuses on entities, relationships, and basic attributes, the EER diagram introduces advanced concepts such as specialization, generalization, and aggregation, making it well-suited for modeling the multiorganization, multi-role complexity of this platform. 

### **Purpose and Role in the System** 

The EER diagram illustrates how the key business entities of the Volunteer Management System  including Organization, User, Volunteer, Event, Shift, Attendance, Certificate, and Report  are interconnected, capturing both structural and hierarchical relationships. It provides a clear visual foundation for the database schema, showing how data flows and relates across organizational boundaries while maintaining strict isolation between organizations sharing the platform. 

### **Key Entities and Relationships** 

- **Organization** is the top-level entity. Each organization has many Users associated with it, each carrying a specific role  Administrator, Coordinator, or Volunteer. This 

76 

generalization relationship captures the shared User attributes while allowing rolespecific specialization. 

- **User** is generalized into three specialized subtypes: **Administrator** , **Coordinator** , and **Volunteer** . Each subtype inherits common attributes such as name, email, and password, while carrying role-specific attributes  Volunteers additionally hold skills, availability, service hours, and impact scores. 

- **Volunteer** participates in a many-to-many relationship with **Shift** through the **Shift Assignment** associative entity, which records the assignment status and timestamps. 

- **Event** is owned by an **Organization** and contains one or many **Shifts** . Each Shift defines capacity, required skills, start time, and end time. 

- **Attendance** is an associative entity linking **Volunteer** and **Shift** , recording check-in time, check-out time, QR verification status, and geo-location coordinates captured at the time of check-in. 

- **Certificate** is a dependent entity linked to **Volunteer** , generated automatically when a volunteer's accumulated service hours cross a defined milestone threshold. 

- **Report** is linked to **Organization** and aggregates data from Attendance and Shift Assignment records to produce impact summaries for donor reporting. 

- **Announcement** is linked to both **Organization** and **Coordinator** , representing broadcasts posted to volunteers within a specific organizational context. 

- **Chatbot Session** is linked to **Volunteer** , capturing the interaction context between the volunteer and the Gemini-powered AI assistant within a session. 

77 



<!-- Start of picture text -->
ca<br>J<br>Ka) /<br>a |<br><><br>| «Ly. ae.<br>7<br>> Atends [\ "<br>WA re<br>=<br>/ ot)<br>Gon)<br><<, Cat) ©<br><!-- End of picture text -->

### **3.5.5.2 Data Model** 

1. **Organization:** Stores the details of each NGO or institution registered on the platform with attributes: org_id, name, email, address, registration_date, status. 

2. **User:** Contains system access credentials and role assignments with attributes: user_id, org_id, full_name, email, password_hash, role, last_login. 

3. **Volunteer:** Extends the User entity with volunteer-specific data including attributes: volunteer_id, user_id, skills, availability, total_hours, impact_score, bio. 

4. **Event:** Represents a volunteer activity organized by an organization with attributes: event_id, org_id, title, description, location, start_date, end_date, status. 

5. **Shift:** Defines specific time slots within an event with attributes: shift_id, event_id, start_time, end_time, required_skills, capacity, qr_code. 

6. **Shift Assignment:** Tracks volunteer-to-shift registrations with attributes: assignment_id, shift_id, volunteer_id, status, assigned_at. 

7. **Attendance:** Records verified check-in and check-out data with attributes: attendance_id, shift_id, volunteer_id, check_in_time, check_out_time, qr_verified, latitude, longitude. 

8. **Certificate:** Stores auto-generated milestone certificates with attributes: certificate_id, volunteer_id, issued_date, milestone_hours, file_path. 

9. **Report:** Stores generated impact reports per organization with attributes: report_id, org_id, generated_by, period, total_volunteers, total_hours, file_path, created_at. 

10. **Announcement:** Stores coordinator-posted broadcasts with attributes: announcement_id, org_id, posted_by, title, message, target_audience, created_at. 

11. **Chatbot Session:** Logs AI chatbot interactions per volunteer with attributes: session_id, volunteer_id, started_at, last_interaction, context_data. 

### **3.5.5.3 Relational Tables** 

_Table 3.1 Relational Tables_ 

|**Field Name**|**Type**|**Key**|**Description**|
|---|---|---|---|
|**ORGANIZATION**||||



79 

|**org_id**|INT|PK|Unique organization<br>ID|
|---|---|---|---|
|**name**|VARCHAR(150)|—|Full name of the<br>organization|
|**email**|VARCHAR(100)|UNIQUE|Official contact email|
|**address**|VARCHAR(255)|—|Physical address of<br>the organization|
|**registration_date**|DATE|—|Date the organization<br>joined the platform|
|**status**|ENUM|—|Organization status<br>(active, suspended)|
|**USER**||||
|**user_id**|INT|PK|Unique system user<br>ID|
|**org_id**|INT|FK → Organization|Organization the user<br>belongs to|
|**full_name**|VARCHAR(100)|—|Full name of the user|
|**email**|VARCHAR(100)|UNIQUE|User login email<br>address|
|**password_hash**|VARCHAR(255)|—|Encrypted password<br>string|
|**role**|ENUM|—|Assigned role<br>(Admin, Coordinator,<br>Volunteer)|
|**last_login**|TIMESTAMP|—|Timestamp of the<br>most recent login|
|**VOLUNTEER**||||
|**volunteer_id**|INT|PK|Unique volunteer ID|
|**user_id**|INT|FK → User|Linked user account|
|**skills**|TEXT|—|Comma-separated list<br>of volunteer skills|



80 

|**availability**|TEXT|—|Volunteer's available<br>days and times|
|---|---|---|---|
|**total_hours**|DECIMAL(8,2)|—|Cumulative verified<br>service hours|
|**impact_score**|DECIMAL(5,2)|—|Calculated volunteer<br>impact score|
|**bio**|TEXT|—|Short volunteer<br>biography|
|**EVENT**||||
|**event_id**|INT|PK|Unique event ID|
|**org_id**|INT|FK → Organization|Owning organization|
|**title**|VARCHAR(150)|—|Event title|
|**description**|TEXT|—|Detailed event<br>description|
|**location**|VARCHAR(255)|—|Physical location of<br>the event|
|**start_date**|DATE|—|Event start date|
|**end_date**|DATE|—|Event end date|
||||Event status|
|**status**|ENUM|—|(upcoming, ongoing,<br>completed)|
|**SHIFT**||||
|**shift_id**|INT|PK|Unique shift ID|
|**event_id**|INT|FK → Event|Parent event|
|**start_time**|DATETIME|—|Shift start date and<br>time|
|**end_time**|DATETIME|—|Shift end date and<br>time|
|**required_skills**|TEXT|—|Skills required for<br>this shift|



81 

|**capacity**|INT|—|Maximum number of<br>volunteers for the<br>shift|
|---|---|---|---|
|**qr_code**|VARCHAR(255)|—|Generated QR code<br>string for check-in|
|**SHIFT**<br>**ASSIGNMENT**||||
|**assignment_id**|INT|PK|Unique assignment<br>ID|
|**shift_id**|INT|FK → Shift|Assigned shift|
|**volunteer_id**|INT|FK → Volunteer|Assigned volunteer|
|**status**|ENUM|—|Assignment status<br>(pending, confirmed,<br>cancelled)|
|**assigned_at**|TIMESTAMP|—|Timestamp of<br>assignment creation|
|**ATTENDANCE**||||
|**attendance_id**|INT|PK|Unique attendance<br>record ID|
|**shift_id**|INT|FK → Shift|Shift being attended|
|**volunteer_id**|INT|FK → Volunteer|Volunteer checking<br>in|
|**check_in_time**|TIMESTAMP|—|Verified check-in<br>timestamp|
|**check_out_time**|TIMESTAMP|—|Verified check-out<br>timestamp|
|**qr_verified**|BOOLEAN|—|Whether QR code<br>verification<br>succeeded|
|**latitude**|DECIMAL(9,6)|—|Volunteer latitude at<br>check-in|
|**longitude**|DECIMAL(9,6)|—|Volunteer longitude|



82 

||||at check-in|
|---|---|---|---|
|**CERTIFICATE**||||
|**certificate_id**|INT|PK|Unique certificate ID|
|**volunteer_id**|INT|FK → Volunteer|Recipient volunteer|
|**issued_date**|DATE|—|Date the certificate<br>was generated|
|**milestone_hours**|DECIMAL(8,2)|—|Service hours<br>milestone that<br>triggered issuance|
|**file_path**|VARCHAR(255)|—|Stored PDF file path|
|**REPORT**||||
|**report_id**|INT|PK|Unique report ID|
|**org_id**|INT|FK → Organization|Organization the<br>report belongs to|
|**generated_by**|INT|FK → User|User who triggered<br>report generation|
|**period**|VARCHAR(50)|—|Reporting period<br>(e.g., Q1 2025)|
|**total_volunteers**|INT|—|Total volunteers<br>active in the period|
|**total_hours**|DECIMAL(10,2)|—|Total service hours<br>logged in the period|
|**file_path**|VARCHAR(255)|—|Exported report file<br>path|
|**created_at**|TIMESTAMP|—|Report generation<br>timestamp|
|**ANNOUNCEMENT**||||
|**announcement_id**|INT|PK|Unique<br>announcement ID|
|**org_id**|INT|FK → Organization|Organization scope<br>of the announcement|



83 

||||Coordinator who|
|---|---|---|---|
|**posted_by**|INT|FK → User|posted the<br>announcement|
|**title**|VARCHAR(150)|—|Announcement title|
|**message**|TEXT|—|Full announcement<br>content|
|**target_audience**|ENUM|—|Audience scope (all,<br>coordinators,<br>volunteers)|
|**created_at**|TIMESTAMP|—|Timestamp of posting|
|**CHATBOT**<br>**SESSION**||||
|**session_id**|INT|PK|Unique chatbot<br>session ID|
|**volunteer_id**|INT|FK → Volunteer|Volunteer using the<br>chatbot|
|**started_at**|TIMESTAMP|—|Session start<br>timestamp|
|**last_interaction**|TIMESTAMP|—|Most recent message<br>timestamp|
||||Stored session|
|**context_data**|TEXT|—|context for coherent|
||||follow-up queries|



### **3.5.5.4 Normalization** 

Normalization is the process of organizing data in a relational database to reduce redundancy and improve data integrity. It involves decomposing larger tables into smaller, well-structured 

84 

ones and defining clear relationships between them to eliminate anomalies during data insertion, update, and deletion. 

The standard normal forms applied in this system are: 

- **1NF (First Normal Form):** Ensures that every field in each table contains only atomic, indivisible values with no repeating groups. In the VMS schema, attributes such as skills and availability are stored as structured text fields linked to individual volunteer records rather than as nested or repeating data within a single row. 

- **2NF (Second Normal Form):** Builds on 1NF by ensuring that all non-key attributes are fully dependent on the entire primary key, eliminating partial dependencies. This is achieved in the VMS schema through the use of surrogate primary keys across all tables, ensuring no attribute depends on only part of a composite key. 

- **3NF (Third Normal Form):** Removes transitive dependencies, ensuring that non-key attributes depend only on the primary key and not on other non-key attributes. In the VMS schema, organizational details are stored exclusively in the Organization table and referenced via foreign keys, preventing volunteer or event tables from redundantly storing organizational data. 

By applying these normalization principles throughout the database schema, the Volunteer Management System maintains data consistency, eliminates redundancy across organizational workspaces, and ensures the integrity of all volunteer coordination records stored on the platform. 

### **3.5.6 Access Control and Security** 

The Volunteer Management System handles sensitive personal data across multiple organizations  including volunteer profiles, attendance records, service histories, and organizational configurations  demanding robust security measures to prevent unauthorized access and maintain strict data confidentiality between organizations sharing the platform. 

User authentication forms the primary security barrier, requiring all Administrators, Coordinators, and Volunteers to verify their identity through unique credentials before accessing the system. The validation process compares submitted login credentials against 

85 

encrypted records stored in the database, ensuring only authorized individuals gain entry to the platform. 

Upon successful authentication, the system generates a secure session token via **Laravel Sanctum** , containing the user's identity, organizational context, and role permissions. This token is transmitted over HTTPS and maintained for the duration of the user's session, serving as the authorization key for all subsequent requests to protected resources. 

For every request to a protected route  such as accessing shift schedules, viewing volunteer records, or generating reports  the server validates the attached token and confirms that the requesting user's role permits the action within their specific organizational context. This creates a continuous, stateless authentication chain throughout each user session. 

**Role-Based Access Control (RBAC)** enforces strict permission hierarchies across three user roles. Administrators possess full configuration rights within their organization, including managing coordinators, configuring workflows, and accessing all reports. Coordinators can create and manage events, assign volunteers to shifts, post announcements, and view attendance data within their organization. Volunteers interact solely with their own profiles, assigned shifts, service history, and the AI chatbot interface. 

Critically, all data access is scoped at the organizational level through Laravel's query scoping mechanism. Every database query is automatically filtered by the authenticated user's organization ID, ensuring that no user  regardless of role  can access, view, or modify data belonging to another organization on the shared platform. 

Comprehensive input validation protocols are applied to all incoming data, including form submissions and file uploads. Laravel's built-in validation layer verifies data types, formats, and constraints before any data reaches the database, rejecting malformed inputs that could indicate injection attempts or malicious activity. File uploads for profile images and exported documents undergo additional validation for file type, size limits, and content structure, ensuring complete data integrity across all system operations. 

## **3.5.7 Global Software Control** 

The global software control mechanism defines the overall execution flow, state governance, and request orchestration across the entire Volunteer Management System. For this multi- 

86 

tenant web platform, control is centralized and structured around the application lifecycle provided by the Laravel framework, ensuring that all operations proceed through a predictable, secure, and verifiable sequence. The global software control architecture is governed by the following core components: 

 **Centralized Request Lifecycle Control:** Every user interaction, from a volunteer scanning an attendance QR code to an administrator generating an organization-wide impact report, enters the system through a single application entry point (public/index.php). The global HTTP Kernel orchestrates the initial execution sequence, bootstrapping core service providers, loading configuration arrays, and passing the incoming request through a uniform execution pipeline. This guarantees a centralized gatekeeping control sequence before execution authority is delegated to individual domain controllers. 

 **Middleware Pipeline Execution:** The system utilizes a sequential middleware pipeline to enforce cross-cutting behavioral concerns globally before any controller-specific business logic is executed. This control layer evaluates incoming requests sequentially: validating session authentication states via Laravel Sanctum, checking against cross-site request forgery (CSRF) vulnerabilities, and sanitizing raw input inputs. Crucially, organizational multi-tenant routing is managed at this control stage, dynamically anchoring the active session context strictly to the user’s authenticated organization ID. 

 **Centralized Error and Exception Handling:** System stability, state preservation, and security under exceptional execution states are maintained by a centralized global exception handler. Instead of allowing localized runtime exceptions or database errors to crash active system operations or expose structural back-end data, all failures—including database transaction timeouts, multi-tenant query boundary violations, or external Gemini API rate-limit overages—are intercepted globally. The handler records the exception characteristics into secure log files and gracefully dispatches a standardized JSON payload or intuitive error view to the client interface. 

 **Asynchronous Background Queue Control:** For tasks that involve significant execution overhead or dependencies on external networks, such as distributing urgent shift broadcasts or compiling extensive analytical data for donor reports, the global control mechanism transfers execution from the primary synchronous web thread to an asynchronous background job queue managed via Redis. This prevents request timeout bottlenecks and thread locking, keeping the primary user interface responsive while managing long-running background tasks through a trackable processing lifecycle. 

87 

## **3.5.8 Boundary Conditions** 

Boundary conditions delineate the operational thresholds, constraint parameters, and structural edge cases within which the Volunteer Management System safely and reliably functions. Explicitly defining these boundaries ensures complete data integrity, prevents platform exploitation, and establishes clear guidelines for graceful degradation when operational constraints are challenged or exceeded. The primary boundary conditions governing the application include: 

- **Multi-Tenant Data Isolation and Query Boundaries:** The absolute logical boundary within the shared platform architecture is the separation of organizational data. Enforced at the Eloquent database abstraction layer through automatic query scoping, every query executing an operation on events, shifts, attendance sheets, or reports is rigidly bounded by the user's authenticated org_id. Any attempt, via direct URL manipulation or malformed parameters, to traverse across this organizational boundary triggers an immediate access violation exception, completely blocking cross-tenant visibility. 

- **Geofencing and Temporal Attendance Thresholds:** The QR-code and GPS-verified checkin module operates within tight spatial and temporal parameters to ensure attendance integrity. For an attendance record to change to a verified state, the volunteer’s captured browser geolocation coordinates must fall within a strict, preconfigured spatial radius (e.g., 100 meters) of the event venue’s reference coordinates. Furthermore, check-in windows are temporally bounded to the active shift duration plus a precise buffer window (e.g., 15 minutes before and after the shift), rejecting any attendance submissions that fall outside these geometric or chronological boundaries. 

- **Volumetric Input and File System Constraints:** To defend against buffer overflows, database degradation, and file storage exhaustion, structural limits are enforced at the input validation layer. Profile images and document uploads are strictly bounded by specified MIME types (e.g., JPEG, PNG, PDF) and file size thresholds (e.g., maximum 2MB). Text inputs across form submissions, such as volunteer skill sets, event descriptions, or natural language prompts sent to the AI chatbot, are capped by maximum character counts configured in both request validation rules and matching database column attributes. 

- **Third-Party API Rate and Quota Limits:** The integration of external processing dependencies, specifically the Gemini API for natural language chatbot operations, establishes a clear external operational boundary. Because the system operates within a defined free-tier 

88 

API framework, interaction frequencies are strictly bounded by volumetric quotas (e.g., a fixed maximum number of requests per minute). The application controls this boundary by implementing client-side throttling and back-end middleware rate limits, intercepting excessive requests before external API exhaustion occurs, and serving a localized, pre-configured automated support message. 

- **Concurrent Session and Queue Lifecycles:** The system's operational threshold under high transactional loads is governed by the configuration limits of the server environment and database connection pools. During flash notification occurrences—such as when a coordinator executes an urgent shift broadcast to notify hundreds of qualified volunteers simultaneously— the volume of concurrent background processes is bounded by the Redis worker capacity and mail server dispatch thresholds, preventing database saturation and ensuring steady, serialized message delivery. 

Citations for references page: 

- [1] CSOs and NGOs in Ethiopia: Partners in Development (Scribd/World Bank source) 

- [2] Nonprofit Learning Lab: How to Address Volunteer Management Challenges (2026) 

- [3] Hager & Brudney, Volunteer Management Capacity in America's Charities (AmeriCorps/Urban Institute, 2021) 

- [4] VolunteerHub: The Scary Side of a Manual Volunteer Management Process (volunteerhub.com, 2024) 

- [5] FastBots: A Guide to Volunteer Management Software for Nonprofits (blog.fastbots.ai, 2026) 

- [6] Wikipedia: Iterative and Incremental Development (en.wikipedia.org) 

89 

90 

