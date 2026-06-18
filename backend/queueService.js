import Token from './models/Token.js';
import Settings from './models/Settings.js';
import Counter from './models/Counter.js';

const MIN_SAMPLES_FOR_REAL_AVG = 3;
const RECENT_DONE_LIMIT = 10;

async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ avgConsultMinutes: 10 });
  }
  return settings;
}

async function computeEffectiveAvgMinutes(settingsAvg) {
  const recentDone = await Token.find({ status: 'done', calledAt: { $ne: null }, completedAt: { $ne: null } })
    .sort({ completedAt: -1 })
    .limit(RECENT_DONE_LIMIT)
    .lean();

  if (recentDone.length < MIN_SAMPLES_FOR_REAL_AVG) {
    return { effectiveAvg: settingsAvg, isDataDriven: false, sampleCount: recentDone.length };
  }

  const durations = recentDone.map((t) => (t.completedAt - t.calledAt) / 60000);
  const effectiveAvg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  return {
    effectiveAvg: Math.max(1, Math.round(effectiveAvg * 10) / 10),
    isDataDriven: true,
    sampleCount: recentDone.length,
  };
}

function remainingServingMinutes(nowServing, effectiveAvg) {
  if (!nowServing?.calledAt) return 0;
  const elapsedMin = (Date.now() - new Date(nowServing.calledAt).getTime()) / 60000;
  return Math.max(0, Math.round((effectiveAvg - elapsedMin) * 10) / 10);
}

export async function buildState() {
  const settings = await getSettings();
  const { effectiveAvg, isDataDriven, sampleCount } = await computeEffectiveAvgMinutes(settings.avgConsultMinutes);

  const [nowServing, waitingTokens, totalDone] = await Promise.all([
    Token.findOne({ status: 'serving' }).sort({ calledAt: 1 }).lean(),
    Token.find({ status: 'waiting' }).sort({ number: 1 }).lean(),
    Token.countDocuments({ status: 'done' }),
  ]);

  const remainingCurrent = remainingServingMinutes(nowServing, effectiveAvg);

  const waiting = waitingTokens.map((token, index) => ({
    number: token.number,
    name: token.name,
    position: index + 1,
    estimatedWaitMin: Math.round((remainingCurrent + index * effectiveAvg) * 10) / 10,
  }));

  return {
    nowServing: nowServing
      ? {
          number: nowServing.number,
          name: nowServing.name,
          calledAt: nowServing.calledAt,
          remainingMin: remainingCurrent,
        }
      : null,
    waiting,
    avgUsedMinutes: effectiveAvg,
    isDataDriven,
    sampleCount,
    settingsAvg: settings.avgConsultMinutes,
    totalDone,
    updatedAt: new Date().toISOString(),
  };
}

async function getNextTokenNumber() {
  const counter = await Counter.findByIdAndUpdate(
    'tokenNumber',
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

export async function addPatient(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new Error('Patient name is required');
  }

  const nextNumber = await getNextTokenNumber();

  const token = await Token.create({
    number: nextNumber,
    name: trimmed,
    status: 'waiting',
  });

  return token;
}

export async function callNext() {
  const serving = await Token.findOne({ status: 'serving' });
  if (serving) {
    throw new Error('Complete the current patient before calling the next token');
  }

  const next = await Token.findOneAndUpdate(
    { status: 'waiting' },
    { $set: { status: 'serving', calledAt: new Date() } },
    { sort: { number: 1 }, new: true }
  );

  if (!next) {
    throw new Error('No patients waiting in the queue');
  }

  return next;
}

export async function completeCurrent() {
  const serving = await Token.findOne({ status: 'serving' });
  if (!serving) {
    throw new Error('No patient is currently being served');
  }

  serving.status = 'done';
  serving.completedAt = new Date();
  await serving.save();
  return serving;
}

export async function setAvgTime(minutes) {
  const parsed = Number(minutes);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
    throw new Error('Average consultation time must be between 1 and 120 minutes');
  }

  const settings = await getSettings();
  settings.avgConsultMinutes = Math.round(parsed);
  await settings.save();
  return settings;
}

export async function removeToken(number) {
  const parsed = Number(number);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid token number');
  }

  const token = await Token.findOne({ number: parsed, status: 'waiting' });
  if (!token) {
    throw new Error('Token not found in waiting queue');
  }

  token.status = 'removed';
  await token.save();
  return token;
}

export async function getPatientStatus(tokenNumber) {
  const parsed = Number(tokenNumber);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid token number');
  }

  const state = await buildState();
  const token = await Token.findOne({ number: parsed }).lean();
  if (!token || token.status === 'removed') {
    throw new Error('Token not found');
  }

  if (token.status === 'serving') {
    return {
      ...state,
      yourToken: parsed,
      tokensAhead: 0,
      estimatedWaitMin: 0,
      status: 'your turn',
    };
  }

  if (token.status === 'done') {
    return {
      ...state,
      yourToken: parsed,
      tokensAhead: 0,
      estimatedWaitMin: 0,
      status: 'done',
    };
  }

  const waitingEntry = state.waiting.find((w) => w.number === parsed);
  if (!waitingEntry) {
    throw new Error('Token not found in waiting queue');
  }

  return {
    ...state,
    yourToken: parsed,
    tokensAhead: waitingEntry.position - 1,
    estimatedWaitMin: waitingEntry.estimatedWaitMin,
    status: 'waiting',
  };
}
