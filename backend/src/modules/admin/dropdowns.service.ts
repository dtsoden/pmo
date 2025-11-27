import { db } from '../../core/database/client.js';

// Ensure the single config row exists
async function ensureConfigRow() {
  const existing = await db.dropdownLists.findUnique({ where: { id: 'default' } });
  if (!existing) {
    await db.dropdownLists.create({
      data: {
        id: 'default',
        industries: JSON.stringify([
          'Technology',
          'Healthcare',
          'Finance',
          'Manufacturing',
          'Retail',
          'Education',
          'Government',
          'Non-profit',
          'Other',
        ]),
        projectTypes: JSON.stringify([
          'Internal',
          'Client Project',
          'R&D',
          'Maintenance',
          'Support',
        ]),
        skillCategories: JSON.stringify([
          'Programming',
          'Design',
          'Project Management',
          'Data Analysis',
          'DevOps',
          'QA/Testing',
        ]),
        departments: JSON.stringify([
          'Engineering',
          'Product',
          'Design',
          'Operations',
          'Sales',
          'Marketing',
          'HR',
          'Finance',
        ]),
        regions: JSON.stringify([
          // United States
          'US Northeast',
          'US Southeast',
          'US Midwest',
          'US Southwest',
          'US West Coast',
          'US Mountain West',
          'US Pacific Northwest',
          // Canada
          'Eastern Canada',
          'Western Canada',
          'Central Canada',
          'Atlantic Canada',
          // Mexico
          'Northern Mexico',
          'Central Mexico',
          'Southern Mexico',
          // Brazil
          'Southeast Brazil',
          'South Brazil',
          'Northeast Brazil',
          'North Brazil',
          'Central-West Brazil',
          // United Kingdom
          'England',
          'Scotland',
          'Wales',
          'Northern Ireland',
          // France
          'Île-de-France',
          'Northern France',
          'Southern France',
          'Eastern France',
          'Western France',
          // Germany
          'Northern Germany',
          'Southern Germany',
          'Eastern Germany',
          'Western Germany',
          // India
          'North India',
          'South India',
          'East India',
          'West India',
          'Central India',
          // Japan
          'Kanto',
          'Kansai',
          'Chubu',
          'Tohoku',
          'Kyushu',
          'Hokkaido',
          // China
          'North China',
          'South China',
          'East China',
          'West China',
          'Central China',
          // Australia
          'New South Wales',
          'Victoria',
          'Queensland',
          'Western Australia',
          'South Australia',
          'Tasmania',
          'Northern Territory',
          // South Africa
          'Gauteng',
          'Western Cape',
          'KwaZulu-Natal',
          'Eastern Cape',
          'Free State',
          'Limpopo',
          // UAE
          'Abu Dhabi',
          'Dubai',
          'Sharjah',
          'Ajman',
          'Other Emirates',
          // Broad regions (for other countries or general use)
          'North America (Other)',
          'Europe (Other)',
          'Asia Pacific (Other)',
          'Latin America (Other)',
          'Middle East (Other)',
          'Africa (Other)',
        ]),
      },
    });
  }
  return existing || await db.dropdownLists.findUnique({ where: { id: 'default' } });
}

// Get all dropdown lists
export async function getAllDropdowns() {
  await ensureConfigRow();
  const config = await db.dropdownLists.findUnique({ where: { id: 'default' } });

  return {
    industries: JSON.parse(config?.industries || '[]'),
    projectTypes: JSON.parse(config?.projectTypes || '[]'),
    skillCategories: JSON.parse(config?.skillCategories || '[]'),
    departments: JSON.parse(config?.departments || '[]'),
    regions: JSON.parse(config?.regions || '[]'),
    updatedAt: config?.updatedAt,
  };
}

// Get a specific dropdown list
export async function getDropdown(name: string) {
  await ensureConfigRow();
  const config = await db.dropdownLists.findUnique({ where: { id: 'default' } });

  const validFields = ['industries', 'projectTypes', 'skillCategories', 'departments', 'regions'] as const;
  if (!validFields.includes(name as typeof validFields[number])) {
    throw new Error(`Invalid dropdown name: ${name}`);
  }

  const fieldName = name as keyof typeof config;
  const value = config?.[fieldName] as string || '[]';
  return JSON.parse(value);
}

// Update a specific dropdown list
export async function updateDropdown(name: string, values: string[], updatedBy?: string) {
  await ensureConfigRow();

  const validFields = ['industries', 'projectTypes', 'skillCategories', 'departments', 'regions'];
  if (!validFields.includes(name)) {
    throw new Error(`Invalid dropdown name: ${name}`);
  }

  const updateData: Record<string, string | undefined> = {
    [name]: JSON.stringify(values),
    updatedBy,
  };

  await db.dropdownLists.update({
    where: { id: 'default' },
    data: updateData,
  });

  return values;
}

// Add item to a dropdown list
export async function addToDropdown(name: string, value: string, updatedBy?: string) {
  const current = await getDropdown(name);
  if (current.includes(value)) {
    throw new Error(`"${value}" already exists in ${name}`);
  }
  current.push(value);
  return updateDropdown(name, current, updatedBy);
}

// Remove item from a dropdown list
export async function removeFromDropdown(name: string, value: string, updatedBy?: string) {
  const current = await getDropdown(name);
  const index = current.indexOf(value);
  if (index === -1) {
    throw new Error(`"${value}" not found in ${name}`);
  }
  current.splice(index, 1);
  return updateDropdown(name, current, updatedBy);
}

// Reorder items in a dropdown list
export async function reorderDropdown(name: string, values: string[], updatedBy?: string) {
  return updateDropdown(name, values, updatedBy);
}
