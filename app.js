App({
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '基础库版本过低',
        content: '请使用 2.2.3 或以上基础库以支持微信云开发。',
        showCancel: false
      });
      return;
    }

    wx.cloud.init({
      env: '自己的id',
      traceUser: true
    });
  },
  globalData: {
    appName: '校园意见箱',
    cloudEnvId: '自己的id'
  }
});
