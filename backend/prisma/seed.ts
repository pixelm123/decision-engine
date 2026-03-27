import { PrismaClient, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {

  await prisma.auditLog.deleteMany();
  await prisma.aggregatedResult.deleteMany();
  await prisma.score.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.option.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.decisionRoom.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: { email: 'alice@test.com', displayName: 'Alice Chen', passwordHash: hash },
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@test.com', displayName: 'Bob Martinez', passwordHash: hash },
  });
  const nalitha = await prisma.user.create({
    data: { email: 'nalitha@test.com', displayName: 'Nalitha Perera', passwordHash: hash },
  });
  const james = await prisma.user.create({
    data: { email: 'james@test.com', displayName: 'James Wu', passwordHash: hash },
  });
  const sara = await prisma.user.create({
    data: { email: 'sara@test.com', displayName: 'Sara Okonkwo', passwordHash: hash },
  });

  const room1 = await prisma.decisionRoom.create({
    data: {
      title: 'Best JS Framework 2026',
      description: 'Evaluating frontend frameworks for our new platform rewrite.',
      hostId: alice.id,
      status: RoomStatus.FINALIZED,
      currentRound: 2,
    },
  });

  await prisma.participant.createMany({
    data: [
      { roomId: room1.id, userId: alice.id, role: 'HOST' },
      { roomId: room1.id, userId: bob.id,   role: 'PARTICIPANT' },
      { roomId: room1.id, userId: nalitha.id, role: 'PARTICIPANT' },
      { roomId: room1.id, userId: james.id, role: 'PARTICIPANT' },
    ],
  });

  const [react, vue, angular, svelte] = await prisma.$transaction([
    prisma.option.create({ data: { roomId: room1.id, label: 'React', description: 'Meta\'s UI library with hooks and a huge ecosystem.' } }),
    prisma.option.create({ data: { roomId: room1.id, label: 'Vue 3', description: 'Progressive framework with Composition API.' } }),
    prisma.option.create({ data: { roomId: room1.id, label: 'Angular 18', description: 'Full-featured framework with signals and standalone components.' } }),
    prisma.option.create({ data: { roomId: room1.id, label: 'Svelte', description: 'Compiler-based approach with minimal runtime.' } }),
  ]);

  const [dx, perf, ecosystem, ts] = await prisma.$transaction([
    prisma.criterion.create({ data: { roomId: room1.id, label: 'Developer Experience', weight: 0.30, order: 1 } }),
    prisma.criterion.create({ data: { roomId: room1.id, label: 'Performance', weight: 0.30, order: 2 } }),
    prisma.criterion.create({ data: { roomId: room1.id, label: 'Ecosystem & Libraries', weight: 0.25, order: 3 } }),
    prisma.criterion.create({ data: { roomId: room1.id, label: 'TypeScript Support', weight: 0.15, order: 4 } }),
  ]);

  const r1Scores: Parameters<typeof prisma.score.createMany>[0]['data'] = [];
  const scoreMatrix: Record<string, Record<string, Record<string, number>>> = {

    [alice.id]:   { [react.id]: { [dx.id]: 8, [perf.id]: 7, [ecosystem.id]: 9, [ts.id]: 8 }, [vue.id]: { [dx.id]: 8, [perf.id]: 8, [ecosystem.id]: 7, [ts.id]: 7 }, [angular.id]: { [dx.id]: 6, [perf.id]: 8, [ecosystem.id]: 8, [ts.id]: 10 }, [svelte.id]: { [dx.id]: 9, [perf.id]: 9, [ecosystem.id]: 5, [ts.id]: 7 } },
    [bob.id]:     { [react.id]: { [dx.id]: 7, [perf.id]: 6, [ecosystem.id]: 9, [ts.id]: 7 }, [vue.id]: { [dx.id]: 9, [perf.id]: 8, [ecosystem.id]: 6, [ts.id]: 6 }, [angular.id]: { [dx.id]: 5, [perf.id]: 7, [ecosystem.id]: 7, [ts.id]: 9 }, [svelte.id]: { [dx.id]: 8, [perf.id]: 9, [ecosystem.id]: 4, [ts.id]: 6 } },
    [nalitha.id]: { [react.id]: { [dx.id]: 9, [perf.id]: 7, [ecosystem.id]: 10, [ts.id]: 8 }, [vue.id]: { [dx.id]: 7, [perf.id]: 7, [ecosystem.id]: 6, [ts.id]: 7 }, [angular.id]: { [dx.id]: 7, [perf.id]: 8, [ecosystem.id]: 9, [ts.id]: 10 }, [svelte.id]: { [dx.id]: 8, [perf.id]: 10, [ecosystem.id]: 5, [ts.id]: 7 } },
    [james.id]:   { [react.id]: { [dx.id]: 7, [perf.id]: 8, [ecosystem.id]: 9, [ts.id]: 9 }, [vue.id]: { [dx.id]: 8, [perf.id]: 7, [ecosystem.id]: 7, [ts.id]: 7 }, [angular.id]: { [dx.id]: 8, [perf.id]: 8, [ecosystem.id]: 8, [ts.id]: 9 }, [svelte.id]: { [dx.id]: 7, [perf.id]: 9, [ecosystem.id]: 4, [ts.id]: 6 } },
  };

  for (const [userId, options] of Object.entries(scoreMatrix)) {
    for (const [optId, criteria] of Object.entries(options)) {
      for (const [critId, value] of Object.entries(criteria)) {
        r1Scores.push({ userId, optionId: optId, criterionId: critId, roundNumber: 1, value });
      }
    }
  }
  await prisma.score.createMany({ data: r1Scores });

  const r2Scores = r1Scores.map(s => ({
    ...s,
    roundNumber: 2,
    value: Math.min(10, Math.max(1, s.value + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
  }));
  await prisma.score.createMany({ data: r2Scores });

  await prisma.aggregatedResult.createMany({
    data: [
      { roomId: room1.id, optionId: react.id,   roundNumber: 2, weightedScore: 7.97 },
      { roomId: room1.id, optionId: angular.id, roundNumber: 2, weightedScore: 7.85 },
      { roomId: room1.id, optionId: vue.id,     roundNumber: 2, weightedScore: 7.30 },
      { roomId: room1.id, optionId: svelte.id,  roundNumber: 2, weightedScore: 6.88 },
    ],
  });

  const r1Ago = (mins: number) => new Date(Date.now() - mins * 60000);
  await prisma.auditLog.createMany({
    data: [
      { roomId: room1.id, userId: alice.id,   action: 'room_created',     metadata: {},                                createdAt: r1Ago(180) },
      { roomId: room1.id, userId: bob.id,     action: 'participant_joined', metadata: {},                              createdAt: r1Ago(172) },
      { roomId: room1.id, userId: nalitha.id, action: 'participant_joined', metadata: {},                              createdAt: r1Ago(168) },
      { roomId: room1.id, userId: james.id,   action: 'participant_joined', metadata: {},                              createdAt: r1Ago(165) },
      { roomId: room1.id, userId: alice.id,   action: 'option_created',    metadata: { label: 'React' },              createdAt: r1Ago(160) },
      { roomId: room1.id, userId: alice.id,   action: 'option_created',    metadata: { label: 'Vue 3' },              createdAt: r1Ago(159) },
      { roomId: room1.id, userId: alice.id,   action: 'option_created',    metadata: { label: 'Angular 18' },         createdAt: r1Ago(158) },
      { roomId: room1.id, userId: alice.id,   action: 'option_created',    metadata: { label: 'Svelte' },             createdAt: r1Ago(157) },
      { roomId: room1.id, userId: alice.id,   action: 'criterion_created', metadata: { label: 'Developer Experience' }, createdAt: r1Ago(156) },
      { roomId: room1.id, userId: alice.id,   action: 'criterion_created', metadata: { label: 'Performance' },        createdAt: r1Ago(155) },
      { roomId: room1.id, userId: alice.id,   action: 'status_changed',    metadata: { from: 'OPEN', to: 'SCORING' }, createdAt: r1Ago(150) },
      { roomId: room1.id, userId: alice.id,   action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 1 }, createdAt: r1Ago(140) },
      { roomId: room1.id, userId: bob.id,     action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 1 }, createdAt: r1Ago(135) },
      { roomId: room1.id, userId: nalitha.id, action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 1 }, createdAt: r1Ago(130) },
      { roomId: room1.id, userId: james.id,   action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 1 }, createdAt: r1Ago(125) },
      { roomId: room1.id, userId: alice.id,   action: 'status_changed',    metadata: { from: 'SCORING', to: 'REVIEWING' }, createdAt: r1Ago(120) },
      { roomId: room1.id, userId: alice.id,   action: 'status_changed',    metadata: { from: 'REVIEWING', to: 'SCORING' }, createdAt: r1Ago(90) },
      { roomId: room1.id, userId: alice.id,   action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 2 }, createdAt: r1Ago(80) },
      { roomId: room1.id, userId: bob.id,     action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 2 }, createdAt: r1Ago(75) },
      { roomId: room1.id, userId: nalitha.id, action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 2 }, createdAt: r1Ago(72) },
      { roomId: room1.id, userId: james.id,   action: 'scores_submitted',  metadata: { scoreCount: 16, roundNumber: 2 }, createdAt: r1Ago(70) },
      { roomId: room1.id, userId: alice.id,   action: 'status_changed',    metadata: { from: 'SCORING', to: 'REVIEWING' }, createdAt: r1Ago(65) },
      { roomId: room1.id, userId: alice.id,   action: 'status_changed',    metadata: { from: 'REVIEWING', to: 'FINALIZED' }, createdAt: r1Ago(60) },
    ],
  });

  const room2 = await prisma.decisionRoom.create({
    data: {
      title: 'Q3 Design Tool Evaluation',
      description: 'Picking our primary design tool for the product team.',
      hostId: bob.id,
      status: RoomStatus.SCORING,
      currentRound: 1,
    },
  });

  await prisma.participant.createMany({
    data: [
      { roomId: room2.id, userId: bob.id,     role: 'HOST' },
      { roomId: room2.id, userId: alice.id,   role: 'PARTICIPANT' },
      { roomId: room2.id, userId: nalitha.id, role: 'PARTICIPANT' },
      { roomId: room2.id, userId: sara.id,    role: 'PARTICIPANT' },
      { roomId: room2.id, userId: james.id,   role: 'PARTICIPANT' },
    ],
  });

  const [figma, sketch, adobe, framer] = await prisma.$transaction([
    prisma.option.create({ data: { roomId: room2.id, label: 'Figma',         description: 'Browser-based with real-time collaboration.' } }),
    prisma.option.create({ data: { roomId: room2.id, label: 'Sketch',        description: 'Mac-native vector tool with plugins.' } }),
    prisma.option.create({ data: { roomId: room2.id, label: 'Adobe XD',      description: 'Part of the Creative Cloud suite.' } }),
    prisma.option.create({ data: { roomId: room2.id, label: 'Framer',        description: 'Design + interactive prototyping in one.' } }),
  ]);

  const [collab2, plugin2, proto2, price2, learn2] = await prisma.$transaction([
    prisma.criterion.create({ data: { roomId: room2.id, label: 'Collaboration', weight: 0.30, order: 1 } }),
    prisma.criterion.create({ data: { roomId: room2.id, label: 'Plugin Ecosystem', weight: 0.20, order: 2 } }),
    prisma.criterion.create({ data: { roomId: room2.id, label: 'Prototyping',  weight: 0.25, order: 3 } }),
    prisma.criterion.create({ data: { roomId: room2.id, label: 'Pricing',      weight: 0.15, order: 4 } }),
    prisma.criterion.create({ data: { roomId: room2.id, label: 'Learning Curve', weight: 0.10, order: 5 } }),
  ]);

  const r2ScoreData: Parameters<typeof prisma.score.createMany>[0]['data'] = [];
  const design2Matrix: Record<string, Record<string, Record<string, number>>> = {
    [alice.id]: {
      [figma.id]:  { [collab2.id]: 10, [plugin2.id]: 9, [proto2.id]: 8, [price2.id]: 6, [learn2.id]: 9 },
      [sketch.id]: { [collab2.id]: 6,  [plugin2.id]: 8, [proto2.id]: 7, [price2.id]: 5, [learn2.id]: 7 },
      [adobe.id]:  { [collab2.id]: 7,  [plugin2.id]: 7, [proto2.id]: 7, [price2.id]: 4, [learn2.id]: 5 },
      [framer.id]: { [collab2.id]: 8,  [plugin2.id]: 5, [proto2.id]: 9, [price2.id]: 5, [learn2.id]: 6 },
    },
    [sara.id]: {
      [figma.id]:  { [collab2.id]: 9, [plugin2.id]: 8, [proto2.id]: 8, [price2.id]: 7, [learn2.id]: 8 },
      [sketch.id]: { [collab2.id]: 5, [plugin2.id]: 7, [proto2.id]: 6, [price2.id]: 6, [learn2.id]: 7 },
      [adobe.id]:  { [collab2.id]: 6, [plugin2.id]: 8, [proto2.id]: 7, [price2.id]: 5, [learn2.id]: 6 },
      [framer.id]: { [collab2.id]: 7, [plugin2.id]: 4, [proto2.id]: 10, [price2.id]: 4, [learn2.id]: 5 },
    },
  };

  for (const [userId, options] of Object.entries(design2Matrix)) {
    for (const [optId, criteria] of Object.entries(options)) {
      for (const [critId, value] of Object.entries(criteria)) {
        r2ScoreData.push({ userId, optionId: optId, criterionId: critId, roundNumber: 1, value });
      }
    }
  }
  await prisma.score.createMany({ data: r2ScoreData });

  await prisma.aggregatedResult.createMany({
    data: [
      { roomId: room2.id, optionId: figma.id,  roundNumber: 1, weightedScore: 8.55 },
      { roomId: room2.id, optionId: framer.id, roundNumber: 1, weightedScore: 6.80 },
      { roomId: room2.id, optionId: sketch.id, roundNumber: 1, weightedScore: 6.45 },
      { roomId: room2.id, optionId: adobe.id,  roundNumber: 1, weightedScore: 6.10 },
    ],
  });

  const r2Ago = (mins: number) => new Date(Date.now() - mins * 60000);
  await prisma.auditLog.createMany({
    data: [
      { roomId: room2.id, userId: bob.id,     action: 'room_created',      metadata: {},                                createdAt: r2Ago(120) },
      { roomId: room2.id, userId: alice.id,   action: 'participant_joined', metadata: {},                              createdAt: r2Ago(118) },
      { roomId: room2.id, userId: nalitha.id, action: 'participant_joined', metadata: {},                              createdAt: r2Ago(115) },
      { roomId: room2.id, userId: sara.id,    action: 'participant_joined', metadata: {},                              createdAt: r2Ago(112) },
      { roomId: room2.id, userId: james.id,   action: 'participant_joined', metadata: {},                              createdAt: r2Ago(110) },
      { roomId: room2.id, userId: bob.id,     action: 'option_created',     metadata: { label: 'Figma' },             createdAt: r2Ago(108) },
      { roomId: room2.id, userId: bob.id,     action: 'option_created',     metadata: { label: 'Sketch' },            createdAt: r2Ago(107) },
      { roomId: room2.id, userId: bob.id,     action: 'option_created',     metadata: { label: 'Adobe XD' },          createdAt: r2Ago(106) },
      { roomId: room2.id, userId: bob.id,     action: 'option_deleted',     metadata: { label: 'InVision' },          createdAt: r2Ago(105) },
      { roomId: room2.id, userId: bob.id,     action: 'option_created',     metadata: { label: 'Framer' },            createdAt: r2Ago(104) },
      { roomId: room2.id, userId: bob.id,     action: 'criterion_created',  metadata: { label: 'Collaboration' },     createdAt: r2Ago(102) },
      { roomId: room2.id, userId: bob.id,     action: 'criterion_created',  metadata: { label: 'Plugin Ecosystem' },  createdAt: r2Ago(101) },
      { roomId: room2.id, userId: bob.id,     action: 'status_changed',     metadata: { from: 'OPEN', to: 'SCORING' }, createdAt: r2Ago(95) },
      { roomId: room2.id, userId: alice.id,   action: 'scores_submitted',   metadata: { scoreCount: 20, roundNumber: 1 }, createdAt: r2Ago(88) },
      { roomId: room2.id, userId: sara.id,    action: 'scores_submitted',   metadata: { scoreCount: 20, roundNumber: 1 }, createdAt: r2Ago(72) },
    ],
  });

  const room3 = await prisma.decisionRoom.create({
    data: {
      title: 'Cloud Provider Selection',
      description: 'Choosing our primary cloud provider for the next 3 years.',
      hostId: nalitha.id,
      status: RoomStatus.REVIEWING,
      currentRound: 1,
    },
  });

  await prisma.participant.createMany({
    data: [
      { roomId: room3.id, userId: nalitha.id, role: 'HOST' },
      { roomId: room3.id, userId: alice.id,   role: 'PARTICIPANT' },
      { roomId: room3.id, userId: james.id,   role: 'PARTICIPANT' },
    ],
  });

  const [aws, gcp, azure] = await prisma.$transaction([
    prisma.option.create({ data: { roomId: room3.id, label: 'AWS',         description: 'Amazon Web Services — industry leader.' } }),
    prisma.option.create({ data: { roomId: room3.id, label: 'Google Cloud', description: 'Strong ML/data tooling, Kubernetes origin.' } }),
    prisma.option.create({ data: { roomId: room3.id, label: 'Azure',       description: 'Microsoft cloud, strong enterprise integration.' } }),
  ]);

  const [pricing3, services3, support3, migration3] = await prisma.$transaction([
    prisma.criterion.create({ data: { roomId: room3.id, label: 'Pricing & Cost',      weight: 0.35, order: 1 } }),
    prisma.criterion.create({ data: { roomId: room3.id, label: 'Managed Services',    weight: 0.30, order: 2 } }),
    prisma.criterion.create({ data: { roomId: room3.id, label: 'Support Quality',     weight: 0.20, order: 3 } }),
    prisma.criterion.create({ data: { roomId: room3.id, label: 'Migration Complexity', weight: 0.15, order: 4 } }),
  ]);

  const cloud3Matrix: Record<string, Record<string, Record<string, number>>> = {
    [nalitha.id]: {
      [aws.id]:   { [pricing3.id]: 6, [services3.id]: 9, [support3.id]: 8, [migration3.id]: 7 },
      [gcp.id]:   { [pricing3.id]: 7, [services3.id]: 8, [support3.id]: 7, [migration3.id]: 8 },
      [azure.id]: { [pricing3.id]: 5, [services3.id]: 8, [support3.id]: 9, [migration3.id]: 6 },
    },
    [alice.id]: {
      [aws.id]:   { [pricing3.id]: 7, [services3.id]: 9, [support3.id]: 7, [migration3.id]: 8 },
      [gcp.id]:   { [pricing3.id]: 8, [services3.id]: 9, [support3.id]: 6, [migration3.id]: 9 },
      [azure.id]: { [pricing3.id]: 6, [services3.id]: 7, [support3.id]: 8, [migration3.id]: 5 },
    },
    [james.id]: {
      [aws.id]:   { [pricing3.id]: 5, [services3.id]: 8, [support3.id]: 7, [migration3.id]: 7 },
      [gcp.id]:   { [pricing3.id]: 8, [services3.id]: 7, [support3.id]: 6, [migration3.id]: 9 },
      [azure.id]: { [pricing3.id]: 7, [services3.id]: 9, [support3.id]: 9, [migration3.id]: 5 },
    },
  };

  const r3ScoreData: Parameters<typeof prisma.score.createMany>[0]['data'] = [];
  for (const [userId, options] of Object.entries(cloud3Matrix)) {
    for (const [optId, criteria] of Object.entries(options)) {
      for (const [critId, value] of Object.entries(criteria)) {
        r3ScoreData.push({ userId, optionId: optId, criterionId: critId, roundNumber: 1, value });
      }
    }
  }
  await prisma.score.createMany({ data: r3ScoreData });

  await prisma.aggregatedResult.createMany({
    data: [
      { roomId: room3.id, optionId: gcp.id,   roundNumber: 1, weightedScore: 7.73 },
      { roomId: room3.id, optionId: aws.id,   roundNumber: 1, weightedScore: 7.28 },
      { roomId: room3.id, optionId: azure.id, roundNumber: 1, weightedScore: 6.81 },
    ],
  });

  const r3Ago = (hrs: number) => new Date(Date.now() - hrs * 3600000);
  await prisma.auditLog.createMany({
    data: [
      { roomId: room3.id, userId: nalitha.id, action: 'room_created',      metadata: {},                               createdAt: r3Ago(5) },
      { roomId: room3.id, userId: alice.id,   action: 'participant_joined', metadata: {},                              createdAt: r3Ago(4.8) },
      { roomId: room3.id, userId: james.id,   action: 'participant_joined', metadata: {},                              createdAt: r3Ago(4.5) },
      { roomId: room3.id, userId: nalitha.id, action: 'status_changed',     metadata: { from: 'OPEN', to: 'SCORING' }, createdAt: r3Ago(4) },
      { roomId: room3.id, userId: nalitha.id, action: 'scores_submitted',   metadata: { scoreCount: 12, roundNumber: 1 }, createdAt: r3Ago(3.5) },
      { roomId: room3.id, userId: alice.id,   action: 'scores_submitted',   metadata: { scoreCount: 12, roundNumber: 1 }, createdAt: r3Ago(3) },
      { roomId: room3.id, userId: james.id,   action: 'scores_submitted',   metadata: { scoreCount: 12, roundNumber: 1 }, createdAt: r3Ago(2.5) },
      { roomId: room3.id, userId: nalitha.id, action: 'status_changed',     metadata: { from: 'SCORING', to: 'REVIEWING' }, createdAt: r3Ago(2) },
    ],
  });

  const room4 = await prisma.decisionRoom.create({
    data: {
      title: 'Senior Backend Engineer Shortlist',
      description: 'Evaluating top 4 candidates from the interview round.',
      hostId: alice.id,
      status: RoomStatus.OPEN,
      currentRound: 1,
    },
  });

  await prisma.participant.createMany({
    data: [
      { roomId: room4.id, userId: alice.id,   role: 'HOST' },
      { roomId: room4.id, userId: bob.id,     role: 'PARTICIPANT' },
      { roomId: room4.id, userId: sara.id,    role: 'PARTICIPANT' },
    ],
  });

  await prisma.option.createMany({
    data: [
      { roomId: room4.id, label: 'Candidate A', description: '5 years Go, strong systems design, remote.' },
      { roomId: room4.id, label: 'Candidate B', description: '8 years Java/Kotlin, led 12-person team.' },
      { roomId: room4.id, label: 'Candidate C', description: '3 years Node, fast learner, excellent culture fit.' },
      { roomId: room4.id, label: 'Candidate D', description: '6 years Python/Django, ML background.' },
    ],
  });

  await prisma.criterion.createMany({
    data: [
      { roomId: room4.id, label: 'Technical Skills',  weight: 0.40, order: 1 },
      { roomId: room4.id, label: 'Culture Fit',        weight: 0.25, order: 2 },
      { roomId: room4.id, label: 'Leadership Potential', weight: 0.20, order: 3 },
      { roomId: room4.id, label: 'Communication',      weight: 0.15, order: 4 },
    ],
  });

  const r4Ago = (mins: number) => new Date(Date.now() - mins * 60000);
  await prisma.auditLog.createMany({
    data: [
      { roomId: room4.id, userId: alice.id, action: 'room_created',      metadata: {},                                  createdAt: r4Ago(30) },
      { roomId: room4.id, userId: bob.id,   action: 'participant_joined', metadata: {},                                 createdAt: r4Ago(25) },
      { roomId: room4.id, userId: sara.id,  action: 'participant_joined', metadata: {},                                 createdAt: r4Ago(22) },
      { roomId: room4.id, userId: alice.id, action: 'option_created',     metadata: { label: 'Candidate A' },          createdAt: r4Ago(20) },
      { roomId: room4.id, userId: alice.id, action: 'option_created',     metadata: { label: 'Candidate B' },          createdAt: r4Ago(19) },
      { roomId: room4.id, userId: alice.id, action: 'option_created',     metadata: { label: 'Candidate C' },          createdAt: r4Ago(18) },
      { roomId: room4.id, userId: alice.id, action: 'option_created',     metadata: { label: 'Candidate D' },          createdAt: r4Ago(17) },
      { roomId: room4.id, userId: alice.id, action: 'criterion_created',  metadata: { label: 'Technical Skills' },     createdAt: r4Ago(15) },
      { roomId: room4.id, userId: alice.id, action: 'criterion_created',  metadata: { label: 'Culture Fit' },          createdAt: r4Ago(14) },
    ],
  });

  const room5 = await prisma.decisionRoom.create({
    data: {
      title: 'Office Catering Vendor',
      description: 'Monthly catering contract — evaluated by the ops team.',
      hostId: sara.id,
      status: RoomStatus.FINALIZED,
      currentRound: 1,
    },
  });

  await prisma.participant.createMany({
    data: [
      { roomId: room5.id, userId: sara.id,    role: 'HOST' },
      { roomId: room5.id, userId: alice.id,   role: 'PARTICIPANT' },
      { roomId: room5.id, userId: bob.id,     role: 'PARTICIPANT' },
      { roomId: room5.id, userId: james.id,   role: 'PARTICIPANT' },
      { roomId: room5.id, userId: nalitha.id, role: 'PARTICIPANT' },
    ],
  });

  const [vendor1, vendor2, vendor3] = await prisma.$transaction([
    prisma.option.create({ data: { roomId: room5.id, label: 'Fresh & Local',  description: 'Farm-to-table, weekly rotating menus.' } }),
    prisma.option.create({ data: { roomId: room5.id, label: 'QuickBite Co',   description: 'Fast delivery, large menu variety.' } }),
    prisma.option.create({ data: { roomId: room5.id, label: 'GreenPlate',     description: 'Vegan/vegetarian focused, sustainability certified.' } }),
  ]);

  const [cost5, variety5, delivery5] = await prisma.$transaction([
    prisma.criterion.create({ data: { roomId: room5.id, label: 'Cost per Head',  weight: 0.40, order: 1 } }),
    prisma.criterion.create({ data: { roomId: room5.id, label: 'Menu Variety',   weight: 0.35, order: 2 } }),
    prisma.criterion.create({ data: { roomId: room5.id, label: 'Delivery Reliability', weight: 0.25, order: 3 } }),
  ]);

  const r5Matrix: Record<string, Record<string, Record<string, number>>> = {
    [sara.id]:    { [vendor1.id]: { [cost5.id]: 6, [variety5.id]: 8, [delivery5.id]: 9 }, [vendor2.id]: { [cost5.id]: 8, [variety5.id]: 7, [delivery5.id]: 8 }, [vendor3.id]: { [cost5.id]: 7, [variety5.id]: 6, [delivery5.id]: 8 } },
    [alice.id]:   { [vendor1.id]: { [cost5.id]: 7, [variety5.id]: 9, [delivery5.id]: 8 }, [vendor2.id]: { [cost5.id]: 9, [variety5.id]: 8, [delivery5.id]: 7 }, [vendor3.id]: { [cost5.id]: 6, [variety5.id]: 7, [delivery5.id]: 9 } },
    [bob.id]:     { [vendor1.id]: { [cost5.id]: 5, [variety5.id]: 9, [delivery5.id]: 9 }, [vendor2.id]: { [cost5.id]: 8, [variety5.id]: 8, [delivery5.id]: 8 }, [vendor3.id]: { [cost5.id]: 7, [variety5.id]: 7, [delivery5.id]: 8 } },
    [james.id]:   { [vendor1.id]: { [cost5.id]: 6, [variety5.id]: 8, [delivery5.id]: 9 }, [vendor2.id]: { [cost5.id]: 9, [variety5.id]: 7, [delivery5.id]: 7 }, [vendor3.id]: { [cost5.id]: 8, [variety5.id]: 6, [delivery5.id]: 8 } },
    [nalitha.id]: { [vendor1.id]: { [cost5.id]: 7, [variety5.id]: 8, [delivery5.id]: 8 }, [vendor2.id]: { [cost5.id]: 8, [variety5.id]: 9, [delivery5.id]: 8 }, [vendor3.id]: { [cost5.id]: 8, [variety5.id]: 7, [delivery5.id]: 9 } },
  };

  const r5ScoreData: Parameters<typeof prisma.score.createMany>[0]['data'] = [];
  for (const [userId, options] of Object.entries(r5Matrix)) {
    for (const [optId, criteria] of Object.entries(options)) {
      for (const [critId, value] of Object.entries(criteria)) {
        r5ScoreData.push({ userId, optionId: optId, criterionId: critId, roundNumber: 1, value });
      }
    }
  }
  await prisma.score.createMany({ data: r5ScoreData });

  await prisma.aggregatedResult.createMany({
    data: [
      { roomId: room5.id, optionId: vendor2.id, roundNumber: 1, weightedScore: 8.05 },
      { roomId: room5.id, optionId: vendor1.id, roundNumber: 1, weightedScore: 7.38 },
      { roomId: room5.id, optionId: vendor3.id, roundNumber: 1, weightedScore: 7.25 },
    ],
  });

  const r5Ago = (days: number) => new Date(Date.now() - days * 86400000);
  await prisma.auditLog.createMany({
    data: [
      { roomId: room5.id, userId: sara.id,    action: 'room_created',       metadata: {},                                  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: alice.id,   action: 'participant_joined',  metadata: {},                                 createdAt: r5Ago(3) },
      { roomId: room5.id, userId: bob.id,     action: 'participant_joined',  metadata: {},                                 createdAt: r5Ago(3) },
      { roomId: room5.id, userId: james.id,   action: 'participant_joined',  metadata: {},                                 createdAt: r5Ago(3) },
      { roomId: room5.id, userId: nalitha.id, action: 'participant_joined',  metadata: {},                                 createdAt: r5Ago(3) },
      { roomId: room5.id, userId: sara.id,    action: 'status_changed',      metadata: { from: 'OPEN', to: 'SCORING' },   createdAt: r5Ago(3) },
      { roomId: room5.id, userId: sara.id,    action: 'scores_submitted',    metadata: { scoreCount: 9, roundNumber: 1 },  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: alice.id,   action: 'scores_submitted',    metadata: { scoreCount: 9, roundNumber: 1 },  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: bob.id,     action: 'scores_submitted',    metadata: { scoreCount: 9, roundNumber: 1 },  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: james.id,   action: 'scores_submitted',    metadata: { scoreCount: 9, roundNumber: 1 },  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: nalitha.id, action: 'scores_submitted',    metadata: { scoreCount: 9, roundNumber: 1 },  createdAt: r5Ago(3) },
      { roomId: room5.id, userId: sara.id,    action: 'status_changed',      metadata: { from: 'SCORING', to: 'REVIEWING' }, createdAt: r5Ago(3) },
      { roomId: room5.id, userId: sara.id,    action: 'status_changed',      metadata: { from: 'REVIEWING', to: 'FINALIZED' }, createdAt: r5Ago(3) },
    ],
  });

}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
