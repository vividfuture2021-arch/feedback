const {
  getMyFeedbacks,
  removeFeedback
} = require('../../utils/store');

Page({
  data: {
    records: [],
    loading: false
  },

  onShow() {
    this.refresh();
  },

  async onPullDownRefresh() {
    await this.refresh();
    wx.stopPullDownRefresh();
  },

  async refresh() {
    this.setData({ loading: true });
    try {
      const records = await getMyFeedbacks();
      this.setData({ records });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  copySerial(event) {
    const serial = event.currentTarget.dataset.serial;
    wx.setClipboardData({
      data: serial
    });
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记录',
      content: '删除后本机将隐藏这条反馈，云端后台记录仍会保留。',
      confirmText: '删除',
      confirmColor: '#A33E2F',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }
        removeFeedback(id);
        await this.refresh();
        wx.showToast({
          title: '已删除',
          icon: 'success'
        });
      }
    });
  }
});
