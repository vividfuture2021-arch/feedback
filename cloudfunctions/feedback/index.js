const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const feedbacks = db.collection('feedbacks');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STATUS_LIST = ['pending', 'processing', 'resolved', 'closed'];
const CATEGORIES = ['teaching', 'canteen', 'dormitory', 'campus', 'service', 'safety', 'activity', 'other'];
const ROLES = ['student', 'teacher', 'parent', 'staff', 'other'];
const URGENCIES = ['normal', 'important', 'urgent'];

function ok(data) {
  return {
    ok: true,
    data
  };
}

function fail(message, code) {
  return {
    ok: false,
    code: code || 'ERROR',
    message
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function makeSerial(date) {
  const y = String(date.getFullYear()).slice(2);
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YJ${y}${m}${d}${suffix}`;
}

function cleanString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function assertAdmin(password) {
  if (!ADMIN_PASSWORD) {
    const error = new Error('请先配置云函数环境变量 ADMIN_PASSWORD');
    error.code = 'CONFIG_ERROR';
    throw error;
  }
  if (password !== ADMIN_PASSWORD) {
    const error = new Error('管理密码不正确或登录已失效');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
}

function validateChoice(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

function buildFeedback(payload, openid) {
  const title = cleanString(payload.title, 80);
  const content = cleanString(payload.content, 800);
  const name = cleanString(payload.name, 40);
  const contact = cleanString(payload.contact, 80);
  const anonymous = Boolean(payload.anonymous);
  const replyRequired = Boolean(payload.replyRequired);

  if (title.length < 2) {
    throw new Error('请填写不少于 2 个字的标题');
  }
  if (content.length < 10) {
    throw new Error('请把意见内容写得再具体一些，至少 10 个字');
  }
  if (!anonymous && name.length < 2) {
    throw new Error('非匿名提交时请填写姓名');
  }
  if (replyRequired && contact.length < 5) {
    throw new Error('需要回复时请留下手机号、邮箱或班级信息');
  }

  const now = new Date();
  return {
    serial: makeSerial(now),
    title,
    content,
    category: validateChoice(payload.category, CATEGORIES, 'other'),
    urgency: validateChoice(payload.urgency, URGENCIES, 'normal'),
    role: validateChoice(payload.role, ROLES, 'student'),
    name: anonymous ? '' : name,
    contact,
    location: cleanString(payload.location, 80),
    anonymous,
    replyRequired,
    status: 'pending',
    reply: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    _openid: openid
  };
}

async function countWhere(query) {
  const result = await feedbacks.where(query).count();
  return result.total || 0;
}

async function addFeedback(event, openid) {
  const item = buildFeedback(event.payload || {}, openid);
  const result = await feedbacks.add({
    data: item
  });
  return {
    _id: result._id,
    ...item
  };
}

async function getMyFeedbacks(openid) {
  const result = await feedbacks
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return result.data || [];
}

async function getFeedbacks(event) {
  assertAdmin(event.adminPassword);
  const result = await feedbacks
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return result.data || [];
}

async function getStats() {
  const [total, pending, processing, resolved, urgent] = await Promise.all([
    feedbacks.count().then((result) => result.total || 0),
    countWhere({ status: 'pending' }),
    countWhere({ status: 'processing' }),
    countWhere({ status: 'resolved' }),
    countWhere({ urgency: 'urgent' })
  ]);

  return {
    total,
    pending,
    processing,
    resolved,
    urgent
  };
}

async function updateFeedback(event) {
  assertAdmin(event.adminPassword);

  const id = cleanString(event.id, 80);
  const patch = event.patch || {};
  const data = {
    updatedAt: new Date().toISOString()
  };

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    if (!STATUS_LIST.includes(patch.status)) {
      throw new Error('处理状态不合法');
    }
    data.status = patch.status;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'reply')) {
    data.reply = cleanString(patch.reply, 500);
  }

  await feedbacks.doc(id).update({ data });
  const fresh = await feedbacks.doc(id).get();
  return fresh.data;
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();

  try {
    switch (event.action) {
      case 'addFeedback':
        return ok(await addFeedback(event, wxContext.OPENID));
      case 'getMyFeedbacks':
        return ok(await getMyFeedbacks(wxContext.OPENID));
      case 'getFeedbacks':
        return ok(await getFeedbacks(event));
      case 'getStats':
        return ok(await getStats());
      case 'updateFeedback':
        return ok(await updateFeedback(event));
      case 'loginAdmin':
        assertAdmin(event.adminPassword);
        return ok({ authenticated: true });
      default:
        return fail('未知操作', 'UNKNOWN_ACTION');
    }
  } catch (error) {
    return fail(error.message || '云函数执行失败', error.code);
  }
};
