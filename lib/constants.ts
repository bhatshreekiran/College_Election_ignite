export interface PostDetail {
  title: string;
  description: string[];
}

export const POSTS_DESCRIPTIONS: Record<string, PostDetail> = {
  'President': {
    title: 'President',
    description: [
      'Represent the club in all college-level meetings.',
      'Lead the executive committee and oversee all activities.',
      'Coordinate with faculty and administration for major events.',
      'Ensure the club meets its goals and strategic objectives.'
    ]
  },
  'Vice President': {
    title: 'Vice President',
    description: [
      'Assist the President in all leadership duties.',
      'Assume Presidential responsibilities in their absence.',
      'Oversee internal club committee performance.',
      'Coordinate with other club leaders for joint initiatives.'
    ]
  },
  'Secretary': {
    title: 'Secretary',
    description: [
      'Maintain all official club records and minutes of meetings.',
      'Handle internal and external correspondence.',
      'Maintain the club directory and membership database.',
      'Prepare agendas for all club meetings.'
    ]
  },
  'Cultural Co-ordinator': {
    title: 'Cultural Co-ordinator',
    description: [
      'Organize and manage cultural events and festivals.',
      'Coordinate with external performers and sound/light teams.',
      'Oversee talent hunts and student participation.',
      'Budgeting for cultural decorations and logistics.'
    ]
  },
  'Publicity Coordinator': {
    title: 'Publicity Coordinator',
    description: [
      'Handle offline and campus-wide promotion of events.',
      'Manage poster distributions and classroom announcements.',
      'Collaborate with the media team for unified outreach.',
      'Oversee event registrations and kiosks.'
    ]
  },
  'Media Coordinator': {
    title: 'Media Coordinator',
    description: [
      'Manage all social media handles and online presence.',
      'Oversee photography and videography during events.',
      'Create digital content, newsletters, and press releases.',
      'Handle relationships with local media and college magazines.'
    ]
  },
  'Treasurer': {
    title: 'Treasurer',
    description: [
      'Prepare the annual club budget and financial reports.',
      'Manage all income, expenditures, and reimbursements.',
      'Liaise with the college accounts department.',
      'Maintain transparent financial records for audits.'
    ]
  },
  'Technical Coordinator': {
    title: 'Technical Coordinator',
    description: [
      'Oversee any software or hardware needs for the club.',
      'Coordinate technical events, workshops, or hackathons.',
      'Manage the club website or portal if applicable.',
      'Ensure AV and technical support during major events.'
    ]
  },
  'Assistant Vice President': {
    title: 'Assistant Vice President',
    description: [
      'Support the Vice President in committee management.',
      'Help coordinate inter-departmental club activities.',
      'Monitor progress of assigned special projects.',
      'Provide administrative support to the leadership team.'
    ]
  },
  'Joint Secretary': {
    title: 'Joint Secretary',
    description: [
      'Assist the Secretary in documentation and record-keeping.',
      'Handle logistical arrangements for club meetings.',
      'Distribution of newsletters and notifications.',
      'Manage the inventory of club assets.'
    ]
  },
  'Assistant Cultural Co-ordinator': {
    title: 'Assistant Cultural Co-ordinator',
    description: [
      'Support the main coordinator in event execution.',
      'Manage volunteer teams for cultural activities.',
      'Assist in vendor coordination for food and decor.',
      'Maintain the schedule for cultural rehearsals.'
    ]
  },
  'Assistant Publicity Coordinator': {
    title: 'Assistant Publicity Coordinator',
    description: [
      'Assist in physical poster display and banner placements.',
      'Coordination of flash mobs and promotion teams.',
      'Manage registration desk volunteers.',
      'Collect feedback and student interest data.'
    ]
  },
  'Assistant Media Coordinator': {
    title: 'Assistant Media Coordinator',
    description: [
      'Help in capturing photos and videos for events.',
      'Drafting captions and social media posts.',
      'Distribution of digital invites and tags.',
      'Managing the club\'s digital asset folders.'
    ]
  },
  'Assistant Treasurer': {
    title: 'Assistant Treasurer',
    description: [
      'Help track event-wise expenses and collections.',
      'Organize bills and receipts for reimbursement.',
      'Assist in preparing entry fee collection reports.',
      'Support the Treasurer in monthly financial audits.'
    ]
  },
  'Assistant Technical Coordinator': {
    title: 'Assistant Technical Coordinator',
    description: [
      'Assist in setting up equipment for technical workshops.',
      'Provide on-ground support for digital tools during events.',
      'Help in maintaining the club database.',
      'Coordinate with the technical volunteers.'
    ]
  }
};

export const POSTS_BY_SEMESTER: Record<string, string[]> = {
  '4th': [
    'Assistant Vice President',
    'Joint Secretary',
    'Assistant Cultural Co-ordinator',
    'Assistant Publicity Coordinator',
    'Assistant Media Coordinator',
    'Assistant Treasurer',
    'Assistant Technical Coordinator',
  ],
  '6th': [
    'President',
    'Vice President',
    'Secretary',
    'Cultural Co-ordinator',
    'Publicity Coordinator',
    'Media Coordinator',
    'Treasurer',
    'Technical Coordinator',
  ],
};

export const ALL_POSTS = [...POSTS_BY_SEMESTER['4th'], ...POSTS_BY_SEMESTER['6th']];
