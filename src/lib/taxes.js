const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const { getProperties, getBusinesses } = require('./properties');
const { logger } = require('./logger');

const TAXES_CHANNEL_ID = '1481844353851854988';
const TAX_COMMAND_CHANNEL_ID = '1491639237693673593';
const TAX_PAYMENT_REVIEW_CHANNEL_ID = '150507079368651590';
const BUSINESS_HUB_CHANNEL_ID = '1473480495655419954';
const BUSINESS_APPLICATION_CHANNEL_ID = '1481858406460424192';
const BUSINESS_TICKET_CHANNEL_ID = '1481771668291719321';
const BUSINESS_OWNER_ROLE_NAME = 'Business Owner';
const BUSINESS_WEEKLY_TAX = 20000;
const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
const TAX_DATA_PATH = path.join(__dirname, '..', '..', 'data', 'tax-records.json');
const LISTING_MESSAGES_PATH = path.join(__dirname, '..', '..', 'data', 'property-listing-messages.json');
const TAX_INFRACTION_ROLE_NAMES = ['tax infraction 1', 'tax infraction 2', 'tax infraction 3'];
const GUILD_ID = process.env.GUILD_ID || '';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readTaxData() {
  return readJson(TAX_DATA_PATH, { bills: [], payments: [], lastBillingPeriod: '' });
}

function writeTaxData(data) {
  writeJson(TAX_DATA_PATH, {
    bills: Array.isArray(data.bills) ? data.bills : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    lastBillingPeriod: data.lastBillingPeriod || ''
  });
}

function readListingMessages() {
  return readJson(LISTING_MESSAGES_PATH, {});
}

function writeListingMessages(data) {
  writeJson(LISTING_MESSAGES_PATH, data);
}

function currency(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function parseMoney(value) {
  const normalized = String(value || '').toLowerCase();

  if (!normalized || normalized.includes('not for sale') || normalized === 'n/a') {
    return 0;
  }

  const number = Number(normalized.replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function isDiscordUserId(value) {
  return /^\d{17,20}$/.test(String(value || ''));
}

function extractDiscordUserId(value) {
  const text = String(value || '').trim();

  if (isDiscordUserId(text)) {
    return text;
  }

  const mentionMatch = text.match(/^<@!?(\d{17,20})>$/);

  if (mentionMatch) {
    return mentionMatch[1];
  }

  const labelMatch = text.match(/\((\d{17,20})\)\s*$/);
  return labelMatch ? labelMatch[1] : '';
}

function businessRegisteredLongEnough(business, now = Date.now()) {
  if (!business.registeredAt && !business.createdAt) {
    return true;
  }

  const registeredAt = Date.parse(business.registeredAt || business.createdAt);
  return Number.isFinite(registeredAt) && now - registeredAt >= 7 * 24 * 60 * 60 * 1000;
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const daysSinceMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - daysSinceMonday);
  return copy;
}

function nextMonday(date = new Date()) {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 7);
  return start;
}

function currentBillingPeriod(date = new Date()) {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function nextBillingPeriod(date = new Date()) {
  return nextMonday(date).toISOString().slice(0, 10);
}

function periodLabel(period) {
  const start = new Date(`${period}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return `${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`;
}

function addCharge(chargesByUser, userId, charge) {
  const resolvedUserId = extractDiscordUserId(userId);

  if (!resolvedUserId || charge.amount <= 0) {
    return;
  }

  const entry = chargesByUser.get(resolvedUserId) || [];
  entry.push(charge);
  chargesByUser.set(resolvedUserId, entry);
}

async function calculateTaxCharges(date = new Date()) {
  const properties = await getProperties({ forceRefresh: true });
  const businesses = await getBusinesses({ forceRefresh: true });
  const businessesByName = new Map(businesses.map(business => [String(business.name || '').toLowerCase(), business]));
  const chargesByUser = new Map();

  for (const property of properties) {
    const amount = parseMoney(property.tax);

    if (!amount) {
      continue;
    }

    const owner = String(property.owner || '');
    const business = businessesByName.get(owner.toLowerCase());
    const userId = business ? String(business.ownerId || business.owner || '') : owner;

    addCharge(chargesByUser, userId, {
      amount,
      label: `${property.name} (${property.number})`,
      type: 'Property Tax'
    });
  }

  for (const business of businesses) {
    if (!businessRegisteredLongEnough(business, date.getTime())) {
      continue;
    }

    addCharge(chargesByUser, business.ownerId || business.owner, {
      amount: BUSINESS_WEEKLY_TAX,
      label: business.name || 'Business',
      type: 'Business Tax'
    });
  }

  return chargesByUser;
}

function summarizeCharges(charges) {
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  return {
    lines: charges.map(charge => `${charge.type}: ${charge.label} - ${currency(charge.amount)}`),
    total
  };
}

function buildBillEmbed(userId, bill) {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle('Weekly Tax Bill')
    .setDescription([
      `<@${userId}>`,
      '',
      ...bill.lines,
      '',
      `Total due: **${currency(bill.amount)}**`,
      '',
      'You have 48 hours to pay the bill.'
    ].join('\n'))
    .setFooter({ text: `Tax period: ${periodLabel(bill.period)}` })
    .setTimestamp();
}

function buildBusinessTypesEmbed() {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle('Business Types')
    .setDescription([
      'Florida State Civilian Operations is opening the door for more official businesses. If you have a group ready to provide real value, this is where you start.',
      '',
      '**Towing** - roadside assistance, vehicle recovery, and active tow operations.',
      '**Security** - private protection, event security, contracted patrols, and organized guard work.',
      '**Real Estate** - property sales, leasing, ownership support, and property management.',
      '**Ingame Service** - food, taxis, barber shops, shops, and other service-based businesses.',
      '',
      `Ready to apply? Head to <#${BUSINESS_APPLICATION_CHANNEL_ID}> and submit your business application.`,
      `Have a new business type idea? Make a ticket in <#${BUSINESS_TICKET_CHANNEL_ID}>.`
    ].join('\n'));
}

async function ensureRole(guild, name, options = {}) {
  await guild.roles.fetch();
  const existing = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    await existing.setPosition(1).catch(() => null);
    return existing;
  }

  const role = await guild.roles.create({
    name,
    permissions: options.permissions || [],
    reason: options.reason || 'Operations bot role setup'
  });

  await role.setPosition(1).catch(() => null);
  return role;
}

async function ensureTaxInfractionRoles(guild) {
  const roles = [];

  for (const name of TAX_INFRACTION_ROLE_NAMES) {
    roles.push(await ensureRole(guild, name, { reason: 'Tax infraction role setup' }));
  }

  return roles;
}

async function ensureBusinessOwnerRole(guild) {
  return ensureRole(guild, BUSINESS_OWNER_ROLE_NAME, { reason: 'Business owner role setup' });
}

async function giveBusinessOwnerRole(guild, userId) {
  if (!isDiscordUserId(userId)) {
    return false;
  }

  const role = await ensureBusinessOwnerRole(guild);
  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return false;
  }

  await member.roles.add(role, 'Accepted business application');
  return true;
}

