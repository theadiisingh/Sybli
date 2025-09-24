/**
 * Demo Proposals Seed Data
 * Creates sample DAO proposals for testing and demonstration
 */

exports.seed = async function(knex) {
  // First get the user IDs and create a DAO
  const users = await knex('users').select('id', 'username');
  const userMap = users.reduce((map, user) => {
    map[user.username] = user.id;
    return map;
  }, {});

  // Create a demo DAO
  const daos = await knex('daos').insert([
    {
      name: 'FitnessDAO',
      symbol: 'FIT',
      contract_address: '0xf1tne5s5d4o1234567890abcdef1234567890abcd',
      description: 'A decentralized autonomous organization for fitness enthusiasts and health professionals to govern community health initiatives.',
      governance_token_address: '0xg0v3rn4nc3t0k3n1234567890abcdef12345678',
      proposal_threshold: '100.00000000',
      quorum_threshold: 15.5,
      voting_period_days: 7,
      execution_delay_hours: 24,
      logo_url: 'https://example.com/daos/fitnessdao/logo.png',
      website_url: 'https://fitnessdao.example.com',
      social_links: JSON.stringify({
        twitter: 'https://twitter.com/fitnessdao',
        discord: 'https://discord.gg/fitnessdao',
        github: 'https://github.com/fitnessdao'
      }),
      tags: JSON.stringify(['fitness', 'health', 'wellness', 'community']),
      status: 'active',
      is_public: true,
      creator_id: userMap['alice_fitness'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]).returning('*');

  const daoId = daos[0].id;

  // Add users as DAO members
  await knex('dao_members').insert([
    {
      user_id: userMap['alice_fitness'],
      dao_id: daoId,
      token_balance: '1500.00000000',
      role: 'admin',
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    },
    {
      user_id: userMap['bob_strong'],
      dao_id: daoId,
      token_balance: '1200.00000000',
      role: 'moderator',
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    },
    {
      user_id: userMap['carol_wellness'],
      dao_id: daoId,
      token_balance: '800.00000000',
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    },
    {
      user_id: userMap['dave_lifts'],
      dao_id: daoId,
      token_balance: '600.00000000',
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    }
  ]);

  console.log('✅ DAO and members created successfully');

  // Create demo proposals
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const proposals = await knex('dao_proposals').insert([
    {
      dao_id: daoId,
      proposer_id: userMap['alice_fitness'],
      title: 'Community Fitness Center Funding Proposal',
      description: `Proposal to allocate 50,000 FIT tokens to fund the development of a community fitness center in downtown area. The center will include:

- State-of-the-art gym equipment
- Yoga and meditation studios
- Nutrition counseling services
- Community event space

This initiative aims to make fitness accessible to all community members regardless of income level. The center will operate on a sliding scale payment system and offer free classes to low-income residents.

Budget Breakdown:
- Equipment: 25,000 FIT
- Facility rental: 15,000 FIT
- Staffing: 8,000 FIT
- Marketing: 2,000 FIT

Expected Impact:
- Serve 500+ community members monthly
- Create 10+ local jobs
- Improve community health metrics by 15% within first year`,

      proposal_id: 'FIT-001',
      actions: JSON.stringify([
        {
          type: 'transfer',
          recipient: '0xc0mmun1tyf1tn3ssc3nt3r1234567890abcdef',
          amount: '50000.00000000',
          token: 'FIT'
        }
      ]),
      value: '0',
      target_contract: '0xtr34surym4n4g3r1234567890abcdef12345678',
      voting_start_at: twoWeeksAgo.toISOString(),
      voting_end_at: oneWeekAgo.toISOString(),
      quorum_threshold: 10.0,
      status: 'executed',
      for_votes: '3200.00000000',
      against_votes: '800.00000000',
      abstain_votes: '200.00000000',
      total_votes: '4200.00000000',
      executed_at: new Date(oneWeekAgo.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      transaction_hash: '0xexecuted1234567890abcdef1234567890abcdef1234567890abcdef',
      created_at: twoWeeksAgo.toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      dao_id: daoId,
      proposer_id: userMap['bob_strong'],
      title: 'Quarterly Community Fitness Challenge',
      description: `Organize a quarterly fitness challenge with prize pools to encourage community participation and healthy competition.

Challenge Structure:
- 12-week duration
- Multiple categories: Weight loss, Strength gain, Endurance, Flexibility
- Weekly check-ins and progress tracking
- Professional coaching and support

Prize Pool Distribution:
- 1st Place: 5,000 FIT
- 2nd Place: 3,000 FIT
- 3rd Place: 2,000 FIT
- Participation rewards: 5,000 FIT (distributed among all participants)

Total Budget: 15,000 FIT tokens

Benefits:
- Increase community engagement
- Promote healthy lifestyle habits
- Showcase success stories
- Attract new members to FitnessDAO`,

      proposal_id: 'FIT-002',
      actions: JSON.stringify([
        {
          type: 'create_challenge',
          name: 'Q3 Fitness Challenge 2024',
          duration_weeks: 12,
          prize_pool: '15000.00000000'
        }
      ]),
      value: '0',
      target_contract: '0xch4ll3ng3m4n4g3r1234567890abcdef12345678',
      voting_start_at: now.toISOString(),
      voting_end_at: oneWeekFromNow.toISOString(),
      quorum_threshold: 8.0,
      status: 'active',
      for_votes: '1800.00000000',
      against_votes: '300.00000000',
      abstain_votes: '100.00000000',
      total_votes: '2200.00000000',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updated_at: new Date().toISOString()
    },
    {
      dao_id: daoId,
      proposer_id: userMap['carol_wellness'],
      title: 'Healthy Nutrition Program for Schools',
      description: `Implement a comprehensive nutrition education program in local schools to teach children about healthy eating habits and lifestyle choices.

Program Components:
- Interactive nutrition workshops
- Healthy cooking classes
- School garden initiative
- Parent education sessions
- Nutritional assessment tools

Budget Allocation:
- Educational materials: 8,000 FIT
- Instructor fees: 12,000 FIT
- Garden supplies: 3,000 FIT
- Assessment tools: 2,000 FIT

Total Request: 25,000 FIT tokens

Target Schools:
- 5 elementary schools (500+ students)
- 2 middle schools (300+ students)
- Program duration: 6 months

Expected Outcomes:
- Improve nutritional knowledge by 60%
- Increase fruit/vegetable consumption by 40%
- Reduce sugary drink consumption by 30%`,

      proposal_id: 'FIT-003',
      actions: JSON.stringify([
        {
          type: 'fund_program',
          program_name: 'School Nutrition Initiative',
          amount: '25000.00000000',
          duration_months: 6
        }
      ]),
      value: '0',
      target_contract: '0x3duc4t10nm4n4g3r1234567890abcdef12345678',
      voting_start_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      voting_end_at: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days from now
      quorum_threshold: 12.0,
      status: 'pending',
      for_votes: '0',
      against_votes: '0',
      abstain_votes: '0',
      total_votes: '0',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      updated_at: new Date().toISOString()
    },
    {
      dao_id: daoId,
      proposer_id: userMap['dave_lifts'],
      title: 'Gym Equipment Upgrade and Maintenance Fund',
      description: `Establish a recurring fund for gym equipment upgrades and maintenance across all community fitness facilities.

Why This Matters:
- Ensure equipment safety and reliability
- Keep facilities modern and appealing
- Reduce long-term replacement costs
- Maintain high member satisfaction

Funding Structure:
- Quarterly allocation: 10,000 FIT
- Annual total: 40,000 FIT
- Oversight committee: 3 elected members
- Transparent spending reports

Equipment Prioritization:
1. Safety-critical repairs (immediate)
2. High-usage equipment replacement
3. New technology integration
4. Capacity expansion

This proposal establishes a sustainable maintenance model rather than reactive spending.`,

      proposal_id: 'FIT-004',
      actions: JSON.stringify([
        {
          type: 'create_recurring_fund',
          purpose: 'Equipment Maintenance',
          quarterly_amount: '10000.00000000',
          oversight_committee_size: 3
        }
      ]),
      value: '0',
      target_contract: '0x3qu1pm3ntm4n4g3r1234567890abcdef12345678',
      voting_start_at: oneWeekAgo.toISOString(),
      voting_end_at: new Date(oneWeekAgo.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      quorum_threshold: 15.0,
      status: 'defeated',
      for_votes: '1200.00000000',
      against_votes: '2800.00000000',
      abstain_votes: '400.00000000',
      total_votes: '4400.00000000',
      created_at: new Date(oneWeekAgo.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      dao_id: daoId,
      proposer_id: userMap['alice_fitness'],
      title: 'Partnership with Local Health Providers',
      description: `Establish formal partnerships with local healthcare providers to integrate FitnessDAO initiatives with professional medical services.

Partnership Benefits:
- Medical oversight for fitness programs
- Referral system between providers and FitnessDAO
- Joint health research initiatives
- Insurance coverage possibilities

Proposed Partners:
- City General Hospital
- Community Health Clinic
- Sports Medicine Specialists
- Mental Health Services

Partnership Structure:
- Memorandum of Understanding with each provider
- Quarterly joint committee meetings
- Shared marketing and outreach
- Cross-training opportunities

Budget: 20,000 FIT for initial setup and first year operations

This partnership will elevate FitnessDAO's credibility and expand our impact on community health.`,

      proposal_id: 'FIT-005',
      actions: JSON.stringify([
        {
          type: 'establish_partnership',
          partners: ['City General Hospital', 'Community Health Clinic', 'Sports Medicine Specialists'],
          budget: '20000.00000000',
          duration_years: 1
        }
      ]),
      value: '0',
      target_contract: '0xp4rtn3rsh1pm4n4g3r1234567890abcdef12345678',
      voting_start_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      voting_end_at: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
      quorum_threshold: 10.0,
      status: 'active',
      for_votes: '2500.00000000',
      against_votes: '600.00000000',
      abstain_votes: '300.00000000',
      total_votes: '3400.00000000',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      updated_at: new Date().toISOString()
    }
  ]).returning('*');

  console.log('✅ Demo proposals created successfully');

  // Create votes for the proposals
  const votes = await knex('votes').insert([
    // Votes for Proposal 1 (executed)
    { proposal_id: proposals[0].id, user_id: userMap['alice_fitness'], vote_type: 'for', vote_weight: '1500.00000000', reason: 'Strongly support community fitness initiatives', voted_at: new Date(twoWeeksAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[0].id, user_id: userMap['bob_strong'], vote_type: 'for', vote_weight: '1200.00000000', reason: 'Great proposal for community health', voted_at: new Date(twoWeeksAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[0].id, user_id: userMap['carol_wellness'], vote_type: 'for', vote_weight: '500.00000000', reason: 'Support but concerned about budget size', voted_at: new Date(twoWeeksAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[0].id, user_id: userMap['dave_lifts'], vote_type: 'against', vote_weight: '600.00000000', reason: 'Budget too large, need more detailed plan', voted_at: new Date(twoWeeksAgo.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[0].id, user_id: userMap['carol_wellness'], vote_type: 'abstain', vote_weight: '300.00000000', reason: 'Undecided on specific implementation', voted_at: new Date(twoWeeksAgo.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() },

    // Votes for Proposal 2 (active)
    { proposal_id: proposals[1].id, user_id: userMap['alice_fitness'], vote_type: 'for', vote_weight: '1500.00000000', reason: 'Love the competitive aspect!', voted_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[1].id, user_id: userMap['bob_strong'], vote_type: 'for', vote_weight: '1200.00000000', reason: 'This will boost community engagement', voted_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[1].id, user_id: userMap['carol_wellness'], vote_type: 'against', vote_weight: '300.00000000', reason: 'Concerned about inclusivity', voted_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[1].id, user_id: userMap['dave_lifts'], vote_type: 'abstain', vote_weight: '600.00000000', reason: 'Need more details on judging criteria', voted_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },

    // Votes for Proposal 4 (defeated)
    { proposal_id: proposals[3].id, user_id: userMap['alice_fitness'], vote_type: 'for', vote_weight: '800.00000000', reason: 'Preventative maintenance is crucial', voted_at: new Date(oneWeekAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[3].id, user_id: userMap['bob_strong'], vote_type: 'for', vote_weight: '400.00000000', reason: 'Good long-term thinking', voted_at: new Date(oneWeekAgo.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[3].id, user_id: userMap['carol_wellness'], vote_type: 'against', vote_weight: '800.00000000', reason: 'Too much recurring funding', voted_at: new Date(oneWeekAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[3].id, user_id: userMap['dave_lifts'], vote_type: 'against', vote_weight: '2000.00000000', reason: 'Should be project-based funding', voted_at: new Date(oneWeekAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() },

    // Votes for Proposal 5 (active)
    { proposal_id: proposals[4].id, user_id: userMap['alice_fitness'], vote_type: 'for', vote_weight: '1500.00000000', reason: 'Essential for long-term credibility', voted_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[4].id, user_id: userMap['bob_strong'], vote_type: 'for', vote_weight: '1000.00000000', reason: 'Great strategic move', voted_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[4].id, user_id: userMap['carol_wellness'], vote_type: 'against', vote_weight: '600.00000000', reason: 'Budget too high for initial partnerships', voted_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { proposal_id: proposals[4].id, user_id: userMap['dave_lifts'], vote_type: 'abstain', vote_weight: '600.00000000', reason: 'Need more details on partnership terms', voted_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString() }
  ]).returning('*');

  console.log('✅ Demo votes created successfully');

  return {
    daos,
    proposals,
    votes
  };
};