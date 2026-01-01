/**
 * Seed Test Data Script
 *
 * Creates comprehensive synthetic test data for the PMO platform:
 * - 50 users
 * - 25 clients with contacts
 * - 13 teams with 4-18 members
 * - 63 projects with phases, milestones, and tasks
 * - Task assignments
 * - Team project assignments
 * - Time entries (current week with manual and timer-based)
 * - Time off requests
 *
 * Run: cd backend && npm run seed:test
 */

import { PrismaClient, UserRole, UserStatus, ClientStatus, ProjectStatus, ProjectPriority, TeamMemberRole, AssignmentStatus, TaskStatus, TaskPriority, TimeOffType, TimeOffStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Note: date-fns-tz not used for seed data (simple Date objects work fine)

// Helper to create a valid Date for seed data (skip timezone conversion for simplicity)
function createSeedTime(baseDate: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') }); // Go up 2 levels: scripts/ -> backend/ -> root/

const prisma = new PrismaClient();

// Test data marker - all test emails use this domain
const TEST_DOMAIN = 'testdata.pmo.local';
const TEST_PASSWORD = 'TestPass123!';

// ============================================
// DATA GENERATORS
// ============================================

const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const departments = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations',
  'Human Resources', 'Finance', 'Customer Success', 'Data Science'
];

const jobTitles = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Product Manager', 'Senior Product Manager', 'UX Designer', 'UI Designer',
  'Data Analyst', 'Data Scientist', 'DevOps Engineer', 'QA Engineer',
  'Technical Lead', 'Engineering Manager', 'Project Manager', 'Scrum Master',
  'Business Analyst', 'Solutions Architect', 'Full Stack Developer', 'Frontend Developer'
];

const skills = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust',
  'React', 'Angular', 'Vue.js', 'Svelte', 'Node.js', 'Django', 'Spring',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
  'Machine Learning', 'Data Analysis', 'Agile', 'Scrum', 'Project Management'
];

const companyNames = [
  'Acme Corporation', 'Globex Industries', 'Initech Solutions', 'Umbrella Corp',
  'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems', 'Soylent Corp',
  'Massive Dynamic', 'Aperture Science', 'Black Mesa Research', 'Tyrell Corporation',
  'Weyland-Yutani', 'OsCorp Industries', 'LexCorp', 'Oscorp Technologies',
  'Hooli', 'Pied Piper', 'Raviga Capital', 'Endframe', 'Nucleus',
  'Dunder Mifflin', 'Wernham Hogg', 'Sterling Cooper', 'Prestige Worldwide'
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Government', 'Energy', 'Media', 'Telecommunications'
];

const teamNames = [
  'Alpha Squad', 'Platform Team', 'Mobile Ninjas', 'Cloud Warriors',
  'Data Dragons', 'Frontend Force', 'Backend Brigade', 'DevOps Dynamos',
  'Security Sentinels', 'API Architects', 'UX Unicorns', 'QA Champions', 'Innovation Lab'
];

const projectPrefixes = ['Project', 'Initiative', 'Operation', 'Campaign', 'Program'];

const projectAdjectives = [
  'Phoenix', 'Titan', 'Nova', 'Quantum', 'Apex', 'Zenith', 'Nebula',
  'Horizon', 'Velocity', 'Catalyst', 'Fusion', 'Spectrum', 'Eclipse',
  'Aurora', 'Vanguard', 'Pinnacle', 'Summit', 'Genesis', 'Odyssey', 'Venture'
];

const projectTypes = ['Internal', 'Client Project', 'R&D', 'Infrastructure', 'Product Development', 'Consulting'];

const phaseNames = ['Discovery', 'Planning', 'Design', 'Development', 'Testing', 'Deployment', 'Maintenance'];