function getActiveBillForUser(userId, period = currentBillingPeriod()) {
  const data = readTaxData();
  return data.bills.find(bill => bill.userId === userId && bill.period === period && bill.status !== 'paid') || null;
}

async function calculateUpcomingBillForUser(userId, date = new Date()) {
  const chargesByUser = await calculateTaxCharges(date);
  const charges = chargesByUser.get(userId) || [];
  const summary = summarizeCharges(charges);
  return {
    amount: summary.total,
    charges,
    lines: summary.lines
  };
}

async function runWeeklyTaxBilling(client, date = new Date()) {
  const period = currentBillingPeriod(date);
  const data = readTaxData();

  if (data.lastBillingPeriod === period) {
    return false;
  }

  const firstAllowedPeriod = nextBillingPeriod(new Date('2026-05-15T12:00:00'));

  if (period < firstAllowedPeriod) {
    return false;
  }

  const guild = client.guilds.cache.get(GUILD_ID) || client.guilds.cache.first();
  const channel = await client.channels.fetch(TAXES_CHANNEL_ID);
  const chargesByUser = await calculateTaxCharges(date);

  if (!guild) {
    return false;
  }

  await ensureTaxInfractionRoles(guild);

  for (const [userId, charges] of chargesByUser) {
    const summary = summarizeCharges(charges);

    if (!summary.total) {
      continue;
    }

    const bill = {
      id: `${period}-${userId}`,
      amount: summary.total,
      createdAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString(),
      infractionApplied: false,
      lines: summary.lines,
      paidAt: '',
      period,
      status: 'unpaid',
      userId
    };

    const message = await channel.send({
      content: `<@${userId}>`,
      embeds: [buildBillEmbed(userId, bill)],
      allowedMentions: { users: [userId] }
    });
    bill.messageId = message.id;
    data.bills = data.bills.filter(entry => entry.id !== bill.id);
    data.bills.push(bill);
  }

  data.lastBillingPeriod = period;
  writeTaxData(data);
  return true;
}

