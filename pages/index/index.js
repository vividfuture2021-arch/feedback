const {
  CATEGORIES,
  ROLES,
  URGENCIES,
  addFeedback,
  getStats
} = require('../../utils/store');

const defaultForm = {
  title: '',
  content: '',
  category: CATEGORIES[0].id,
  urgency: URGENCIES[0].id,
  role: ROLES[0].id,
  name: '',
  contact: '',
  location: '',
  anonymous: true,
  replyRequired: true
};

Page({
  data: {
    categories: CATEGORIES,
    roles: ROLES,
    urgencies: URGENCIES,
    categoryIndex: 0,
    roleIndex: 0,
    urgencyIndex: 0,
    form: { ...defaultForm },
    stats: {
      total: 0,
      pending: 0,
      processing: 0,
      resolved: 0,
      urgent: 0
    },
    submitting: false
  },

  onShow() {
    this.loadStats();
  },

  async loadStats() {
    try {
      const stats = await getStats();
      this.setData({ stats });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: '统计加载失败',
        icon: 'none'
      });
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  onSwitch(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      categoryIndex: index,
      'form.category': CATEGORIES[index].id
    });
  },

  onRoleChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      roleIndex: index,
      'form.role': ROLES[index].id
    });
  },

  onUrgencyChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      urgencyIndex: index,
      'form.urgency': URGENCIES[index].id
    });
  },

  validate(form) {
    const title = form.title.trim();
    const content = form.content.trim();
    const contact = form.contact.trim();
    const name = form.name.trim();

    if (title.length < 2) {
      return '请填写不少于 2 个字的标题';
    }
    if (content.length < 10) {
      return '请把意见内容写得再具体一些，至少 10 个字';
    }
    if (!form.anonymous && name.length < 2) {
      return '非匿名提交时请填写姓名';
    }
    if (form.replyRequired && contact.length < 5) {
      return '需要回复时请留下手机号、邮箱或班级信息';
    }
    return '';
  },

  async submit() {
    if (this.data.submitting) {
      return;
    }

    const form = this.data.form;
    const message = this.validate(form);
    if (message) {
      wx.showToast({
        title: message,
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中' });

    try {
      const item = await addFeedback({
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        name: form.name.trim(),
        contact: form.contact.trim(),
        location: form.location.trim()
      });

      this.resetForm();
      await this.loadStats();

      wx.showModal({
        title: '提交成功',
        content: `您的意见编号是 ${item.serial}，可在“我的反馈”中查看处理进度。`,
        showCancel: false
      });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },

  resetForm() {
    this.setData({
      categoryIndex: 0,
      roleIndex: 0,
      urgencyIndex: 0,
      form: { ...defaultForm }
    });
  }
});
