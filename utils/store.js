const ADMIN_LOGIN_KEY = 'school_feedback_admin_login_v2';
const ADMIN_PASSWORD_KEY = 'school_feedback_admin_password_v2';
const HIDDEN_MY_IDS_KEY = 'school_feedback_hidden_my_ids_v1';

const CATEGORIES = [
  { id: 'teaching', name: '教学课堂' },
  { id: 'canteen', name: '食堂餐饮' },
  { id: 'dormitory', name: '宿舍生活' },
  { id: 'campus', name: '校园环境' },
  { id: 'service', name: '行政服务' },
  { id: 'safety', name: '安全保障' },
  { id: 'activity', name: '社团活动' },
  { id: 'other', name: '其他建议' }
];

const ROLES = [
  { id: 'student', name: '学生' },
  { id: 'teacher', name: '教师' },
  { id: 'parent', name: '家长' },
  { id: 'staff', name: '职工' },
  { id: 'other', name: '其他' }
];

const URGENCIES = [
  { id: 'normal', name: '普通' },
  { id: 'important', name: '重要' },
  { id: 'urgent', name: '紧急' }
];

const STATUS_LIST = [
  { id: 'pending', name: '待处理' },
  { id: 'processing', name: '处理中' },
  { id: 'resolved', name: '已回复' },
  { id: 'closed', name: '已关闭' }
];

function readArray(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function writeArray(key, value) {
  wx.setStorageSync(key, Array.isArray(value) ? value : []);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d} ${h}:${min}`;
}

function findName(list, id) {
  const item = list.find((option) => option.id === id);
  return item ? item.name : id;
}

function normalize(item) {
  const id = item.id || item._id;
  return {
    ...item,
    id,
    categoryName: findName(CATEGORIES, item.category),
    roleName: findName(ROLES, item.role),
    urgencyName: findName(URGENCIES, item.urgency),
    statusName: findName(STATUS_LIST, item.status),
    createdAtText: formatDate(item.createdAt),
    updatedAtText: formatDate(item.updatedAt)
  };
}

function calcStats(items) {
  const source = Array.isArray(items) ? items : [];
  const pending = source.filter((item) => item.status === 'pending').length;
  const processing = source.filter((item) => item.status === 'processing').length;
  const resolved = source.filter((item) => item.status === 'resolved').length;
  const urgent = source.filter((item) => item.urgency === 'urgent').length;
  return {
    total: source.length,
    pending,
    processing,
    resolved,
    urgent
  };
}

async function callFeedback(action, data) {
  const response = await wx.cloud.callFunction({
    name: 'feedback',
    data: {
      action,
      ...(data || {})
    }
  });

  const result = response && response.result;
  if (!result) {
    throw new Error('云函数没有返回结果');
  }
  if (!result.ok) {
    throw new Error(result.message || '云端操作失败');
  }
  return result.data;
}

function getAdminPassword() {
  return wx.getStorageSync(ADMIN_PASSWORD_KEY) || '';
}

async function addFeedback(payload) {
  const item = await callFeedback('addFeedback', { payload });
  return normalize(item);
}

async function getFeedbacks() {
  const items = await callFeedback('getFeedbacks', {
    adminPassword: getAdminPassword()
  });
  return items.map(normalize);
}

async function getMyFeedbacks() {
  const hiddenIds = readArray(HIDDEN_MY_IDS_KEY);
  const items = await callFeedback('getMyFeedbacks');
  return items
    .map(normalize)
    .filter((item) => !hiddenIds.includes(item.id));
}

async function getStats(items) {
  if (Array.isArray(items)) {
    return calcStats(items);
  }
  return callFeedback('getStats');
}

async function updateFeedback(id, patch) {
  const item = await callFeedback('updateFeedback', {
    id,
    patch,
    adminPassword: getAdminPassword()
  });
  return normalize(item);
}

function removeFeedback(id) {
  const hiddenIds = readArray(HIDDEN_MY_IDS_KEY).filter((itemId) => itemId !== id);
  writeArray(HIDDEN_MY_IDS_KEY, [id, ...hiddenIds]);
}

function isAdminLoggedIn() {
  return wx.getStorageSync(ADMIN_LOGIN_KEY) === true && Boolean(getAdminPassword());
}

async function loginAdmin(password) {
  await callFeedback('loginAdmin', { adminPassword: password });
  wx.setStorageSync(ADMIN_LOGIN_KEY, true);
  wx.setStorageSync(ADMIN_PASSWORD_KEY, password);
  return true;
}

function logoutAdmin() {
  wx.removeStorageSync(ADMIN_LOGIN_KEY);
  wx.removeStorageSync(ADMIN_PASSWORD_KEY);
}

module.exports = {
  CATEGORIES,
  ROLES,
  URGENCIES,
  STATUS_LIST,
  addFeedback,
  updateFeedback,
  removeFeedback,
  getFeedbacks,
  getMyFeedbacks,
  getStats,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin
};