async function applyTaxInfractions(client) {
  const data = readTaxData();
  const now = Date.now();
  let changed = false;
  const guild = client.guilds.cache.get(GUILD_ID) || client.guilds.cache.first();

  if (!guild) {
    return false;
  }

  const roles = await ensureTaxInfractionRoles(guild);

  for (const bill of data.bills) {
    if (bill.status === 'paid' || bill.infractionApplied || Date.parse(bill.dueAt) > now) {
      continue;
    }

    const member = await guild.members.fetch(bill.userId).catch(() => null);

    if (!member) {
      continue;
    }

    let currentIndex = -1;

    for (let index = roles.length - 1; index >= 0; index--) {
      if (member.roles.cache.has(roles[index].id)) {
        currentIndex = index;
        break;
      }
    }
    const nextRole = roles[Math.min(currentIndex + 1, roles.length - 1)];

    if (nextRole) {
      await member.roles.add(nextRole, `Unpaid taxes for ${bill.period}`);
      bill.infractionApplied = true;
      changed = true;
    }
  }

  if (changed) {
    writeTaxData(data);
  }

  return changed;
}

function buildPaymentRequestRows(paymentId, disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tax_payment:accept:${paymentId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`tax_payment:accept_reason:${paymentId}`)
        .setLabel('Accept with reason')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`tax_payment:deny:${paymentId}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`tax_payment:deny_reason:${paymentId}`)
        .setLabel('Deny with reason')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    )
  ];
}

function paymentEmbed({ bill, payment, proof }) {
  return new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle('Tax Payment Request')
    .setDescription([
      `User: <@${payment.userId}> (${payment.userId})`,
      `Amount due: **${currency(bill?.amount || 0)}**`,
      '',
      '**Charges**',
      ...(bill?.lines?.length ? bill.lines : ['No active bill was found.']),
      '',
      `Proof: ${proof}`
    ].join('\n'))
    .setFooter({ text: `Payment ID: ${payment.id}` })
    .setTimestamp();
}

async function createTaxPaymentRequest(interaction, proof) {
  const userId = interaction.user.id;
  const bill = getActiveBillForUser(userId);
  const data = readTaxData();
  const payment = {
    billId: bill?.id || '',
    createdAt: new Date().toISOString(),
    id: `payment-${Date.now()}-${userId}`,
    proof,
    reviewedAt: '',
    reviewerId: '',
    status: 'pending',
    userId
  };

  data.payments.push(payment);
  writeTaxData(data);

  const channel = await interaction.client.channels.fetch(TAX_PAYMENT_REVIEW_CHANNEL_ID);
  const message = await channel.send({
    embeds: [paymentEmbed({ bill, payment, proof })],
    components: buildPaymentRequestRows(payment.id)
  });
  payment.messageId = message.id;
  writeTaxData(data);

  return { bill, payment };
}

function decideTaxPayment(paymentId, action, reviewerId, reason = '') {
  const data = readTaxData();
  const payment = data.payments.find(entry => entry.id === paymentId);

  if (!payment) {
    return { ok: false, reason: 'missing_payment' };
  }

  const bill = data.bills.find(entry => entry.id === payment.billId);
  payment.status = action === 'accept' ? 'accepted' : 'denied';
  payment.reviewedAt = new Date().toISOString();
  payment.reviewerId = reviewerId;
  payment.reason = reason;

  if (action === 'accept' && bill) {
    bill.status = 'paid';
    bill.paidAt = payment.reviewedAt;
    bill.paidByPaymentId = payment.id;
  }

  writeTaxData(data);
  return { bill, ok: true, payment };
}

function startTaxScheduler(client) {
  const run = async () => {
    try {
      await runWeeklyTaxBilling(client);
      await applyTaxInfractions(client);
    } catch (error) {
      logger.error('Failed to run tax scheduler:', error);
    }
  };

  run();
  setInterval(run, 10 * 60 * 1000);
}

async function postBusinessHubInfo(client) {
  const channel = await client.channels.fetch(BUSINESS_HUB_CHANNEL_ID);
  await channel.send({ embeds: [buildBusinessTypesEmbed()] });
}

module.exports = {
  BUSINESS_HUB_CHANNEL_ID,
  BUSINESS_OWNER_ROLE_NAME,
  BUSINESS_TICKET_CHANNEL_ID,
  TAX_COMMAND_CHANNEL_ID,
  TAXES_CHANNEL_ID,
  TAX_PAYMENT_REVIEW_CHANNEL_ID,
  buildBusinessTypesEmbed,
  buildPaymentRequestRows,
  calculateUpcomingBillForUser,
  createTaxPaymentRequest,
  currency,
  decideTaxPayment,
  ensureBusinessOwnerRole,
  ensureTaxInfractionRoles,
  getActiveBillForUser,
  giveBusinessOwnerRole,
  postBusinessHubInfo,
  readListingMessages,
  startTaxScheduler,
  writeListingMessages
};
