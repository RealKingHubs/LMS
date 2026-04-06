(function () {
  // Cloud Engineering Video Library - Expanded for diverse learning weeks, months, and semesters
  const cloudVideoLibrary = {
    linux: 'https://www.youtube-nocookie.com/embed/IVquJh3DXUA',
    networking: 'https://www.youtube-nocookie.com/embed/IPvYpXCsTqw',
    dns: 'https://www.youtube-nocookie.com/embed/8aGhZkoFGQ',
    cloud: 'https://www.youtube-nocookie.com/embed/SOTamWNgDKc',
    api: 'https://www.youtube-nocookie.com/embed/6sGbRvgqXSw',
    aws: 'https://www.youtube-nocookie.com/embed/3hLmDS179YE',
    azure: 'https://www.youtube-nocookie.com/embed/tDacjnSQipM',
    security: 'https://www.youtube-nocookie.com/embed/inWWhr5tnEA',
    iam: 'https://www.youtube-nocookie.com/embed/KxzlLvnT5Ek',
    database: 'https://www.youtube-nocookie.com/embed/W95qqLMZd9w',
    docker: 'https://www.youtube-nocookie.com/embed/pg19Z8LL06w',
    containers: 'https://www.youtube-nocookie.com/embed/rOTqprHDvw0',
    kubernetes: 'https://www.youtube-nocookie.com/embed/X48VuDVv0do',
    k8s: 'https://www.youtube-nocookie.com/embed/Gtw_d0Y5CX8',
    terraform: 'https://www.youtube-nocookie.com/embed/l5k1aj2VSgQ',
    cicd: 'https://www.youtube-nocookie.com/embed/scEDHsr3APg',
    jenkins: 'https://www.youtube-nocookie.com/embed/e3C7O7-ErHg',
    automation: 'https://www.youtube-nocookie.com/embed/TJ_5KZ0ZlLY',
    monitoring: 'https://www.youtube-nocookie.com/embed/Rv9j8VJc-T8',
    prometheus: 'https://www.youtube-nocookie.com/embed/CmPYrate78U',
    logging: 'https://www.youtube-nocookie.com/embed/Khv7JwMfvCE',
    observability: 'https://www.youtube-nocookie.com/embed/MkSJrVo6xYQ',
    encryption: 'https://www.youtube-nocookie.com/embed/O1JQmVBl5Ck',
    compliance: 'https://www.youtube-nocookie.com/embed/dZFjjBcVPrE'
  };

  const frontendVideoLibrary = {
    html: 'https://www.youtube-nocookie.com/embed/qz0aGYrrlhU',
    semantic: 'https://www.youtube-nocookie.com/embed/kGW8Al_cga4',
    accessibility: 'https://www.youtube-nocookie.com/embed/K54X0RsLTZU',
    css: 'https://www.youtube-nocookie.com/embed/1Rs2ND1ryYc',
    flexbox: 'https://www.youtube-nocookie.com/embed/JJSoEo8JSnc',
    grid: 'https://www.youtube-nocookie.com/embed/sKFACtjZS-g',
    responsive: 'https://www.youtube-nocookie.com/embed/BIp_Li0OsAo',
    animation: 'https://www.youtube-nocookie.com/embed/4eZVD-eFGT0',
    javascript: 'https://www.youtube-nocookie.com/embed/W6NZfCO5SIk',
    dom: 'https://www.youtube-nocookie.com/embed/0fKg7e37bQE',
    async: 'https://www.youtube-nocookie.com/embed/PoRJizFVH94',
    modernjs: 'https://www.youtube-nocookie.com/embed/R9I85RhSKVk',
    react: 'https://www.youtube-nocookie.com/embed/bMknfKXIFA8',
    hooks: 'https://www.youtube-nocookie.com/embed/TNhaISOUy6Q',
    redux: 'https://www.youtube-nocookie.com/embed/iBUJVy8PhqI',
    routing: 'https://www.youtube-nocookie.com/embed/2k0eMzAQilo',
    api: 'https://www.youtube-nocookie.com/embed/-MTSQjw5DrM',
    fetch: 'https://www.youtube-nocookie.com/embed/tYzMGcUty6s',
    graphql: 'https://www.youtube-nocookie.com/embed/eIQh02xuVw4',
    testing: 'https://www.youtube-nocookie.com/embed/Jv3CGLKMl7s',
    jest: 'https://www.youtube-nocookie.com/embed/7r4xVDfy3IM',
    debugging: 'https://www.youtube-nocookie.com/embed/H0XScE08hy8',
    performance: 'https://www.youtube-nocookie.com/embed/0n8BcvsHMvE',
    bundling: 'https://www.youtube-nocookie.com/embed/TAwm87tCMhM',
    cloud: 'https://www.youtube-nocookie.com/embed/J4wpFyXxVlw',
    cicd: 'https://www.youtube-nocookie.com/embed/1hHMwLxN6EM'
  };

  const backendVideoLibrary = {
    javascript: 'https://www.youtube-nocookie.com/embed/W6NZfCO5SIk',
    node: 'https://www.youtube-nocookie.com/embed/Oe421EPjeBE',
    asyncnode: 'https://www.youtube-nocookie.com/embed/XO4BjKWfuTQ',
    modules: 'https://www.youtube-nocookie.com/embed/pU9Q6weUV1o',
    database: 'https://www.youtube-nocookie.com/embed/HXV3zeQKqGY',
    sql: 'https://www.youtube-nocookie.com/embed/HXV3zeQKqGY',
    nosql: 'https://www.youtube-nocookie.com/embed/W95qqLMZd9w',
    mongodb: 'https://www.youtube-nocookie.com/embed/ofme2o29ngU',
    api: 'https://www.youtube-nocookie.com/embed/-MTSQjw5DrM',
    rest: 'https://www.youtube-nocookie.com/embed/6sGbRvgqXSw',
    graphql: 'https://www.youtube-nocookie.com/embed/eIQh02xuVw4',
    websockets: 'https://www.youtube-nocookie.com/embed/vQchiSn5pIQ',
    security: 'https://www.youtube-nocookie.com/embed/inWWhr5tnEA',
    auth: 'https://www.youtube-nocookie.com/embed/2PPSXonhWQw',
    jwt: 'https://www.youtube-nocookie.com/embed/7agoErZk69Q',
    encryption: 'https://www.youtube-nocookie.com/embed/O1JQmVBl5Ck',
    testing: 'https://www.youtube-nocookie.com/embed/r9HdJ8P6GQI',
    unittests: 'https://www.youtube-nocookie.com/embed/SmSJDztKkGU',
    integration: 'https://www.youtube-nocookie.com/embed/7D8xPj7yHFI',
    logging: 'https://www.youtube-nocookie.com/embed/Khv7JwMfvCE',
    monitoring: 'https://www.youtube-nocookie.com/embed/Rv9j8VJc-T8',
    cloud: 'https://www.youtube-nocookie.com/embed/SOTamWNgDKc',
    docker: 'https://www.youtube-nocookie.com/embed/pg19Z8LL06w',
    cicd: 'https://www.youtube-nocookie.com/embed/scEDHsr3APg',
    architecture: 'https://www.youtube-nocookie.com/embed/tpspO9K28PM'
  };

  // Each lesson gets its own embed URL so the curriculum does not keep reusing the exact same iframe source.
  function buildCurriculumVideoUrl(videoLib, preferredKey, sequenceSeed) {
    const videoKeys = Object.keys(videoLib);
    if (!videoKeys.length) return '';

    const fallbackKey = videoKeys[Math.abs(sequenceSeed) % videoKeys.length];
    const resolvedKey = videoLib[preferredKey] ? preferredKey : fallbackKey;
    const baseUrl = videoLib[resolvedKey] || videoLib[fallbackKey];
    const joiner = baseUrl.includes('?') ? '&' : '?';
    const startOffset = (Math.abs(sequenceSeed) * 47) % 780;
    return `${baseUrl}${joiner}rel=0&start=${startOffset}`;
  }

  function buildLearningWeeks(videoLib, trackKey, semesterNumber, monthNumber, lessons, videoKeys) {
    return lessons.map((lesson, index) => ({
      id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w${index + 1}`,
      title: `Week ${index + 1}: ${lesson}`,
      objective: `Study the core concepts for ${lesson.toLowerCase()} and complete the guided practice.` ,
      type: 'learning',
      videoUrl: buildCurriculumVideoUrl(
        videoLib,
        videoKeys[index] || videoKeys[0],
        (semesterNumber * 100) + (monthNumber * 10) + index + 1
      ),
      resources: ['Lesson video', 'Reading note', 'Practice task']
    }));
  }

  function buildRevisionWeeks(videoLib, trackKey, semesterNumber, monthNumber, videoKeys = {}) {
    const keys = {
      week1: videoKeys.week1 || Object.keys(videoLib)[0],
      week2: videoKeys.week2 || Object.keys(videoLib)[1] || Object.keys(videoLib)[0],
      week3: videoKeys.week3 || Object.keys(videoLib)[2] || Object.keys(videoLib)[0],
      week4: videoKeys.week4 || Object.keys(videoLib)[0]
    };
    
    return [
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w1`,
        title: 'Week 1: Guided Revision',
        objective: 'Review the semester material with instructor checkpoints and summary notes.',
        type: 'revision',
        videoUrl: buildCurriculumVideoUrl(videoLib, keys.week1, (semesterNumber * 100) + (monthNumber * 10) + 1),
        resources: ['Revision checklist', 'Summary slides', 'Instructor notes']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w2`,
        title: 'Week 2: Mock Assessment',
        objective: 'Attempt the mock assessment and identify improvement areas before the exam.',
        type: 'revision',
        videoUrl: buildCurriculumVideoUrl(videoLib, keys.week2, (semesterNumber * 100) + (monthNumber * 10) + 2),
        resources: ['Mock assessment', 'Marking guide', 'Feedback form']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w3`,
        title: 'Week 3: Project Polish',
        objective: 'Refine your capstone, close outstanding tasks, and prepare for submission.',
        type: 'revision',
        videoUrl: buildCurriculumVideoUrl(videoLib, keys.week3, (semesterNumber * 100) + (monthNumber * 10) + 3),
        resources: ['Project rubric', 'Submission checklist', 'Mentor review notes']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w4`,
        title: 'Week 4: Semester Exam',
        objective: 'Complete the semester exam and submit your final review materials.',
        type: 'exam',
        videoUrl: buildCurriculumVideoUrl(videoLib, keys.week4, (semesterNumber * 100) + (monthNumber * 10) + 4),
        resources: ['Exam brief', 'Exam window', 'Post-exam reflection']
      }
    ];
  }

  function buildSemester(videoLib, trackKey, semesterNumber, title, learningMonths) {
    return {
      id: `${trackKey}-semester-${semesterNumber}`,
      label: `Semester ${semesterNumber}`,
      title,
      months: [
        {
          id: `${trackKey}-semester-${semesterNumber}-month-1`,
          label: 'Month 1',
          title: learningMonths[0].title,
          summary: learningMonths[0].summary,
          phase: 'Learning',
          weeks: buildLearningWeeks(videoLib, trackKey, semesterNumber, 1, learningMonths[0].lessons, learningMonths[0].videos)
        },
        {
          id: `${trackKey}-semester-${semesterNumber}-month-2`,
          label: 'Month 2',
          title: learningMonths[1].title,
          summary: learningMonths[1].summary,
          phase: 'Learning',
          weeks: buildLearningWeeks(videoLib, trackKey, semesterNumber, 2, learningMonths[1].lessons, learningMonths[1].videos)
        },
        {
          id: `${trackKey}-semester-${semesterNumber}-month-3`,
          label: 'Month 3',
          title: learningMonths[2].title,
          summary: learningMonths[2].summary,
          phase: 'Learning',
          weeks: buildLearningWeeks(videoLib, trackKey, semesterNumber, 3, learningMonths[2].lessons, learningMonths[2].videos)
        },
        {
          id: `${trackKey}-semester-${semesterNumber}-month-4`,
          label: 'Month 4',
          title: 'Revision and Exam',
          summary: 'Dedicated revision block, mock test, project polish, and semester exam.',
          phase: 'Revision',
          weeks: buildRevisionWeeks(videoLib, trackKey, semesterNumber, 4)
        }
      ]
    };
  }

  function buildAssessments(trackKey, definitions) {
    return definitions.map((item, index) => ({
      id: `${trackKey}-assessment-${index + 1}`,
      title: item.title,
      semester: item.semester,
      module: item.module,
      brief: item.brief,
      createdAt: item.createdAt,
      dueAt: item.dueAt,
      submissionType: 'Link submission',
      resources: item.resources || ['Repository link', 'Live link', 'Short delivery note']
    }));
  }

  const TRACKS = {
    'cloud-engineering': {
      id: 'cloud-engineering',
      label: 'Cloud Engineering',
      summary: 'Infrastructure, automation, operations, resilience, and production delivery.',
      outcomes: ['Cloud foundations', 'Infrastructure as code', 'Containers and Kubernetes'],
      liveClasses: [
        {
          id: 'cloud-live-1',
          title: 'Live Cloud Operations Review',
          instructor: 'Daniel Okafor',
          schedule: 'Every Tuesday, 18:00 WAT',
          room: 'Room A',
          videoUrl: cloudVideoLibrary.cloud,
          notes: ['Review current week tasks before class.', 'Prepare one deployment question.', 'Capture action items in class notes.']
        },
        {
          id: 'cloud-live-2',
          title: 'Docker and Kubernetes Lab',
          instructor: 'Peace Aina',
          schedule: 'Every Thursday, 19:00 WAT',
          room: 'Lab Room',
          videoUrl: cloudVideoLibrary.kubernetes,
          notes: ['Practice the container build steps.', 'Follow along with the live manifest demo.', 'Submit the lab checklist after class.']
        }
      ],
      announcements: [
        { id: 'cloud-ann-1', title: 'Infrastructure review window is open', body: 'Submit your infrastructure diagrams before Friday to receive review comments during revision month.', date: 'April 5, 2026', createdAt: '2026-04-05T08:00:00Z' },
        { id: 'cloud-ann-2', title: 'Monitoring workshop recording uploaded', body: 'The latest monitoring and alerting session has been added to your learning library.', date: 'April 3, 2026', createdAt: '2026-04-03T09:30:00Z' },
        { id: 'cloud-ann-3', title: 'Semester exam format published', body: 'You can now review the cloud semester exam structure in the revision month section.', date: 'April 1, 2026', createdAt: '2026-04-01T11:00:00Z' }
      ],
      assessments: buildAssessments('cloud-engineering', [
        { title: 'Linux Operations Lab', semester: 'Semester 1', module: 'Linux and Networking Fundamentals', brief: 'Submit the link to your command-line practice log and infrastructure notes.', createdAt: '2026-03-26T09:00:00Z', dueAt: '2026-04-09T23:59:00Z' },
        { title: 'IAM Access Review', semester: 'Semester 1', module: 'Cloud Foundations and IAM', brief: 'Share the link to your IAM policy breakdown and access matrix.', createdAt: '2026-03-29T09:00:00Z', dueAt: '2026-04-12T23:59:00Z' },
        { title: 'Docker Delivery Exercise', semester: 'Semester 2', module: 'Containers and Docker', brief: 'Submit the repository link for your Dockerised sample service.', createdAt: '2026-04-02T09:00:00Z', dueAt: '2026-04-15T23:59:00Z' },
        { title: 'CI Pipeline Walkthrough', semester: 'Semester 2', module: 'Infrastructure as Code and CI/CD', brief: 'Add the link to your pipeline configuration and deployment notes.', createdAt: '2026-04-04T09:00:00Z', dueAt: '2026-04-18T23:59:00Z' },
        { title: 'Kubernetes Reliability Review', semester: 'Semester 3', module: 'Kubernetes and Monitoring', brief: 'Submit the link to your cluster review and observability report.', createdAt: '2026-04-05T09:00:00Z', dueAt: '2026-04-22T23:59:00Z' }
      ]),
      semesters: [
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 1, 'Core Cloud Foundations', [
          { title: 'Linux and Networking Fundamentals', summary: 'Build the operating system and networking base for cloud work.', lessons: ['Linux command line essentials', 'Networking layers and ports', 'DNS, routing, and troubleshooting', 'Cloud-ready shell practice'], videos: ['linux', 'cloud', 'cloud', 'linux'] },
          { title: 'Cloud Foundations and IAM', summary: 'Understand accounts, access control, and core cloud services.', lessons: ['Cloud service models', 'Identity and access management', 'Compute and storage basics', 'Cost awareness and tagging'], videos: ['cloud', 'security', 'cloud', 'cloud'] },
          { title: 'Compute, Storage, and Architecture', summary: 'Design a stable baseline environment for applications.', lessons: ['Virtual machines and autoscaling', 'Storage classes and backups', 'Reference architecture patterns', 'Reliability fundamentals'], videos: ['cloud', 'cloud', 'cloud', 'security'] }
        ]),
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 2, 'Automation and Platform Delivery', [
          { title: 'Containers and Docker', summary: 'Containerize applications and manage repeatable delivery.', lessons: ['Docker images and layers', 'Compose files and local stacks', 'Container debugging', 'Secure image practices'], videos: ['docker', 'docker', 'docker', 'security'] },
          { title: 'Infrastructure as Code and CI/CD', summary: 'Automate environments and deployment pipelines.', lessons: ['Infrastructure as code principles', 'Pipeline design', 'Secrets and environment control', 'Release automation'], videos: ['cicd', 'cicd', 'security', 'cicd'] },
          { title: 'Kubernetes and Monitoring', summary: 'Run applications at scale and observe their health.', lessons: ['Kubernetes core objects', 'Workloads and services', 'Observability basics', 'Scaling and recovery drills'], videos: ['kubernetes', 'kubernetes', 'cloud', 'kubernetes'] }
        ]),
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 3, 'Production Cloud Engineering', [
          { title: 'Resilience and Security Operations', summary: 'Improve uptime, auditability, and incident readiness.', lessons: ['Threat modelling for cloud systems', 'Backup and disaster recovery', 'Policy and compliance basics', 'Incident response workflow'], videos: ['security', 'cloud', 'security', 'security'] },
          { title: 'Data Platforms and Platform Operations', summary: 'Support data-heavy systems and platform operations.', lessons: ['Managed data services', 'Queues and event flows', 'Platform operations handbook', 'Service ownership'], videos: ['database', 'api', 'cloud', 'cloud'] },
          { title: 'Capstone Delivery and Career Readiness', summary: 'Present a production-style cloud delivery project.', lessons: ['Capstone planning', 'Deployment walkthrough', 'Review and optimisation', 'Final presentation'], videos: ['cloud', 'cicd', 'kubernetes', 'cloud'] }
        ])
      ]
    },
    'frontend-engineering': {
      id: 'frontend-engineering',
      label: 'Frontend Engineering',
      summary: 'Modern web interfaces, design systems, performance, testing, and deployment.',
      outcomes: ['Accessible interfaces', 'React applications', 'Production delivery'],
      liveClasses: [
        { id: 'frontend-live-1', title: 'Frontend Studio Review', instructor: 'Mary Johnson', schedule: 'Every Monday, 18:00 WAT', room: 'Studio 1', videoUrl: frontendVideoLibrary.react, notes: ['Bring your current UI build.', 'Review responsiveness before class.', 'Prepare one accessibility question.'] },
        { id: 'frontend-live-2', title: 'Component Testing Session', instructor: 'Samuel Obi', schedule: 'Every Wednesday, 19:00 WAT', room: 'Testing Lab', videoUrl: frontendVideoLibrary.javascript, notes: ['Open your latest component branch.', 'Note one bug from your practice task.', 'Document your test cases.'] }
      ],
      announcements: [
        { id: 'frontend-ann-1', title: 'Revision projects updated', body: 'Semester revision now includes component audit and responsive cleanup tasks.', date: 'April 5, 2026', createdAt: '2026-04-05T07:30:00Z' },
        { id: 'frontend-ann-2', title: 'Live class rubric published', body: 'Review the latest live class grading rubric before your next instructor session.', date: 'April 2, 2026', createdAt: '2026-04-02T13:00:00Z' },
        { id: 'frontend-ann-3', title: 'Portfolio review slots available', body: 'You can now book feedback time for your frontend semester capstone.', date: 'March 30, 2026', createdAt: '2026-03-30T10:00:00Z' }
      ],
      assessments: buildAssessments('frontend-engineering', [
        { title: 'Responsive Landing Page Review', semester: 'Semester 1', module: 'HTML and CSS Foundations', brief: 'Submit the live link for your responsive landing page build.', createdAt: '2026-03-27T09:00:00Z', dueAt: '2026-04-08T23:59:00Z' },
        { title: 'JavaScript Interaction Challenge', semester: 'Semester 1', module: 'JavaScript Core Skills', brief: 'Paste the repository or live link for your interactive UI challenge.', createdAt: '2026-03-31T09:00:00Z', dueAt: '2026-04-13T23:59:00Z' },
        { title: 'React Component System', semester: 'Semester 2', module: 'React Fundamentals', brief: 'Submit the repository link for your reusable component system.', createdAt: '2026-04-03T09:00:00Z', dueAt: '2026-04-16T23:59:00Z' },
        { title: 'API Dashboard Build', semester: 'Semester 2', module: 'Routing, State, and APIs', brief: 'Share the deployed link to your dashboard consuming external data.', createdAt: '2026-04-04T09:00:00Z', dueAt: '2026-04-19T23:59:00Z' },
        { title: 'Frontend Capstone Delivery', semester: 'Semester 3', module: 'Capstone and Portfolio', brief: 'Submit the final hosted capstone link and repository link.', createdAt: '2026-04-05T09:00:00Z', dueAt: '2026-04-24T23:59:00Z' }
      ]),
      semesters: [
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 1, 'Web Foundations', [
          { title: 'HTML and CSS Foundations', summary: 'Understand the base layers of the web and build solid layouts.', lessons: ['Semantic HTML structure', 'Responsive CSS foundations', 'Layout systems and spacing', 'Accessible form patterns'], videos: ['html', 'css', 'css', 'html'] },
          { title: 'JavaScript Core Skills', summary: 'Control behaviour and interactive user flows in the browser.', lessons: ['Variables and functions', 'Arrays, objects, and state', 'DOM updates and events', 'Fetch and async behaviour'], videos: ['javascript', 'javascript', 'javascript', 'api'] },
          { title: 'Responsive UI Delivery', summary: 'Ship polished and maintainable interface work.', lessons: ['Responsive components', 'Animation fundamentals', 'Design handoff practice', 'Mini project delivery'], videos: ['css', 'css', 'html', 'javascript'] }
        ]),
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 2, 'Modern Frontend Development', [
          { title: 'React Fundamentals', summary: 'Build reusable interfaces with component-driven development.', lessons: ['JSX and component structure', 'State and props', 'Hooks for side effects', 'Controlled forms'], videos: ['react', 'react', 'react', 'react'] },
          { title: 'Routing, State, and APIs', summary: 'Manage application state and data flows with confidence.', lessons: ['Client routing', 'State architecture', 'API consumption patterns', 'Loading and error states'], videos: ['react', 'react', 'api', 'api'] },
          { title: 'Testing and Quality', summary: 'Increase confidence through testing and review discipline.', lessons: ['Component testing basics', 'User flow checks', 'Code review standards', 'Performance review'], videos: ['javascript', 'javascript', 'react', 'react'] }
        ]),
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 3, 'Production Frontend Engineering', [
          { title: 'Advanced UI Systems', summary: 'Create durable systems for complex products.', lessons: ['Design system foundations', 'Reusable patterns', 'Accessibility audits', 'Performance budgets'], videos: ['react', 'css', 'html', 'react'] },
          { title: 'Framework Delivery', summary: 'Prepare frontend systems for production deployment.', lessons: ['App architecture planning', 'Server rendering concepts', 'Deployment readiness', 'Observability for frontend'], videos: ['react', 'react', 'cicd', 'cloud'] },
          { title: 'Capstone and Portfolio', summary: 'Ship a polished frontend capstone with presentation support.', lessons: ['Capstone planning', 'Implementation sprint', 'Review and refactor', 'Final walkthrough'], videos: ['react', 'react', 'javascript', 'react'] }
        ])
      ]
    },
    'backend-engineering': {
      id: 'backend-engineering',
      label: 'Backend Engineering',
      summary: 'Server-side systems, APIs, databases, security, testing, and deployment.',
      outcomes: ['API design', 'Database engineering', 'Production backend systems'],
      liveClasses: [
        { id: 'backend-live-1', title: 'Backend Architecture Clinic', instructor: 'Ibrahim Musa', schedule: 'Every Tuesday, 19:00 WAT', room: 'Architecture Room', videoUrl: backendVideoLibrary.node, notes: ['Review service boundaries before class.', 'Bring your latest API contract.', 'Document bottlenecks to discuss live.'] },
        { id: 'backend-live-2', title: 'Database and API Workshop', instructor: 'Ruth Eze', schedule: 'Every Thursday, 18:00 WAT', room: 'Data Lab', videoUrl: backendVideoLibrary.database, notes: ['Complete the schema draft.', 'Review database indexing examples.', 'Prepare one integration question.'] }
      ],
      announcements: [
        { id: 'backend-ann-1', title: 'New API review checklist', body: 'A backend API review checklist is now available in the revision month section.', date: 'April 4, 2026', createdAt: '2026-04-04T08:30:00Z' },
        { id: 'backend-ann-2', title: 'Exam support session confirmed', body: 'A live exam prep session has been scheduled for all backend learners this week.', date: 'April 2, 2026', createdAt: '2026-04-02T09:45:00Z' },
        { id: 'backend-ann-3', title: 'Capstone API examples uploaded', body: 'Reference backend capstone responses are now available in the resources panel.', date: 'March 29, 2026', createdAt: '2026-03-29T12:00:00Z' }
      ],
      assessments: buildAssessments('backend-engineering', [
        { title: 'Database Schema Design', semester: 'Semester 1', module: 'Databases and Data Modelling', brief: 'Submit the link to your schema design and relationship notes.', createdAt: '2026-03-28T09:00:00Z', dueAt: '2026-04-10T23:59:00Z' },
        { title: 'REST API Validation Task', semester: 'Semester 1', module: 'API Construction', brief: 'Paste the repository link for your API validation and documentation task.', createdAt: '2026-04-01T09:00:00Z', dueAt: '2026-04-14T23:59:00Z' },
        { title: 'Authentication Service Review', semester: 'Semester 2', module: 'Authentication and Security', brief: 'Submit the link to your authentication service and security checklist.', createdAt: '2026-04-03T09:00:00Z', dueAt: '2026-04-17T23:59:00Z' },
        { title: 'Observability and Logging Setup', semester: 'Semester 2', module: 'Testing and Observability', brief: 'Share the repository link showing logging and monitoring integration.', createdAt: '2026-04-04T09:00:00Z', dueAt: '2026-04-20T23:59:00Z' },
        { title: 'Production Backend Capstone', semester: 'Semester 3', module: 'Capstone System Delivery', brief: 'Submit the deployed API link and repository link for final review.', createdAt: '2026-04-05T09:00:00Z', dueAt: '2026-04-25T23:59:00Z' }
      ]),
      semesters: [
        buildSemester(backendVideoLibrary, 'backend-engineering', 1, 'Backend Foundations', [
          { title: 'Programming and Runtime Foundations', summary: 'Start with the base concepts that shape backend systems.', lessons: ['Runtime and execution flow', 'Functions and modules', 'Error handling and logging', 'Backend coding patterns'], videos: ['javascript', 'node', 'node', 'node'] },
          { title: 'Databases and Data Modelling', summary: 'Understand how applications persist and structure data.', lessons: ['Relational database basics', 'Schema design', 'Query writing and joins', 'Indexing fundamentals'], videos: ['database', 'database', 'database', 'database'] },
          { title: 'API Construction', summary: 'Build clear and maintainable backend interfaces.', lessons: ['REST principles', 'Routing and controllers', 'Validation and error responses', 'API documentation'], videos: ['api', 'node', 'security', 'api'] }
        ]),
        buildSemester(backendVideoLibrary, 'backend-engineering', 2, 'Backend Systems Delivery', [
          { title: 'Authentication and Security', summary: 'Protect systems and manage user access responsibly.', lessons: ['Sessions and tokens', 'Password handling', 'Authorization design', 'Secure configuration'], videos: ['security', 'security', 'security', 'security'] },
          { title: 'Testing and Observability', summary: 'Improve release confidence and production visibility.', lessons: ['Unit and integration testing', 'Test data strategy', 'Application logging', 'Monitoring basics'], videos: ['node', 'api', 'cloud', 'cloud'] },
          { title: 'Service Reliability', summary: 'Support growing systems with better architecture and operations.', lessons: ['Caching concepts', 'Queues and background jobs', 'Concurrency and scaling', 'Failure recovery'], videos: ['cloud', 'api', 'cloud', 'cloud'] }
        ]),
        buildSemester(backendVideoLibrary, 'backend-engineering', 3, 'Production Backend Engineering', [
          { title: 'Architecture and Deployment', summary: 'Move from application code to production operations.', lessons: ['Service boundaries', 'Container delivery', 'Deployment pipelines', 'Configuration strategy'], videos: ['node', 'docker', 'cicd', 'cloud'] },
          { title: 'Performance and Data Services', summary: 'Design for speed, scale, and reliable data access.', lessons: ['Query optimisation', 'Read and write patterns', 'Data service resilience', 'Operational debugging'], videos: ['database', 'database', 'cloud', 'security'] },
          { title: 'Capstone System Delivery', summary: 'Present a backend capstone that feels production-ready.', lessons: ['Capstone planning', 'Implementation sprint', 'Review and hardening', 'Final presentation'], videos: ['api', 'node', 'security', 'cloud'] }
        ])
      ]
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'live', label: 'Live Classes' },
    { id: 'community', label: 'Community' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'progress', label: 'Progress' },
    { id: 'profile', label: 'Profile and Settings' }
  ];

  const DEMO_MESSAGES = [
    { id: 'msg-1', authorId: 'cloud-mentor', authorName: 'Cloud Support Desk', authorTrack: 'Cloud Engineering', trackId: 'cloud-engineering', body: 'Use this room for cloud lab blockers, deployment questions, and revision updates related to cloud engineering.', createdAt: '2026-04-05T08:00:00Z' },
    { id: 'msg-2', authorId: 'cloud-learner', authorName: 'Kemi Adebayo', authorTrack: 'Cloud Engineering', trackId: 'cloud-engineering', body: 'I finished the Linux command line revision today. The guided notes in semester one were especially helpful.', createdAt: '2026-04-05T09:15:00Z' },
    { id: 'msg-3', authorId: 'frontend-mentor', authorName: 'Frontend Studio', authorTrack: 'Frontend Engineering', trackId: 'frontend-engineering', body: 'Use this room for component review questions, UI blockers, and frontend project updates.', createdAt: '2026-04-05T08:20:00Z' },
    { id: 'msg-4', authorId: 'frontend-learner', authorName: 'Paul Nwosu', authorTrack: 'Frontend Engineering', trackId: 'frontend-engineering', body: 'For anyone revising React state, the live class replay covers a clean component structure that is worth reviewing.', createdAt: '2026-04-05T10:10:00Z' },
    { id: 'msg-5', authorId: 'backend-mentor', authorName: 'Backend Lab', authorTrack: 'Backend Engineering', trackId: 'backend-engineering', body: 'Use this room for backend debugging, API design questions, and delivery support for backend learners.', createdAt: '2026-04-05T08:40:00Z' },
    { id: 'msg-6', authorId: 'backend-learner', authorName: 'Amina Yusuf', authorTrack: 'Backend Engineering', trackId: 'backend-engineering', body: 'I just submitted my API validation task. If anyone wants feedback on route design, I am available in this thread.', createdAt: '2026-04-05T11:05:00Z' }
  ];

  window.RKH_DATA = {
    tracks: TRACKS,
    navItems: NAV_ITEMS,
    demoMessages: DEMO_MESSAGES
  };
})();
