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
    animationTimer: null,
    pressIndex: -1, // 新增：跟踪当前按压的记录索引
    pressTimer: null, // 新增：按压状态定时器
    longPressTimer: null, // 自定义长按定时器
    isLongPressing: false, // 长按状态标记
    isShowingDeleteModal: false // 删除弹窗显示状态，防止重复触发
  },
  
      onLoad() {
    this.loadRecords();
    
    // 创建记录卡片动画实例
    this.animation = wx.createAnimation({
      duration: 600,
      timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // Spring-like easing
    });
    
    // 初始化音效
    this.initAudio();
    
    // 检测系统主题
    this.checkSystemTheme();
  },

  // 初始化音效 - 使用系统音效避免Base64编码问题
  initAudio() {
    // 不使用音频文件，改用系统提示音
    // 微信小程序环境下，直接使用震动和系统提示替代音效
  },

  // 播放音效的通用方法
  playSound(type) {
    try {
      switch(type) {
        case 'success':
          // 打卡成功：重震动反馈
          wx.vibrateShort({ type: 'heavy' });
          break;
        case 'delete':
          // 删除操作：重震动 + 更长的震动
          wx.vibrateShort({ type: 'heavy' });
          setTimeout(() => {
            wx.vibrateShort({ type: 'medium' });
          }, 100);
          break;
        case 'longpress':
          // 长按提示：轻柔震动
          wx.vibrateShort({ type: 'light' });
          break;
        case 'revert':
          // 撤回操作：中等震动
          wx.vibrateShort({ type: 'medium' });
          break;
        case 'revertBig':
          // 大量撤回：特殊震动序列
          wx.vibrateShort({ type: 'heavy' });
          setTimeout(() => {
            wx.vibrateShort({ type: 'heavy' });
          }, 200);
          setTimeout(() => {
            wx.vibrateShort({ type: 'heavy' });
          }, 400);
          break;
        case 'clear':
          // 清空操作：重震动序列
          wx.vibrateShort({ type: 'heavy' });
          setTimeout(() => {
            wx.vibrateShort({ type: 'heavy' });
          }, 150);
          break;
        default:
          wx.vibrateShort({ type: 'light' });
      }
    } catch (error) {
      // 静默处理震动失败
      console.log('震动反馈失败:', error);
    }
  },

  // 清理资源（现在主要是定时器）
  cleanup() {
    // 清除长按相关定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    if (this.data.pressTimer) {
      clearTimeout(this.data.pressTimer);
    }
    if (this.data.animationTimer) {
      clearTimeout(this.data.animationTimer);
    }
  },
  
  // 检测系统主题 - 使用新API避免警告
  checkSystemTheme() {
    // 使用新的API替代过时的wx.getSystemInfo
    try {
      const systemInfo = wx.getAppBaseInfo();
      const isDark = systemInfo.theme === 'dark';
      this.setData({ isDarkMode: isDark });
      
      // 监听系统主题变化
      wx.onThemeChange((result) => {
        this.setData({ isDarkMode: result.theme === 'dark' });
      });
    } catch (error) {
      // 兼容旧版本
      wx.getSystemInfo({
        success: (res) => {
          const isDark = res.theme === 'dark';
          this.setData({ isDarkMode: isDark });
          
          wx.onThemeChange((result) => {
            this.setData({ isDarkMode: result.theme === 'dark' });
          });
        }
      });
    }
  },
  
  onShow() {
    // 启动计时器，每秒更新一次时间
    this.startTimer();
  },
  
  onHide() {
    // 清除计时器
    this.clearTimer();
    
    // 清理资源
    this.cleanup();
  },
  
  onUnload() {
    // 清除计时器
    this.clearTimer();
    
    // 清理资源
    this.cleanup();
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
      
      // 移除重复震动，只在playSound中震动一次
      
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
      
      // 播放打卡成功音效（包含震动）
      this.playSound('success');

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
    const lastTime = this.parseTimeString(lastTimeStr);
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
    // 使用空格分隔日期和时间，保持兼容性
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
         + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },

  // 解析时间字符串 - 兼容iOS格式
  parseTimeString(timeStr) {
    // 兼容多种格式
    if (timeStr.includes('T')) {
      // ISO格式: 2025-01-05T10:30:00
      return new Date(timeStr);
    } else if (timeStr.includes(' ') && timeStr.split(' ').length === 2) {
      // 旧格式: 2025-01-05 10:30:00
      // 转换为iOS兼容格式
      return new Date(timeStr.replace(' ', 'T'));
    } else {
      // 其他格式，尝试直接解析
      return new Date(timeStr);
    }
  },
  
  handleRevert(e) {
    const { index } = e.currentTarget.dataset;
    const revertToIndex = parseInt(index, 10);
    const currentRecordCount = this.data.records.length;
    const deleteCount = currentRecordCount - (revertToIndex + 1);

    wx.showModal({
      title: '确认撤回',
      content: `确定要撤回到第 ${revertToIndex + 1} 次打卡吗？这将会删除之后的 ${deleteCount} 条记录。`,
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

          // 根据删除数量使用不同震动
          if (deleteCount >= 10) {
            // 删除很多条记录：三重震动
            this.playSound('revertBig');
          } else if (deleteCount > 1) {
            // 删除多条记录：双重震动
            wx.vibrateShort({ type: 'heavy' });
            setTimeout(() => {
              wx.vibrateShort({ type: 'medium' });
            }, 150);
          } else {
            // 只删除一条记录：普通震动
            this.playSound('revert');
          }

          wx.showToast({
            title: deleteCount > 1 ? `撤回成功，删除了 ${deleteCount} 条记录` : '撤回成功',
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
          // 播放清空音效
          this.playSound('clear');
          
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
  },

  // 新增：处理触摸开始，添加按压视觉反馈和自定义长按计时
  handleTouchStart(e) {
    // 如果正在显示删除弹窗，忽略新的触摸事件
    if (this.data.isShowingDeleteModal) {
      return;
    }
    
    const { index } = e.currentTarget.dataset;
    const recordIndex = parseInt(index, 10);
    
    // 清除之前的定时器
    if (this.data.pressTimer) {
      clearTimeout(this.data.pressTimer);
    }
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    
    // 立即设置按压状态
    this.setData({
      pressIndex: recordIndex,
      isLongPressing: false
    });
    
    // 轻微震动反馈
    wx.vibrateShort({ type: 'light' });
    
    // 设置自定义长按定时器（800ms，比默认350ms更长）
    const longPressTimer = setTimeout(() => {
      // 播放长按提示音效
      this.playSound('longpress');
      
      // 设置长按状态
      this.setData({
        isLongPressing: true
      });
      
      // 触发长按删除
      this.handleCustomLongPress(recordIndex);
    }, 800);
    
    this.setData({ longPressTimer });
  },

  // 新增：处理触摸结束，移除按压状态和清除长按定时器
  handleTouchEnd(e) {
    // 清除长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.setData({ longPressTimer: null });
    }
    
    // 如果不是长按状态，则延迟移除按压状态
    if (!this.data.isLongPressing) {
      const pressTimer = setTimeout(() => {
        this.setData({
          pressIndex: -1,
          isLongPressing: false
        });
      }, 150);
      
      this.setData({ pressTimer });
    }
  },

  // 新增：处理自定义长按删除记录
  handleCustomLongPress(recordIndex) {
    // 防止重复调用：检查是否已经在显示删除弹窗
    if (this.data.isShowingDeleteModal) {
      return;
    }
    
    const record = this.data.records[recordIndex];
    
    // 设置弹窗显示标志，防止重复触发
    this.setData({
      isShowingDeleteModal: true
    });
    
    // 显示删除确认对话框
    wx.showModal({
      title: '删除打卡记录',
      content: `确定要删除第 ${recordIndex + 1} 次打卡记录吗？\n时间：${record}`,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: (res) => {
        // 无论用户选择什么，都要清除弹窗标志
        this.setData({
          isShowingDeleteModal: false
        });
        
        if (res.confirm) {
          // 播放删除音效
          this.playSound('delete');
          
          // 创建新的记录数组，删除指定索引的记录
          const newRecords = this.data.records.filter((_, i) => i !== recordIndex);
          
          // 更新存储和状态
          wx.setStorageSync('records', newRecords);
          this.calculateTimeSinceLast(newRecords);
          
          this.setData({
            records: newRecords,
            pressIndex: -1,
            isLongPressing: false
          }, () => {
            // 如果删除的不是最后一条记录，滚动到合适位置
            if (newRecords.length > 0) {
              const scrollIndex = Math.min(recordIndex, newRecords.length - 1);
              this.setData({
                scrollIntoView: `record-${scrollIndex}`
              });
            }
          });

          wx.showToast({
            title: '记录已删除',
            icon: 'success',
            duration: 1500
          });
        } else {
          // 用户取消删除，移除按压状态
          this.setData({
            pressIndex: -1,
            isLongPressing: false
          });
        }
      },
      fail: () => {
        // 弹窗显示失败时也要清除标志
        this.setData({
          isShowingDeleteModal: false,
          pressIndex: -1,
          isLongPressing: false
        });
      }
    });
  },

  // 保留原有的长按事件处理（作为备用）
  handleLongPressRecord(e) {
    // 如果已经通过自定义长按处理了，或者正在显示删除弹窗，就不再处理
    if (this.data.isLongPressing || this.data.isShowingDeleteModal) {
      return;
    }
    
    const { index } = e.currentTarget.dataset;
    const recordIndex = parseInt(index, 10);
    this.handleCustomLongPress(recordIndex);
  }
});