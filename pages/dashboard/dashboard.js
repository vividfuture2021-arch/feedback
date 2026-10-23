const {
  CATEGORIES,
  STATUS_LIST,
  getFeedbacks,
  getStats,
  updateFeedback,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin
} = require('../../utils/store');

const ALL_STATUS = [{ id: 'all', name: '全部状态' }, ...STATUS_LIST];
const ALL_CATEGORIES = [{ id: 'all', name: '全部分类' }, ...CATEGORIES];

Page({
  data: {
    loggedIn: false,
    password: '',
    keyword: '',
    statusOptions: ALL_STATUS,
    categoryOptions: ALL_CATEGORIES,
    statusIndex: 0,
    categoryIndex: 0,
    stats: {
      total: 0,
      pending: 0,
      processing: 0,
      resolved: 0,
      urgent: 0
    },
    items: [],
    filteredItems: [],
    selected: null,
    replyDraft: '',
    loading: false,
    loggingIn: false,
    updating: false
  },

  onShow() {
    this.setData({ loggedIn: isAdminLoggedIn() });
    if (this.data.loggedIn) {
      this.refresh();
    }
  },

  async onPullDownRefresh() {
    if (this.data.loggedIn) {
      await this.refresh();
    }
    wx.stopPullDownRefresh();
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },

  async login() {
    const password = this.data.password.trim();
    if (!password) {
      wx.showToast({
        title: '请输入管理密码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loggingIn: true });
    wx.showLoading({ title: '登录中' });
    try {
      await loginAdmin(password);
      this.setData({
        loggedIn: true,
        password: ''
      });
      await this.refresh();
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ loggingIn: false });
    }
  },

  logout() {
    logoutAdmin();
    this.setData({
      loggedIn: false,
      items: [],
      filteredItems: [],
      selected: null
    });
  },

  async refresh() {
    this.setData({ loading: true });
    wx.showNavigationBarLoading();
    try {
      const items = await getFeedbacks();
      const stats = await getStats();
      this.setData({
        items,
        stats
      });
      this.applyFilters();
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      if (/密码|权限|登录/.test(error.message || '')) {
        this.logout();
      }
    } finally {
      wx.hideNavigationBarLoading();
      this.setData({ loading: false });
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
    this.applyFilters();
  },

  onStatusChange(event) {
    this.setData({ statusIndex: Number(event.detail.value) });
    this.applyFilters();
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const status = this.data.statusOptions[this.data.statusIndex].id;
    const category = this.data.categoryOptions[this.data.categoryIndex].id;
    const filteredItems = this.data.items.filter((item) => {
      const matchedKeyword = !keyword || [
        item.title,
        item.content,
        item.serial,
        item.location,
        item.contact,
        item.name
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
      const matchedStatus = status === 'all' || item.status === status;
      const matchedCategory = category === 'all' || item.category === category;
      return matchedKeyword && matchedStatus && matchedCategory;
    });

    this.setData({ filteredItems });
  },

  openDetail(event) {
    const id = event.currentTarget.dataset.id;
    const selected = this.data.items.find((item) => item.id === id);
    this.setData({
      selected,
      replyDraft: selected ? selected.reply : ''
    });
  },

  closeDetail() {
    this.setData({
      selected: null,
      replyDraft: ''
    });
  },

  noop() {},

  onReplyInput(event) {
    this.setData({ replyDraft: event.detail.value });
  },

  async setStatus(event) {
    const status = event.currentTarget.dataset.status;
    if (!this.data.selected || this.data.updating) {
      return;
    }

    const reply = this.data.replyDraft.trim();
    const patch = { status };
    if (status === 'resolved') {
      if (reply) {
        patch.reply = reply;
      } else if (!this.data.selected.reply) {
        wx.showToast({
          title: '请先填写回复内容',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({ updating: true });
    try {
      const selected = await updateFeedback(this.data.selected.id, patch);
      await this.afterUpdate(selected, '状态已更新');
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none'
      });
    } finally {
      this.setData({ updating: false });
    }
  },

  async saveReply() {
    if (!this.data.selected || this.data.updating) {
      return;
    }
    const reply = this.data.replyDraft.trim();
    if (!reply) {
      wx.showToast({
        title: '请先填写回复内容',
        icon: 'none'
      });
      return;
    }
    this.setData({ updating: true });
    try {
      const selected = await updateFeedback(this.data.selected.id, {
        reply,
        status: 'resolved'
      });
      await this.afterUpdate(selected, '回复已保存');
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ updating: false });
    }
  },

  async afterUpdate(selected, toastTitle) {
    const items = await getFeedbacks();
    const stats = await getStats();
    const current = items.find((item) => item.id === selected.id) || selected;
    this.setData({
      selected: current,
      replyDraft: current.reply || '',
      items,
      stats
    });
    this.applyFilters();
    wx.showToast({
      title: toastTitle,
      icon: 'success'
    });
  }
});