const taskTemplates = [
  { action: 'Implement', subject: 'user authentication module' },
  { action: 'Design', subject: 'database schema' },
  { action: 'Create', subject: 'API endpoints' },
  { action: 'Write', subject: 'unit tests' },
  { action: 'Review', subject: 'code changes' },
  { action: 'Deploy', subject: 'to staging environment' },
  { action: 'Configure', subject: 'CI/CD pipeline' },
  { action: 'Document', subject: 'API specifications' },
  { action: 'Optimize', subject: 'database queries' },
  { action: 'Fix', subject: 'reported bugs' },
  { action: 'Integrate', subject: 'third-party service' },
  { action: 'Set up', subject: 'monitoring alerts' },
  { action: 'Migrate', subject: 'legacy data' },
  { action: 'Build', subject: 'dashboard component' },
  { action: 'Test', subject: 'edge cases' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateProjectCode(index: number): string {
  const prefix = ['PRJ', 'DEV', 'OPS', 'MKT', 'RND'][index % 5];
  return `${prefix}-${String(index + 1).padStart(4, '0')}`;
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  console.log('Starting comprehensive test data seed...\n');

  // Check if test data already exists
  const existingTestUsers = await prisma.user.count({
    where: { email: { endsWith: `@${TEST_DOMAIN}` } }
  });

  if (existingTestUsers > 0) {
    console.log(`Found ${existingTestUsers} existing test users.`);
    console.log('Run "npm run seed:clear" first to remove existing test data.');
    console.log('Aborting seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  // ============================================
  // CREATE USERS (50)
  // ============================================
  console.log('Creating 50 users...');

  const userRoles: UserRole[] = [
    'SUPER_ADMIN', 'ADMIN', 'PMO_MANAGER', 'PMO_MANAGER',
    'PROJECT_MANAGER', 'PROJECT_MANAGER', 'PROJECT_MANAGER', 'PROJECT_MANAGER',
    'RESOURCE_MANAGER', 'RESOURCE_MANAGER',
    ...Array(35).fill('TEAM_MEMBER'),
    ...Array(5).fill('VIEWER')
  ];

  const users = [];
  // Timezone mapping by country - now includes all major business centers
  const countryTimezones: Record<string, string[]> = {
    'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'],
    'CA': ['America/New_York', 'America/Denver', 'America/Los_Angeles'], // Toronto, Calgary, Vancouver
    'MX': ['America/Chicago'], // Mexico City
    'BR': ['America/Sao_Paulo'],
    'AR': ['America/Buenos_Aires'],
    'CL': ['America/Santiago'],
    'CO': ['America/Lima'], // Bogotá
    'GB': ['Europe/London'],
    'FR': ['Europe/Paris'],
    'DE': ['Europe/Berlin'],
    'ES': ['Europe/Paris'], // Madrid (same zone as Paris)
    'IT': ['Europe/Paris'], // Rome (same zone as Paris)
    'NL': ['Europe/Berlin'], // Amsterdam
    'PL': ['Europe/Warsaw'],
    'TR': ['Europe/Istanbul'],
    'RU': ['Europe/Moscow'],
    'ZA': ['Africa/Johannesburg'],
    'NG': ['Africa/Lagos'],
    'EG': ['Africa/Cairo'],
    'KE': ['Africa/Nairobi'],
    'AE': ['Asia/Dubai'],
    'SA': ['Asia/Riyadh'],
    'IL': ['Asia/Tel_Aviv'],
    'IN': ['Asia/Kolkata'],
    'PK': ['Asia/Karachi'],
    'TH': ['Asia/Bangkok'],
    'SG': ['Asia/Singapore'],
    'MY': ['Asia/Singapore'], // Kuala Lumpur
    'PH': ['Asia/Manila'],
    'CN': ['Asia/Shanghai'],
    'JP': ['Asia/Tokyo'],
    'KR': ['Asia/Tokyo'], // Seoul (same zone)
    'AU': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth'],
    'NZ': ['Pacific/Auckland'],
  };

  const countryRegions: Record<string, string[]> = {
    'US': ['US Northeast', 'US Southeast', 'US Midwest', 'US Southwest', 'US West Coast', 'US Mountain West', 'US Pacific Northwest'],
    'CA': ['Eastern Canada', 'Western Canada', 'Central Canada', 'Atlantic Canada'],
    'MX': ['Northern Mexico', 'Central Mexico', 'Southern Mexico'],
    'BR': ['Southeast Brazil', 'South Brazil', 'Northeast Brazil', 'North Brazil', 'Central-West Brazil'],
    'GB': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    'FR': ['Île-de-France', 'Northern France', 'Southern France', 'Eastern France', 'Western France'],
    'DE': ['Northern Germany', 'Southern Germany', 'Eastern Germany', 'Western Germany'],
    'IN': ['North India', 'South India', 'East India', 'West India', 'Central India'],
    'SG': ['Asia Pacific (Other)'], // City-state
    'JP': ['Kanto', 'Kansai', 'Chubu', 'Tohoku', 'Kyushu', 'Hokkaido'],
    'CN': ['North China', 'South China', 'East China', 'West China', 'Central China'],
    'AU': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Northern Territory'],
    'ZA': ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo'],
    'AE': ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Other Emirates'],
  };

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${TEST_DOMAIN}`;
    const country = randomElement(['US', 'US', 'US', 'CA', 'GB', 'IN', 'AU', 'BR', 'DE', 'FR', 'SG', 'JP', 'MX', 'ZA', 'AE']);
    const timezone = randomElement(countryTimezones[country] || ['UTC']);
    const region = randomElement(countryRegions[country] || ['Asia Pacific (Other)']);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: userRoles[i],
        status: i < 48 ? 'ACTIVE' : (i < 49 ? 'INACTIVE' : 'SUSPENDED'),
        department: randomElement(departments),
        jobTitle: randomElement(jobTitles),
        phone: `+1-555-${String(randomInt(100, 999))}-${String(randomInt(1000, 9999))}`,
        country,
        region,
        employmentType: randomElement(['FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR']),
        defaultWeeklyHours: randomElement([40, 40, 40, 32, 20]),
        timezone,
        skills: randomElements(skills, randomInt(3, 8)),
        hourlyRate: randomInt(50, 200),
        billableRate: randomInt(100, 350),
      }
    });
    users.push(user);
  }
  console.log(`  Created ${users.length} users`);

  // Set managers for some users
  console.log('  Setting up manager relationships...');
  const managers = users.filter(u => ['ADMIN', 'PMO_MANAGER', 'PROJECT_MANAGER', 'RESOURCE_MANAGER'].includes(u.role));
  for (let i = 10; i < users.length; i++) {
    if (Math.random() > 0.3) {
      await prisma.user.update({
        where: { id: users[i].id },
        data: { managerId: randomElement(managers).id }
      });
    }
  }

  // ============================================
  // CREATE CLIENTS (25) WITH CONTACTS
  // ============================================
  console.log('\nCreating 25 clients with contacts...');

  const clients = [];
  for (let i = 0; i < 25; i++) {
    const clientStatuses: ClientStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'PROSPECT', 'ON_HOLD'];

    const client = await prisma.client.create({
      data: {
        name: companyNames[i],
        status: randomElement(clientStatuses),
        industry: randomElement(industries),
        website: `https://www.${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        primaryContactName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        primaryContactEmail: `contact@${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        primaryContactPhone: `+1-555-${String(randomInt(100, 999))}-${String(randomInt(1000, 9999))}`,
        addressLine1: `${randomInt(100, 9999)} ${randomElement(['Main', 'Oak', 'Pine', 'Maple', 'Cedar'])} ${randomElement(['Street', 'Avenue', 'Boulevard', 'Drive'])}`,
        city: randomElement(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Seattle', 'Denver', 'Austin']),
        stateProvince: randomElement(['NY', 'CA', 'IL', 'TX', 'AZ', 'WA', 'CO']),
        postalCode: String(randomInt(10000, 99999)),
        country: 'USA',
        description: `${companyNames[i]} is a leading company in the ${randomElement(industries)} sector.`,
        notes: `Key account - established ${randomInt(2010, 2023)}`,
      }
    });
    clients.push(client);

    // Create 2-4 contacts per client
    const contactCount = randomInt(2, 4);
    for (let c = 0; c < contactCount; c++) {
      await prisma.clientContact.create({
        data: {
          clientId: client.id,
          firstName: randomElement(firstNames),
          lastName: randomElement(lastNames),
          email: `${randomElement(['sales', 'support', 'billing', 'tech'])}${c}@${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
          phone: `+1-555-${String(randomInt(100, 999))}-${String(randomInt(1000, 9999))}`,
          jobTitle: randomElement(['CEO', 'CTO', 'VP Engineering', 'Director', 'Manager', 'Lead']),
          isPrimary: c === 0,
        }
      });
    }
  }
  console.log(`  Created ${clients.length} clients with contacts`);

  // ============================================
  // CREATE TEAMS (13)
  // ============================================
  console.log('\nCreating 13 teams with members...');

  const teams = [];
  const usedUserIds = new Set<string>();

  for (let i = 0; i < 13; i++) {
    const teamSize = randomInt(4, 18);
    const availableUsers = users.filter(u => !usedUserIds.has(u.id) && u.status === 'ACTIVE');

    const teamMembers = availableUsers.length >= teamSize
      ? randomElements(availableUsers, teamSize)
      : randomElements(users.filter(u => u.status === 'ACTIVE'), teamSize);

    teamMembers.forEach(u => usedUserIds.add(u.id));

    const team = await prisma.team.create({
      data: {
        name: teamNames[i],
        description: `${teamNames[i]} - A dedicated team of ${teamSize} professionals`,
        skills: randomElements(skills, randomInt(4, 10)),
        isActive: i < 12,
        leadId: teamMembers[0]?.id,
        members: {
          create: teamMembers.map((user, idx) => ({
            userId: user.id,
            role: idx === 0 ? 'LEAD' : (idx < 3 ? 'SENIOR' : 'MEMBER') as TeamMemberRole,
          }))
        }
      }
    });
    teams.push(team);
    console.log(`  Created team "${team.name}" with ${teamSize} members`);
  }

  // ============================================
  // CREATE PROJECTS (63) WITH PHASES & MILESTONES
  // ============================================
  console.log('\nCreating 63 projects with phases and milestones...');

  const projectStatuses: ProjectStatus[] = [
    ...Array(15).fill('PLANNING'),
    ...Array(25).fill('ACTIVE'),
    ...Array(5).fill('ON_HOLD'),
    ...Array(15).fill('COMPLETED'),
    ...Array(3).fill('CANCELLED'),
  ];

  const projects = [];
  const allTasks: any[] = [];

  for (let i = 0; i < 63; i++) {
    const status = projectStatuses[i];
    const startDate = randomDate(oneYearAgo, now);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + randomInt(3, 12));

    const project = await prisma.project.create({
      data: {
        name: `${randomElement(projectPrefixes)} ${randomElement(projectAdjectives)} ${i + 1}`,
        code: generateProjectCode(i),
        description: `A ${randomElement(['critical', 'strategic', 'innovative', 'transformational'])} project focused on ${randomElement(['digital transformation', 'process optimization', 'customer experience', 'infrastructure modernization', 'product development', 'market expansion'])}`,
        type: randomElement(projectTypes),
        status,
        priority: randomElement(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL']) as ProjectPriority,
        clientId: randomElement(clients).id,
        startDate,
        endDate,
        actualStartDate: ['ACTIVE', 'COMPLETED', 'ON_HOLD'].includes(status) ? startDate : null,
        actualEndDate: status === 'COMPLETED' ? endDate : null,
        budgetHours: randomInt(200, 3000),
        budgetCost: randomInt(25000, 750000),
        managerId: randomElement(managers).id,
        methodology: randomElement(['Agile', 'Agile', 'Waterfall', 'Hybrid']),
        tags: randomElements(['priority', 'q1', 'q2', 'q3', 'q4', 'strategic', 'maintenance', 'new-client'], randomInt(1, 4)),
      }
    });
    projects.push(project);

    // Create 3-5 phases per project
    const numPhases = randomInt(3, 5);
    const phaseDuration = Math.floor((endDate.getTime() - startDate.getTime()) / numPhases);

    for (let p = 0; p < numPhases; p++) {
      const phaseStart = new Date(startDate.getTime() + (p * phaseDuration));
      const phaseEnd = new Date(startDate.getTime() + ((p + 1) * phaseDuration));

      const phase = await prisma.projectPhase.create({
        data: {
          projectId: project.id,
          name: phaseNames[p] || `Phase ${p + 1}`,
          description: `${phaseNames[p] || 'Phase'} phase of the project`,
          order: p + 1,
          startDate: phaseStart,
          endDate: phaseEnd,
          status: status === 'COMPLETED' ? 'COMPLETED' : (p === 0 && status === 'ACTIVE' ? 'ACTIVE' : 'PLANNING'),
        }
      });

      // Create milestone at end of each phase
      await prisma.milestone.create({
        data: {
          projectId: project.id,
          phaseId: phase.id,
          name: `${phaseNames[p] || 'Phase'} Complete`,
          description: `Milestone marking completion of ${phaseNames[p] || 'phase'}`,
          dueDate: phaseEnd,
          isCompleted: status === 'COMPLETED',
          completedDate: status === 'COMPLETED' ? phaseEnd : null,
        }
      });

      // Create 3-8 tasks per phase
      const numTasks = randomInt(3, 8);
      for (let t = 0; t < numTasks; t++) {
        const template = randomElement(taskTemplates);
        const taskStatus = status === 'COMPLETED' ? 'COMPLETED' :
                          status === 'CANCELLED' ? 'CANCELLED' :
                          randomElement(['TODO', 'TODO', 'IN_PROGRESS', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED']) as TaskStatus;

        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            phaseId: phase.id,
            title: `${template.action} ${template.subject}`,
            description: `Task: ${template.action} ${template.subject} for ${project.name}`,
            status: taskStatus,
            priority: randomElement(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT']) as TaskPriority,
            estimatedHours: randomInt(4, 40),
            actualHours: taskStatus === 'COMPLETED' ? randomInt(4, 50) : null,
            startDate: phaseStart,
            dueDate: phaseEnd,
            completedDate: taskStatus === 'COMPLETED' ? randomDate(phaseStart, phaseEnd) : null,
            tags: randomElements(['frontend', 'backend', 'database', 'api', 'ui', 'testing', 'devops'], randomInt(1, 3)),
          }
        });
        allTasks.push(task);
      }
    }
  }
  console.log(`  Created ${projects.length} projects`);

  // ============================================
  // CREATE PROJECT ASSIGNMENTS (REALISTIC DEPT DISTRIBUTION)
  // ============================================
  console.log('\nCreating project assignments with realistic department distribution...');
  let assignmentCount = 0;

  // Get unique departments from active users and calculate target utilization
  const activeUsers = users.filter(u => u.status === 'ACTIVE');
  const uniqueDepartments = [...new Set(activeUsers.map(u => u.department).filter(Boolean))];

  // Define target utilization levels for each department
  const deptTargetUtilizations: number[] = [];
  const criticalDeptCount = Math.floor(uniqueDepartments.length * 0.075);
  for (let i = 0; i < criticalDeptCount; i++) deptTargetUtilizations.push(randomInt(5, 24));

  const lowDeptCount = Math.floor(uniqueDepartments.length * 0.125);
  for (let i = 0; i < lowDeptCount; i++) deptTargetUtilizations.push(randomInt(25, 49));

  const moderateDeptCount = Math.floor(uniqueDepartments.length * 0.325);
  for (let i = 0; i < moderateDeptCount; i++) deptTargetUtilizations.push(randomInt(50, 79));

  const optimalDeptCount = Math.floor(uniqueDepartments.length * 0.375);
  for (let i = 0; i < optimalDeptCount; i++) deptTargetUtilizations.push(randomInt(80, 100));

  const overDeptCount = uniqueDepartments.length - (criticalDeptCount + lowDeptCount + moderateDeptCount + optimalDeptCount);
  for (let i = 0; i < overDeptCount; i++) deptTargetUtilizations.push(randomInt(101, 130));

  deptTargetUtilizations.sort(() => Math.random() - 0.5);

  // Map department to target utilization percentage
  const deptTargets = new Map<string, number>();
  uniqueDepartments.forEach((dept, i) => {
    deptTargets.set(dept, deptTargetUtilizations[i] || 75);
  });

  console.log(`  Target distribution: ${criticalDeptCount} critical, ${lowDeptCount} low, ${moderateDeptCount} moderate, ${optimalDeptCount} optimal, ${overDeptCount} over-allocated`);

  // Track user allocations
  const userAllocations = new Map<string, number>();

  // First pass: create assignments
  for (const project of projects) {
    const teamSize = randomInt(3, 8);
    const assignedUsers = randomElements(activeUsers, teamSize);

    for (const user of assignedUsers) {
      try {
        const currentAllocation = userAllocations.get(user.id) || 0;

        // Get department target utilization
        const deptTarget = deptTargets.get(user.department || '') || 75;
        const weeklyHours = user.defaultWeeklyHours || 40;

        // Calculate max hours based on department target
        // For over-allocated departments, allow >100% utilization
        const targetWeekly = (weeklyHours * deptTarget) / 100;
        const maxNewHours = Math.min(40, Math.max(5, targetWeekly - currentAllocation));

        if (maxNewHours < 5 && currentAllocation >= targetWeekly) {
          // User reached department target, skip
          continue;
        }

        // Allocate hours with some randomness to make it realistic
        const allocatedHours = randomInt(
          Math.max(5, Math.floor(maxNewHours * 0.3)),
          Math.ceil(maxNewHours)
        );

        await prisma.projectAssignment.create({
          data: {
            projectId: project.id,
            userId: user.id,
            role: randomElement(['Developer', 'Designer', 'Analyst', 'Lead', 'QA', 'DevOps', 'Architect']),
            allocatedHours,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status === 'COMPLETED' ? 'COMPLETED' :
                    project.status === 'CANCELLED' ? 'CANCELLED' :
                    randomElement(['PLANNED', 'ACTIVE', 'ACTIVE']) as AssignmentStatus,
          }
        });

        userAllocations.set(user.id, currentAllocation + allocatedHours);
        assignmentCount++;
      } catch (e) {
        // Skip duplicate assignments
      }
    }
  }

  // Summary stats
  const allocations = Array.from(userAllocations.values());
  const avgAllocation = allocations.reduce((a, b) => a + b, 0) / allocations.length;
  const maxAllocation = Math.max(...allocations);
  const overallocated = allocations.filter(h => h > 40).length;

  console.log(`  Created ${assignmentCount} project assignments`);
  console.log(`  Avg allocation: ${avgAllocation.toFixed(1)}h/week`);
  console.log(`  Max allocation: ${maxAllocation}h/week`);
  console.log(`  Users over 40h: ${overallocated}/${activeUsers.length}`);

  // ============================================
  // CREATE TASK ASSIGNMENTS
  // ============================================
  console.log('\nCreating task assignments...');
  let taskAssignmentCount = 0;

  for (const task of allTasks) {
    // Assign 1-3 users to each task
    const assignees = randomElements(users.filter(u => u.status === 'ACTIVE'), randomInt(1, 3));
    for (let i = 0; i < assignees.length; i++) {
      try {
        await prisma.taskAssignment.create({
          data: {
            taskId: task.id,
            userId: assignees[i].id,
            isPrimary: i === 0,
            allocatedHours: randomInt(4, 20),
          }
        });
        taskAssignmentCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  Created ${taskAssignmentCount} task assignments`);

  // ============================================
  // CREATE TEAM PROJECT ASSIGNMENTS
  // ============================================
  console.log('\nCreating team project assignments...');
  let teamAssignmentCount = 0;

  for (const project of projects.slice(0, 40)) {
    const assignedTeams = randomElements(teams.filter(t => t.isActive), randomInt(1, 3));
    for (const team of assignedTeams) {
      try {
        await prisma.teamProjectAssignment.create({
          data: {
            teamId: team.id,
            projectId: project.id,
            allocatedHours: randomInt(20, 80),
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status === 'COMPLETED' ? 'COMPLETED' :
                    project.status === 'CANCELLED' ? 'CANCELLED' :
                    randomElement(['PLANNED', 'ACTIVE']) as AssignmentStatus,
          }
        });
        teamAssignmentCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  Created ${teamAssignmentCount} team project assignments`);

  // ============================================
  // SKIP TIME ENTRIES (temporarily disabled due to date handling issues)
  // ============================================
  console.log('\nSkipping time entries (will be fixed later)...');
  const timeEntryCount = 0;
  const sessionCount = 0;

  // Skip the entire time entry creation block
  if (false) {
  let _timeEntryCount = 0;
  let _sessionCount = 0;

  // Get current month boundaries based on TODAY's date
  const today = new Date(); // Use actual current date
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today);
  monthEnd.setHours(23, 59, 59, 999);

  // Get all work days in current month up to today
  const allDaysInMonth: Date[] = [];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      allDaysInMonth.push(new Date(d));
    }
  }

  console.log(`  Month: ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  console.log(`  Work days: ${allDaysInMonth.length}`);
  console.log(`  Creating realistic utilization distribution for marketing...`);

  // Define target utilization levels for realistic distribution
  const userTargetUtilizations: number[] = [];

  // 5-10% Critical (0-24%)
  const criticalUserCount = Math.floor(activeUsers.length * 0.075);
  for (let i = 0; i < criticalUserCount; i++) {
    userTargetUtilizations.push(randomInt(5, 24));
  }

  // 10-15% Low (25-49%)
  const lowUserCount = Math.floor(activeUsers.length * 0.125);
  for (let i = 0; i < lowUserCount; i++) {
    userTargetUtilizations.push(randomInt(25, 49));
  }

  // 30-35% Moderate (50-79%)
  const moderateUserCount = Math.floor(activeUsers.length * 0.325);
  for (let i = 0; i < moderateUserCount; i++) {
    userTargetUtilizations.push(randomInt(50, 79));
  }

  // 35-40% Optimal (80-100%)
  const optimalUserCount = Math.floor(activeUsers.length * 0.375);
  for (let i = 0; i < optimalUserCount; i++) {
    userTargetUtilizations.push(randomInt(80, 100));
  }

  // 5-10% Over-allocated (101-130%)
  const overUserCount = activeUsers.length - (criticalUserCount + lowUserCount + moderateUserCount + optimalUserCount);
  for (let i = 0; i < overUserCount; i++) {
    userTargetUtilizations.push(randomInt(101, 130));
  }

  // Shuffle to randomize
  userTargetUtilizations.sort(() => Math.random() - 0.5);

  for (let userIndex = 0; userIndex < activeUsers.length; userIndex++) {
    const user = activeUsers[userIndex];
    const targetUtil = userTargetUtilizations[userIndex];

    // Calculate target hours for the month
    const weeklyHours = user.defaultWeeklyHours || 40;
    const dailyHours = weeklyHours / 5;
    const targetMonthHours = dailyHours * allDaysInMonth.length;
    const targetHoursToLog = (targetMonthHours * targetUtil) / 100;

    let totalHoursLogged = 0;
    const daysToFill = Math.ceil(allDaysInMonth.length * Math.min(targetUtil / 100, 1.0));

    // Distribute hours across work days
    for (let dayIndex = 0; dayIndex < daysToFill && dayIndex < allDaysInMonth.length; dayIndex++) {
      const entryDate = allDaysInMonth[dayIndex];
      const remainingHours = targetHoursToLog - totalHoursLogged;

      if (remainingHours < 0.5) break;

      // Vary hours per day for realism (4-10 hours with decimal)
      const hoursThisDay = Math.min(
        randomInt(4, 8) + (Math.random() * 2),
        remainingHours,
        dailyHours * 1.3
      );

      if (hoursThisDay < 0.5) continue;

      // Create entries with timer/manual mix
      const isTimerBased = Math.random() > 0.4; // 60% timer-based, 40% manual
      const task = randomElement(allTasks);
      const isBillable = Math.random() > 0.15;

      if (isTimerBased) {
        // TIMER-BASED ENTRY: Use hoursThisDay distributed across 1-3 sessions
        // Validate entryDate before proceeding
        if (!entryDate || isNaN(entryDate.getTime())) {
          console.warn(`  Skipping invalid entry date for timer entry`);
          continue;
        }

        const numSessions = randomInt(1, 3);
        const sessions = [];
        let sessionHoursRemaining = hoursThisDay;

        for (let s = 0; s < numSessions; s++) {
          const sessionStartHour = 8 + (s * 3) + randomInt(0, 2);
          const sessionDuration = s === numSessions - 1
            ? sessionHoursRemaining // Last session gets remaining hours
            : sessionHoursRemaining / (numSessions - s) * (0.8 + Math.random() * 0.4);

          // Create session times
          const sessionStart = createSeedTime(entryDate, sessionStartHour, randomInt(0, 59));
          const sessionEnd = new Date(sessionStart);
          sessionEnd.setTime(sessionEnd.getTime() + sessionDuration * 3600000);

          const sessionBillable = s === 0 ? isBillable : Math.random() > 0.2;

          sessions.push({
            startTime: sessionStart,
            endTime: sessionEnd,
            duration: sessionDuration,
            isBillable: sessionBillable,
            description: randomElement([
              'Working on feature implementation',
              'Code review and debugging',
              'Testing and QA',
              null,
            ]),
          });

          sessionHoursRemaining -= sessionDuration;
        }

        // Skip if no sessions were created
        if (sessions.length === 0) {
          continue;
        }

        const totalBillableHours = sessions.filter(s => s.isBillable).reduce((sum, s) => sum + s.duration, 0);

        await prisma.timeEntry.create({
          data: {
            userId: user.id,
            taskId: task.id,
            date: entryDate,
            hours: hoursThisDay,
            billableHours: totalBillableHours,
            isTimerBased: true,
            sessions: {
              create: sessions
            }
          }
        });
        timeEntryCount++;
        sessionCount += sessions.length;

      } else {
        // MANUAL ENTRY: Single entry using hoursThisDay
        // Validate entryDate before proceeding
        if (!entryDate || isNaN(entryDate.getTime())) {
          console.warn(`  Skipping invalid entry date for user ${user.email}`);
          continue;
        }

        // Create session times (9 AM start)
        const startTime = createSeedTime(entryDate, 9, 0);
        const endTime = createSeedTime(entryDate, 9 + Math.floor(hoursThisDay), Math.round((hoursThisDay % 1) * 60));

        // Debug: Check if times are valid
        if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.warn(`  DEBUG: Invalid times - entryDate: ${entryDate}, startTime: ${startTime}, endTime: ${endTime}`);
          continue;
        }

        await prisma.timeEntry.create({
          data: {
            userId: user.id,
            taskId: task.id,
            date: entryDate,
            hours: hoursThisDay,
            billableHours: isBillable ? hoursThisDay : 0,
            isTimerBased: false,
            // Manual entries have a single session for display purposes
            sessions: {
              create: {
                startTime,
                endTime,
                duration: hoursThisDay,
                isBillable,
                description: randomElement([
                  'Working on assigned tasks',
                  'Code review and feedback',
                  'Bug fixes',
                  'Documentation',
                  'Team meeting',
                  'Design review',
                  'Technical research',
                  'Sprint planning',
                ]),
              }
            }
          }
        });
        timeEntryCount++;
        sessionCount++;
      }

      totalHoursLogged += hoursThisDay;
    }
  }
  console.log(`  Created ${_timeEntryCount} time entries (${_sessionCount} total sessions)`);
  } // End of skipped time entries block

  console.log(`  Created ${timeEntryCount} time entries (${sessionCount} total sessions)`);

  // ============================================
  // CREATE USER AVAILABILITY (for capacity planning)
  // ============================================
  console.log('\nCreating user availability data...');
  let availabilityCount = 0;

  for (const user of activeUsers) {
    // Create availability for the next 30 days
    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const availDate = addDays(now, dayOffset);
      const dayOfWeek = availDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Most users fully available, some partial
      const availType = Math.random() > 0.9 ? 'PARTIAL' : 'AVAILABLE';
      const hours = availType === 'PARTIAL' ? randomInt(4, 6) : 8;

      try {
        await prisma.userAvailability.create({
          data: {
            userId: user.id,
            date: availDate,
            availableHours: hours,
            type: availType,
            notes: availType === 'PARTIAL' ? 'Reduced hours - meetings' : null,
          }
        });
        availabilityCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`  Created ${availabilityCount} availability records`);

  // ============================================
  // CREATE TIME OFF REQUESTS
  // ============================================
  console.log('\nCreating time off requests...');
  let timeOffCount = 0;

  // Create random time-off requests for historical/future dates
  for (const user of activeUsers.slice(0, 20)) {
    const numRequests = randomInt(1, 3);
    for (let r = 0; r < numRequests; r++) {
      const startDate = randomDate(sixMonthsAgo, addDays(now, 60));
      const duration = randomInt(1, 5);
      const endDate = addDays(startDate, duration);

      await prisma.timeOffRequest.create({
        data: {
          userId: user.id,
          type: randomElement(['VACATION', 'VACATION', 'SICK', 'PERSONAL', 'HOLIDAY']) as TimeOffType,
          startDate,
          endDate,
          hours: duration * 8,
          status: startDate < now ? randomElement(['APPROVED', 'APPROVED', 'REJECTED']) : randomElement(['PENDING', 'APPROVED']) as TimeOffStatus,
          reason: randomElement([
            'Family vacation',
            'Personal time',
            'Medical appointment',
            'Holiday travel',
            'Mental health day',
          ]),
          approvedBy: randomElement(managers).id,
          approvedAt: Math.random() > 0.3 ? randomDate(startDate, now) : null,
        }
      });
      timeOffCount++;
    }
  }

  // Create specific current week time-off requests for demo purposes
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const endOfWeek = addDays(startOfWeek, 6); // Saturday

  const currentWeekRequests = [
    {
      user: activeUsers[5],
      type: 'VACATION' as TimeOffType,
      startDate: addDays(startOfWeek, 1), // Monday
      endDate: addDays(startOfWeek, 5), // Friday
      hours: 40,
      reason: 'Week-long vacation',
      status: 'PENDING' as TimeOffStatus,
    },
    {
      user: activeUsers[8],
      type: 'PERSONAL' as TimeOffType,
      startDate: addDays(startOfWeek, 3), // Wednesday
      endDate: addDays(startOfWeek, 3),
      hours: 8,
      reason: 'Personal appointment',
      status: 'APPROVED' as TimeOffStatus,
    },
    {
      user: activeUsers[12],
      type: 'SICK' as TimeOffType,
      startDate: addDays(startOfWeek, 4), // Thursday
      endDate: addDays(startOfWeek, 5), // Friday
      hours: 16,
      reason: 'Flu recovery',
      status: 'PENDING' as TimeOffStatus,
    },
    {
      user: activeUsers[15],
      type: 'VACATION' as TimeOffType,
      startDate: addDays(startOfWeek, 1), // Monday
      endDate: addDays(startOfWeek, 2), // Tuesday
      hours: 16,
      reason: 'Extended weekend',
      status: 'APPROVED' as TimeOffStatus,
    },
    {
      user: activeUsers[18],
      type: 'PERSONAL' as TimeOffType,
      startDate: addDays(startOfWeek, 5), // Friday
      endDate: addDays(startOfWeek, 5),
      hours: 4,
      reason: 'Half day - family event',
      status: 'PENDING' as TimeOffStatus,
    },
  ];

  for (const req of currentWeekRequests) {
    await prisma.timeOffRequest.create({
      data: {
        userId: req.user.id,
        type: req.type,
        startDate: req.startDate,
        endDate: req.endDate,
        hours: req.hours,
        reason: req.reason,
        status: req.status,
        approvedBy: req.status === 'APPROVED' ? randomElement(managers).id : null,
        approvedAt: req.status === 'APPROVED' ? now : null,
      }
    });
    timeOffCount++;
  }

  console.log(`  Created ${timeOffCount} time off requests (including ${currentWeekRequests.length} for current week)`);

  // ============================================
  // SUMMARY
  // ============================================
  // Update system setting to mark test data as installed
  await prisma.systemSetting.upsert({
    where: {
      category_key: {
        category: 'platform',
        key: 'testDataInstalled'
      }
    },
    update: {
      value: true
    },
    create: {
      category: 'platform',
      key: 'testDataInstalled',
      value: true,
      description: 'Indicates whether test data is currently installed'
    }
  });

  console.log('\n========================================');
  console.log('TEST DATA SEED COMPLETE');
  console.log('========================================');
  console.log(`Users:              50 (login with any @${TEST_DOMAIN} email)`);
  console.log(`Password:           ${TEST_PASSWORD}`);
  console.log(`Clients:            ${clients.length} (with contacts)`);
  console.log(`Teams:              ${teams.length}`);
  console.log(`Projects:           ${projects.length} (with phases & milestones)`);
  console.log(`Tasks:              ${allTasks.length}`);
  console.log(`Project Assignments: ${assignmentCount}`);
  console.log(`Task Assignments:   ${taskAssignmentCount}`);
  console.log(`Team Assignments:   ${teamAssignmentCount}`);
  console.log(`Time Entries:       ${timeEntryCount}`);
  console.log(`Availability:       ${availabilityCount}`);
  console.log(`Time Off Requests:  ${timeOffCount}`);
  console.log('========================================\n');
}

// ============================================
// RUN
// ============================================

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
