改不同功能要去对应的目录：

  🏗️ 核心扩展配置

  - chrome-extension/ - 扩展清单和后台脚本
    - manifest.ts - 扩展权限、图标等
    - src/background/ - 后台服务脚本

  📄 页面组件

  - pages/popup/src/ - 点击扩展图标弹出的页面
  - pages/options/src/ - 扩展设置页面
  - pages/content/src/ - 注入网页的脚本
  - pages/content-ui/src/ - 注入网页的React组件
  - pages/side-panel/src/ - 侧边栏面板
  - pages/new-tab/src/ - 新标签页替换

  📦 共享代码

  - packages/shared/ - 通用组件、类型、工具函数
  - packages/storage/ - 存储相关工具
  - packages/i18n/ - 多语言支持