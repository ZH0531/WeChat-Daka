Page({
      data: {
    records: [],
    timeSinceLast: {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      scrollIntoView: ''
    },
    timeColor: '#000',
    timerInterval: null,
    animationData: {},
    buttonAnimation: {},
    isDarkMode: false,
    newRecordIndex: -1,
    animationTimer: null
  },
  
      onLoad() {
    this.loadRecords();
    
    // 创建记录卡片动画实例
    this.animation = wx.createAnimation({
      duration: 600,
      timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // Spring-like easing
    });
    
    // 检测系统主题
    this.checkSystemTheme();
  },
  
  // 检测系统主题
  checkSystemTheme() {
    wx.getSystemInfo({
      success: (res) => {
        const isDark = res.theme === 'dark';
        this.setData({ isDarkMode: isDark });
        
        // 监听系统主题变化
        wx.onThemeChange((result) => {
          this.setData({ isDarkMode: result.theme === 'dark' });
        });
      }
    });
  },
  
  onShow() {
    // 启动计时器，每秒更新一次时间
    this.startTimer();
  },
  
  onHide() {
    // 清除计时器
    this.clearTimer();
  },
  
  onUnload() {
    // 清除计时器
    this.clearTimer();
  },
  
  startTimer() {
    // 清除可能存在的旧计时器
    this.clearTimer();
    
    // 设置新计时器，每秒更新一次
    this.data.timerInterval = setInterval(() => {
      this.calculateTimeSinceLast(this.data.records);
    }, 1000);
  },
  
  clearTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({
        timerInterval: null
      });
    }
  },
  
    loadRecords() {
        const records = wx.getStorageSync('records') || [];
        this.setData({
          records,
          animationData: {} // 确保初始化时没有动画
        }, () => {
          this.calculateTimeSinceLast(records);
          if (records.length > 0) {
            this.setData({ scrollIntoView: `record-${records.length - 1}` });
          }
        });
      },
  
      handlePunch() {
        if (this.data.animationTimer) {
            clearTimeout(this.data.animationTimer);
        }

      const now = new Date();
      const timestamp = this.formatTime(now);
      
      wx.vibrateShort({ type: 'heavy' });
      
      // 每次点击都创建一个全新的动画实例，避免在真机上的状态问题
      const buttonAnimation = wx.createAnimation({
        duration: 350,
        timingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      });

      // 定义回弹动画
      buttonAnimation.scale(1.05).step({ duration: 200 });
      buttonAnimation.scale(1).step({ duration: 150 });
      
      const newRecords = [...this.data.records, timestamp];
      
      wx.setStorageSync('records', newRecords);
      this.calculateTimeSinceLast(newRecords);
      
      this.setData({
        records: newRecords,
        buttonAnimation: buttonAnimation.export(),
        newRecordIndex: -1
      }, () => {
        this.setData({
            newRecordIndex: newRecords.length - 1,
            scrollIntoView: `record-${newRecords.length - 1}`
        });
      });

      const animationTimer = setTimeout(() => {
        this.setData({ newRecordIndex: -1 });
      }, 2000);

      this.setData({ animationTimer });
      
      wx.showToast({
        title: '打卡成功',
        icon: 'success',
        duration: 1500
      });
    },
  
      calculateTimeSinceLast(records) {
    if (records.length === 0) {
      this.setData({
        timeSinceLast: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        timeColor: '#000'
      });
      return;
    }

    const lastTimeStr = records[records.length - 1];
    const lastTime = new Date(lastTimeStr);
    const now = new Date();
    const diffMs = now - lastTime;

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    this.setData({
      timeSinceLast: { days, hours, minutes, seconds },
      timeColor: totalHours >= 72 ? '#1aad19' : '#000'
    });
  },
  
      formatTime(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
         + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },
  
  handleRevert(e) {
    const { index } = e.currentTarget.dataset;
    const revertToIndex = parseInt(index, 10);

    wx.showModal({
      title: '确认撤回',
      content: `确定要撤回到第 ${revertToIndex + 1} 次打卡吗？这将会删除之后的所有记录。`,
      success: (res) => {
        if (res.confirm) {
          const newRecords = this.data.records.slice(0, revertToIndex + 1);
          
          wx.setStorageSync('records', newRecords);
          this.calculateTimeSinceLast(newRecords);
          
          this.setData({
            records: newRecords,
          }, () => {
            this.setData({
              scrollIntoView: `record-${newRecords.length - 1}`
            });
          });

          wx.showToast({
            title: '撤回成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  clearRecords() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有历史打卡记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            records: [],
            scrollIntoView: '',
            timeSinceLast: { days: 0, hours: 0, minutes: 0, seconds: 0 },
            timeColor: '#000'
          });
          
          wx.setStorageSync('records', []);
          
          wx.showToast({
            title: '记录已清除',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  }
});