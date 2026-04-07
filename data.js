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

  // This helper keeps each curriculum entry readable. We can point a week to a full
  // lesson video or to a deeper chapter inside a longer tutorial with a start time.
  function chapter(videoUrl, startAt = 0) {
    const joiner = videoUrl.includes('?') ? '&' : '?';
    return `${videoUrl}${joiner}rel=0${startAt ? `&start=${startAt}` : ''}`;
  }

  // Each sequence is ordered by semester -> month -> week so junior developers can
  // update one place and know exactly which video belongs to each curriculum slot.
  const curriculumVideoSequences = {
    'cloud-engineering': [
      chapter(cloudVideoLibrary.linux, 0),
      chapter(cloudVideoLibrary.networking, 0),
      chapter(cloudVideoLibrary.dns, 0),
      chapter(cloudVideoLibrary.linux, 1450),
      chapter(cloudVideoLibrary.cloud, 0),
      chapter(cloudVideoLibrary.iam, 0),
      chapter(cloudVideoLibrary.aws, 0),
      chapter(cloudVideoLibrary.cloud, 1180),
      chapter(cloudVideoLibrary.azure, 0),
      chapter(cloudVideoLibrary.database, 0),
      chapter(cloudVideoLibrary.cloud, 2360),
      chapter(cloudVideoLibrary.security, 0),
      chapter(cloudVideoLibrary.docker, 0),
      chapter(cloudVideoLibrary.containers, 0),
      chapter(cloudVideoLibrary.docker, 1820),
      chapter(cloudVideoLibrary.security, 880),
      chapter(cloudVideoLibrary.terraform, 0),
      chapter(cloudVideoLibrary.cicd, 0),
      chapter(cloudVideoLibrary.encryption, 0),
      chapter(cloudVideoLibrary.jenkins, 0),
      chapter(cloudVideoLibrary.kubernetes, 0),
      chapter(cloudVideoLibrary.k8s, 0),
      chapter(cloudVideoLibrary.monitoring, 0),
      chapter(cloudVideoLibrary.kubernetes, 2240),
      chapter(cloudVideoLibrary.security, 1540),
      chapter(cloudVideoLibrary.cloud, 3180),
      chapter(cloudVideoLibrary.compliance, 0),
      chapter(cloudVideoLibrary.observability, 0),
      chapter(cloudVideoLibrary.database, 2140),
      chapter(cloudVideoLibrary.api, 0),
      chapter(cloudVideoLibrary.automation, 0),
      chapter(cloudVideoLibrary.cloud, 4060),
      chapter(cloudVideoLibrary.cloud, 4720),
      chapter(cloudVideoLibrary.cicd, 1560),
      chapter(cloudVideoLibrary.k8s, 1780),
      chapter(cloudVideoLibrary.monitoring, 1260),
      chapter(cloudVideoLibrary.terraform, 1620),
      chapter(cloudVideoLibrary.automation, 1240),
      chapter(cloudVideoLibrary.prometheus, 0),
      chapter(cloudVideoLibrary.logging, 0),
      chapter(cloudVideoLibrary.observability, 1320),
      chapter(cloudVideoLibrary.security, 2380),
      chapter(cloudVideoLibrary.api, 940),
      chapter(cloudVideoLibrary.database, 1260),
      chapter(cloudVideoLibrary.compliance, 980),
      chapter(cloudVideoLibrary.kubernetes, 3140),
      chapter(cloudVideoLibrary.cicd, 2480),
      chapter(cloudVideoLibrary.cloud, 5480)
    ],
    'frontend-engineering': [
      chapter(frontendVideoLibrary.html, 0),
      chapter(frontendVideoLibrary.css, 0),
      chapter(frontendVideoLibrary.flexbox, 0),
      chapter(frontendVideoLibrary.accessibility, 0),
      chapter(frontendVideoLibrary.javascript, 300),
      chapter(frontendVideoLibrary.modernjs, 0),
      chapter(frontendVideoLibrary.dom, 0),
      chapter(frontendVideoLibrary.fetch, 0),
      chapter(frontendVideoLibrary.responsive, 0),
      chapter(frontendVideoLibrary.animation, 0),
      chapter(frontendVideoLibrary.semantic, 0),
      chapter(frontendVideoLibrary.javascript, 2480),
      chapter(frontendVideoLibrary.react, 0),
      chapter(frontendVideoLibrary.react, 1580),
      chapter(frontendVideoLibrary.hooks, 0),
      chapter(frontendVideoLibrary.react, 3120),
      chapter(frontendVideoLibrary.routing, 0),
      chapter(frontendVideoLibrary.redux, 0),
      chapter(frontendVideoLibrary.api, 240),
      chapter(frontendVideoLibrary.fetch, 1220),
      chapter(frontendVideoLibrary.testing, 0),
      chapter(frontendVideoLibrary.jest, 0),
      chapter(frontendVideoLibrary.debugging, 0),
      chapter(frontendVideoLibrary.performance, 0),
      chapter(frontendVideoLibrary.css, 2620),
      chapter(frontendVideoLibrary.grid, 0),
      chapter(frontendVideoLibrary.accessibility, 1180),
      chapter(frontendVideoLibrary.performance, 1560),
      chapter(frontendVideoLibrary.react, 4380),
      chapter(frontendVideoLibrary.cloud, 0),
      chapter(frontendVideoLibrary.cicd, 0),
      chapter(frontendVideoLibrary.cloud, 1240),
      chapter(frontendVideoLibrary.react, 5220),
      chapter(frontendVideoLibrary.routing, 1120),
      chapter(frontendVideoLibrary.javascript, 3680),
      chapter(frontendVideoLibrary.testing, 1460),
      chapter(frontendVideoLibrary.html, 1880),
      chapter(frontendVideoLibrary.css, 3540),
      chapter(frontendVideoLibrary.javascript, 4520),
      chapter(frontendVideoLibrary.react, 6120),
      chapter(frontendVideoLibrary.api, 1180),
      chapter(frontendVideoLibrary.fetch, 2080),
      chapter(frontendVideoLibrary.debugging, 1040),
      chapter(frontendVideoLibrary.performance, 2280),
      chapter(frontendVideoLibrary.bundling, 0),
      chapter(frontendVideoLibrary.cicd, 1180),
      chapter(frontendVideoLibrary.react, 7040),
      chapter(frontendVideoLibrary.javascript, 5340)
    ],
    'backend-engineering': [
      chapter(backendVideoLibrary.javascript, 0),
      chapter(backendVideoLibrary.node, 0),
      chapter(backendVideoLibrary.modules, 0),
      chapter(backendVideoLibrary.logging, 300),
      chapter(backendVideoLibrary.database, 0),
      chapter(backendVideoLibrary.sql, 1180),
      chapter(backendVideoLibrary.mongodb, 0),
      chapter(backendVideoLibrary.database, 2140),
      chapter(backendVideoLibrary.rest, 360),
      chapter(backendVideoLibrary.node, 1640),
      chapter(backendVideoLibrary.security, 320),
      chapter(backendVideoLibrary.api, 300),
      chapter(backendVideoLibrary.auth, 0),
      chapter(backendVideoLibrary.jwt, 0),
      chapter(backendVideoLibrary.security, 1280),
      chapter(backendVideoLibrary.encryption, 540),
      chapter(backendVideoLibrary.testing, 0),
      chapter(backendVideoLibrary.unittests, 0),
      chapter(backendVideoLibrary.integration, 0),
      chapter(backendVideoLibrary.monitoring, 360),
      chapter(backendVideoLibrary.cloud, 420),
      chapter(backendVideoLibrary.websockets, 0),
      chapter(backendVideoLibrary.cloud, 1560),
      chapter(backendVideoLibrary.architecture, 0),
      chapter(backendVideoLibrary.node, 3020),
      chapter(backendVideoLibrary.docker, 640),
      chapter(backendVideoLibrary.cicd, 520),
      chapter(backendVideoLibrary.cloud, 2820),
      chapter(backendVideoLibrary.database, 3260),
      chapter(backendVideoLibrary.mongodb, 1620),
      chapter(backendVideoLibrary.security, 2180),
      chapter(backendVideoLibrary.logging, 1180),
      chapter(backendVideoLibrary.javascript, 1820),
      chapter(backendVideoLibrary.asyncnode, 0),
      chapter(backendVideoLibrary.node, 4320),
      chapter(backendVideoLibrary.modules, 1080),
      chapter(backendVideoLibrary.sql, 2480),
      chapter(backendVideoLibrary.rest, 1380),
      chapter(backendVideoLibrary.api, 1040),
      chapter(backendVideoLibrary.auth, 1480),
      chapter(backendVideoLibrary.testing, 1820),
      chapter(backendVideoLibrary.integration, 1180),
      chapter(backendVideoLibrary.monitoring, 1540),
      chapter(backendVideoLibrary.architecture, 1460),
      chapter(backendVideoLibrary.docker, 1860),
      chapter(backendVideoLibrary.cicd, 1860),
      chapter(backendVideoLibrary.cloud, 3940),
      chapter(backendVideoLibrary.security, 3140)
    ]
  };

  function buildCurriculumVideoUrl(videoSource, fallbackVideoUrl = '') {
    return videoSource || chapter(fallbackVideoUrl || '');
  }

  function getTrackWeekVideo(trackKey, semesterNumber, monthNumber, weekNumber, fallbackVideoUrl) {
    const trackSequence = curriculumVideoSequences[trackKey] || [];
    const sequenceIndex = (((semesterNumber - 1) * 4) + (monthNumber - 1)) * 4 + (weekNumber - 1);
    return buildCurriculumVideoUrl(trackSequence[sequenceIndex], fallbackVideoUrl);
  }

  function buildLearningWeeks(videoLib, trackKey, semesterNumber, monthNumber, lessons, videoKeys) {
    return lessons.map((lesson, index) => ({
      id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w${index + 1}`,
      title: `Week ${index + 1}: ${lesson}`,
      objective: `Study the core concepts for ${lesson.toLowerCase()} and complete the guided practice.`,
      type: 'learning',
      videoUrl: getTrackWeekVideo(trackKey, semesterNumber, monthNumber, index + 1, videoLib[videoKeys[index]] || videoLib[videoKeys[0]] || ''),
      resources: ['Lesson video', 'Reading note', 'Practice task']
    }));
  }

  function buildHandsOnLabWeeks(videoLib, trackKey, semesterNumber, monthNumber, fallbackKeys = []) {
    return [
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w1`,
        title: 'Week 1: Lab Planning',
        objective: 'Review the lab brief, confirm your environment, and prepare the delivery plan for the month.',
        type: 'lab',
        videoUrl: getTrackWeekVideo(trackKey, semesterNumber, monthNumber, 1, videoLib[fallbackKeys[0]] || ''),
        resources: ['Lab brief', 'Environment checklist', 'Planning guide']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w2`,
        title: 'Week 2: Lab Build',
        objective: 'Implement the core lab tasks and document your approach as you build.',
        type: 'lab',
        videoUrl: getTrackWeekVideo(trackKey, semesterNumber, monthNumber, 2, videoLib[fallbackKeys[1]] || ''),
        resources: ['Hands-on walkthrough', 'Implementation checklist', 'Build notes']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w3`,
        title: 'Week 3: Lab Testing and Debugging',
        objective: 'Test the lab output, fix issues, and improve the quality of the final delivery.',
        type: 'lab',
        videoUrl: getTrackWeekVideo(trackKey, semesterNumber, monthNumber, 3, videoLib[fallbackKeys[2]] || ''),
        resources: ['Testing guide', 'Debug checklist', 'Review notes']
      },
      {
        id: `${trackKey}-s${semesterNumber}-m${monthNumber}-w4`,
        title: 'Week 4: Lab Showcase',
        objective: 'Record, present, and reflect on your completed hands-on lab delivery for the semester.',
        type: 'lab',
        videoUrl: getTrackWeekVideo(trackKey, semesterNumber, monthNumber, 4, videoLib[fallbackKeys[3]] || ''),
        resources: ['Showcase guide', 'Presentation template', 'Reflection notes']
      }
    ];
  }

  function buildSemester(videoLib, trackKey, semesterNumber, title, learningMonths, labVideoKeys) {
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
          title: 'Hands-on Lab',
          summary: 'A practical lab month focused on guided build work, testing, and final showcase delivery.',
          phase: 'Hands-on Lab',
          weeks: buildHandsOnLabWeeks(videoLib, trackKey, semesterNumber, 4, labVideoKeys)
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
      liveClasses: [],
      announcements: [
        { id: 'cloud-ann-1', title: 'Infrastructure review window is open', body: 'Submit your infrastructure diagrams before Friday to receive review comments during the hands-on lab month.', date: 'April 5, 2026', createdAt: '2026-04-05T08:00:00Z' },
        { id: 'cloud-ann-2', title: 'Monitoring workshop recording uploaded', body: 'The latest monitoring and alerting session has been added to your learning library.', date: 'April 3, 2026', createdAt: '2026-04-03T09:30:00Z' },
        { id: 'cloud-ann-3', title: 'Hands-on lab month guide published', body: 'You can now review the cloud hands-on lab structure in the month four section.', date: 'April 1, 2026', createdAt: '2026-04-01T11:00:00Z' }
      ],
      assessments: [],
      semesters: [
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 1, 'Core Cloud Foundations', [
          { title: 'Linux and Networking Fundamentals', summary: 'Build the operating system and networking base for cloud work.', lessons: ['Linux command line essentials', 'Networking layers and ports', 'DNS, routing, and troubleshooting', 'Cloud-ready shell practice'], videos: ['linux', 'cloud', 'cloud', 'linux'] },
          { title: 'Cloud Foundations and IAM', summary: 'Understand accounts, access control, and core cloud services.', lessons: ['Cloud service models', 'Identity and access management', 'Compute and storage basics', 'Cost awareness and tagging'], videos: ['cloud', 'security', 'cloud', 'cloud'] },
          { title: 'Compute, Storage, and Architecture', summary: 'Design a stable baseline environment for applications.', lessons: ['Virtual machines and autoscaling', 'Storage classes and backups', 'Reference architecture patterns', 'Reliability fundamentals'], videos: ['cloud', 'cloud', 'cloud', 'security'] }
        ], ['automation', 'docker', 'monitoring', 'observability']),
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 2, 'Automation and Platform Delivery', [
          { title: 'Containers and Docker', summary: 'Containerize applications and manage repeatable delivery.', lessons: ['Docker images and layers', 'Compose files and local stacks', 'Container debugging', 'Secure image practices'], videos: ['docker', 'docker', 'docker', 'security'] },
          { title: 'Infrastructure as Code and CI/CD', summary: 'Automate environments and deployment pipelines.', lessons: ['Infrastructure as code principles', 'Pipeline design', 'Secrets and environment control', 'Release automation'], videos: ['cicd', 'cicd', 'security', 'cicd'] },
          { title: 'Kubernetes and Monitoring', summary: 'Run applications at scale and observe their health.', lessons: ['Kubernetes core objects', 'Workloads and services', 'Observability basics', 'Scaling and recovery drills'], videos: ['kubernetes', 'kubernetes', 'cloud', 'kubernetes'] }
        ], ['terraform', 'kubernetes', 'prometheus', 'logging']),
        buildSemester(cloudVideoLibrary, 'cloud-engineering', 3, 'Production Cloud Engineering', [
          { title: 'Resilience and Security Operations', summary: 'Improve uptime, auditability, and incident readiness.', lessons: ['Threat modelling for cloud systems', 'Backup and disaster recovery', 'Policy and compliance basics', 'Incident response workflow'], videos: ['security', 'cloud', 'security', 'security'] },
          { title: 'Data Platforms and Platform Operations', summary: 'Support data-heavy systems and platform operations.', lessons: ['Managed data services', 'Queues and event flows', 'Platform operations handbook', 'Service ownership'], videos: ['database', 'api', 'cloud', 'cloud'] },
          { title: 'Capstone Delivery and Career Readiness', summary: 'Present a production-style cloud delivery project.', lessons: ['Capstone planning', 'Deployment walkthrough', 'Review and optimisation', 'Final presentation'], videos: ['cloud', 'cicd', 'kubernetes', 'cloud'] }
        ], ['security', 'api', 'cicd', 'cloud'])
      ]
    },
    'frontend-engineering': {
      id: 'frontend-engineering',
      label: 'Frontend Engineering',
      summary: 'Modern web interfaces, design systems, performance, testing, and deployment.',
      outcomes: ['Accessible interfaces', 'React applications', 'Production delivery'],
      liveClasses: [],
      announcements: [
        { id: 'frontend-ann-1', title: 'Revision projects updated', body: 'Semester revision now includes component audit and responsive cleanup tasks.', date: 'April 5, 2026', createdAt: '2026-04-05T07:30:00Z' },
        { id: 'frontend-ann-2', title: 'Lab delivery rubric published', body: 'Review the latest hands-on lab grading rubric before your next delivery cycle.', date: 'April 2, 2026', createdAt: '2026-04-02T13:00:00Z' },
        { id: 'frontend-ann-3', title: 'Portfolio review slots available', body: 'You can now book feedback time for your frontend semester capstone.', date: 'March 30, 2026', createdAt: '2026-03-30T10:00:00Z' }
      ],
      assessments: [],
      semesters: [
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 1, 'Web Foundations', [
          { title: 'HTML and CSS Foundations', summary: 'Understand the base layers of the web and build solid layouts.', lessons: ['Semantic HTML structure', 'Responsive CSS foundations', 'Layout systems and spacing', 'Accessible form patterns'], videos: ['html', 'css', 'css', 'html'] },
          { title: 'JavaScript Core Skills', summary: 'Control behaviour and interactive user flows in the browser.', lessons: ['Variables and functions', 'Arrays, objects, and state', 'DOM updates and events', 'Fetch and async behaviour'], videos: ['javascript', 'javascript', 'javascript', 'api'] },
          { title: 'Responsive UI Delivery', summary: 'Ship polished and maintainable interface work.', lessons: ['Responsive components', 'Animation fundamentals', 'Design handoff practice', 'Mini project delivery'], videos: ['css', 'css', 'html', 'javascript'] }
        ], ['responsive', 'animation', 'testing', 'performance']),
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 2, 'Modern Frontend Development', [
          { title: 'React Fundamentals', summary: 'Build reusable interfaces with component-driven development.', lessons: ['JSX and component structure', 'State and props', 'Hooks for side effects', 'Controlled forms'], videos: ['react', 'react', 'react', 'react'] },
          { title: 'Routing, State, and APIs', summary: 'Manage application state and data flows with confidence.', lessons: ['Client routing', 'State architecture', 'API consumption patterns', 'Loading and error states'], videos: ['react', 'react', 'api', 'api'] },
          { title: 'Testing and Quality', summary: 'Increase confidence through testing and review discipline.', lessons: ['Component testing basics', 'User flow checks', 'Code review standards', 'Performance review'], videos: ['javascript', 'javascript', 'react', 'react'] }
        ], ['react', 'api', 'debugging', 'bundling']),
        buildSemester(frontendVideoLibrary, 'frontend-engineering', 3, 'Production Frontend Engineering', [
          { title: 'Advanced UI Systems', summary: 'Create durable systems for complex products.', lessons: ['Design system foundations', 'Reusable patterns', 'Accessibility audits', 'Performance budgets'], videos: ['react', 'css', 'html', 'react'] },
          { title: 'Framework Delivery', summary: 'Prepare frontend systems for production deployment.', lessons: ['App architecture planning', 'Server rendering concepts', 'Deployment readiness', 'Observability for frontend'], videos: ['react', 'react', 'cicd', 'cloud'] },
          { title: 'Capstone and Portfolio', summary: 'Ship a polished frontend capstone with presentation support.', lessons: ['Capstone planning', 'Implementation sprint', 'Review and refactor', 'Final walkthrough'], videos: ['react', 'react', 'javascript', 'react'] }
        ], ['cloud', 'cicd', 'react', 'performance'])
      ]
    },
    'backend-engineering': {
      id: 'backend-engineering',
      label: 'Backend Engineering',
      summary: 'Server-side systems, APIs, databases, security, testing, and deployment.',
      outcomes: ['API design', 'Database engineering', 'Production backend systems'],
      liveClasses: [],
      announcements: [
        { id: 'backend-ann-1', title: 'New API review checklist', body: 'A backend API review checklist is now available in the hands-on lab section.', date: 'April 4, 2026', createdAt: '2026-04-04T08:30:00Z' },
        { id: 'backend-ann-2', title: 'Hands-on lab support guide confirmed', body: 'A backend lab support guide has been published for all learners this week.', date: 'April 2, 2026', createdAt: '2026-04-02T09:45:00Z' },
        { id: 'backend-ann-3', title: 'Capstone API examples uploaded', body: 'Reference backend capstone responses are now available in the resources panel.', date: 'March 29, 2026', createdAt: '2026-03-29T12:00:00Z' }
      ],
      assessments: [],
      semesters: [
        buildSemester(backendVideoLibrary, 'backend-engineering', 1, 'Backend Foundations', [
          { title: 'Programming and Runtime Foundations', summary: 'Start with the base concepts that shape backend systems.', lessons: ['Runtime and execution flow', 'Functions and modules', 'Error handling and logging', 'Backend coding patterns'], videos: ['javascript', 'node', 'node', 'node'] },
          { title: 'Databases and Data Modelling', summary: 'Understand how applications persist and structure data.', lessons: ['Relational database basics', 'Schema design', 'Query writing and joins', 'Indexing fundamentals'], videos: ['database', 'database', 'database', 'database'] },
          { title: 'API Construction', summary: 'Build clear and maintainable backend interfaces.', lessons: ['REST principles', 'Routing and controllers', 'Validation and error responses', 'API documentation'], videos: ['api', 'node', 'security', 'api'] }
        ], ['node', 'testing', 'monitoring', 'architecture']),
        buildSemester(backendVideoLibrary, 'backend-engineering', 2, 'Backend Systems Delivery', [
          { title: 'Authentication and Security', summary: 'Protect systems and manage user access responsibly.', lessons: ['Sessions and tokens', 'Password handling', 'Authorization design', 'Secure configuration'], videos: ['security', 'security', 'security', 'security'] },
          { title: 'Testing and Observability', summary: 'Improve release confidence and production visibility.', lessons: ['Unit and integration testing', 'Test data strategy', 'Application logging', 'Monitoring basics'], videos: ['node', 'api', 'cloud', 'cloud'] },
          { title: 'Service Reliability', summary: 'Support growing systems with better architecture and operations.', lessons: ['Caching concepts', 'Queues and background jobs', 'Concurrency and scaling', 'Failure recovery'], videos: ['cloud', 'api', 'cloud', 'cloud'] }
        ], ['auth', 'integration', 'cloud', 'security']),
        buildSemester(backendVideoLibrary, 'backend-engineering', 3, 'Production Backend Engineering', [
          { title: 'Architecture and Deployment', summary: 'Move from application code to production operations.', lessons: ['Service boundaries', 'Container delivery', 'Deployment pipelines', 'Configuration strategy'], videos: ['node', 'docker', 'cicd', 'cloud'] },
          { title: 'Performance and Data Services', summary: 'Design for speed, scale, and reliable data access.', lessons: ['Query optimisation', 'Read and write patterns', 'Data service resilience', 'Operational debugging'], videos: ['database', 'database', 'cloud', 'security'] },
          { title: 'Capstone System Delivery', summary: 'Present a backend capstone that feels production-ready.', lessons: ['Capstone planning', 'Implementation sprint', 'Review and hardening', 'Final presentation'], videos: ['api', 'node', 'security', 'cloud'] }
        ], ['docker', 'cicd', 'cloud', 'security'])
      ]
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'community', label: 'Community' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'progress', label: 'Progress' },
    { id: 'profile', label: 'Profile and Settings' }
  ];

  const DEMO_MESSAGES = [
    { id: 'msg-1', authorId: 'cloud-mentor', authorName: 'Cloud Support Desk', authorTrack: 'Cloud Engineering', trackId: 'cloud-engineering', body: 'Use this room for cloud lab blockers, deployment questions, and revision updates related to cloud engineering.', createdAt: '2026-04-05T08:00:00Z' },
    { id: 'msg-2', authorId: 'cloud-learner', authorName: 'Kemi Adebayo', authorTrack: 'Cloud Engineering', trackId: 'cloud-engineering', body: 'I finished the Linux command line revision today. The guided notes in semester one were especially helpful.', createdAt: '2026-04-05T09:15:00Z' },
    { id: 'msg-3', authorId: 'frontend-mentor', authorName: 'Frontend Studio', authorTrack: 'Frontend Engineering', trackId: 'frontend-engineering', body: 'Use this room for component review questions, UI blockers, and frontend project updates.', createdAt: '2026-04-05T08:20:00Z' },
    { id: 'msg-4b', authorId: 'frontend-learner', authorName: 'Paul Nwosu', authorTrack: 'Frontend Engineering', trackId: 'frontend-engineering', body: 'For anyone revising React state, the month four hands-on lab guide covers a clean component structure that is worth reviewing.', createdAt: '2026-04-05T10:10:00Z' },
    { id: 'msg-5', authorId: 'backend-mentor', authorName: 'Backend Lab', authorTrack: 'Backend Engineering', trackId: 'backend-engineering', body: 'Use this room for backend debugging, API design questions, and delivery support for backend learners.', createdAt: '2026-04-05T08:40:00Z' },
    { id: 'msg-6', authorId: 'backend-learner', authorName: 'Amina Yusuf', authorTrack: 'Backend Engineering', trackId: 'backend-engineering', body: 'I just submitted my API validation task. If anyone wants feedback on route design, I am available in this thread.', createdAt: '2026-04-05T11:05:00Z' }
  ];

  window.RKH_DATA = {
    tracks: TRACKS,
    navItems: NAV_ITEMS,
    demoMessages: DEMO_MESSAGES
  };
})();
