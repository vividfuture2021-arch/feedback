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
      env: 'cloud1-d3gqe9h1j8d185219',
      traceUser: true
    });
  },
  globalData: {
    appName: '校园意见箱',
    cloudEnvId: 'cloud1-d3gqe9h1j8d185219'
  }
});
