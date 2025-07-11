# 网页端扩展通信详细实现方案

## 总体架构

```
网页登录 → 广播用户状态 → 扩展Content Script → 扩展Background → 扩展Popup显示
```

---

## 网页端（pixel-capture项目）

### 1. 创建扩展通信工具

#### 文件：`src/utils/ExtensionBridge.ts`
```typescript
// 新建文件
interface UserStatus {
  isLoggedIn: boolean;
  isPro: boolean;
  isInTrial: boolean;
}

export class ExtensionBridge {
  // 发送用户状态到扩展
  static sendUserStatus(status: UserStatus): void {
    window.postMessage({
      type: 'PIXEL_CAPTURE_USER_STATUS',
      status: status,
      source: 'pixel-capture-website',
      timestamp: Date.now()
    }, '*');
    
    console.log('用户状态已广播到扩展:', status);
  }
  
  // 登录成功时调用
  static notifyLogin(isPro: boolean, isInTrial: boolean): void {
    this.sendUserStatus({
      isLoggedIn: true,
      isPro,
      isInTrial
    });
  }
  
  // 登出时调用
  static notifyLogout(): void {
    this.sendUserStatus({
      isLoggedIn: false,
      isPro: false,
      isInTrial: false
    });
  }
  
  // 检查扩展是否可用（可选）
  static checkExtensionAvailable(): void {
    window.postMessage({
      type: 'PIXEL_CAPTURE_PING',
      source: 'pixel-capture-website'
    }, '*');
  }
}
```

**功能**：
- 提供统一的扩展通信接口
- 封装用户状态广播逻辑
- 通过postMessage与扩展通信（无需扩展ID）

### 2. 修改用户状态Hook

#### 文件：`src/hooks/useUserData.ts`
```typescript
// 在现有代码基础上添加
import { ExtensionBridge } from '@/utils/ExtensionBridge';

export function useUserData(
  locale: string,
  initialData?: UserSubscriptionStatus | null,
): UseUserDataResult {
  // ... 现有代码保持不变
  
  // 添加扩展通信逻辑
  const syncToExtension = useCallback((userStatus: UserSubscriptionStatus) => {
    if (userStatus) {
      // 根据实际的数据结构正确判断
      const isPro = userStatus.accountStatus === 'pro'; // 真正的付费用户
      const isInTrial = userStatus.accountStatus === 'trial'; // 试用用户
      
      // 同步到扩展
      ExtensionBridge.notifyLogin(isPro, isInTrial);
    }
  }, []);
  
  // 修改fetchUserData函数
  const fetchUserData = useCallback(async (skipCache = false) => {
    // ... 现有获取逻辑保持不变
    
    // 在成功获取用户数据后添加
    if (data.success && data.data) {
      setUserStatus(data.data);
      setCachedData(cacheKey, data.data);
      
      // 新增：同步到扩展
      syncToExtension(data.data);
    }
  }, [locale, syncToExtension]);
  
  // ... 其余代码保持不变
}
```

### 3. 修改Dashboard组件

#### 文件：`src/features/dashboard/DashboardContent.tsx`
```typescript
// 在现有代码基础上添加
import { ExtensionBridge } from '@/utils/ExtensionBridge';

export function DashboardContent({ isPaymentSuccess, initialUserStatus }: DashboardContentProps) {
  // ... 现有代码保持不变
  
  // 添加扩展状态同步
  React.useEffect(() => {
    if (userStatus && !isLoading) {
      // 根据实际的数据结构正确判断
      const isPro = userStatus.accountStatus === 'pro'; // 真正的付费用户
      const isInTrial = userStatus.accountStatus === 'trial'; // 试用用户
      
      // 同步到扩展（防止重复调用）
      ExtensionBridge.notifyLogin(isPro, isInTrial);
    }
  }, [userStatus, isLoading]);
  
  // ... 其余代码保持不变
}
```

### 4. 添加登出处理

#### 文件：需要在用户登出的地方添加
```typescript
// 在Clerk登出回调或登出逻辑中添加
import { ExtensionBridge } from '@/utils/ExtensionBridge';

// 登出处理函数
const handleSignOut = () => {
  // 通知扩展用户已登出
  ExtensionBridge.notifyLogout();
  
  // 其他登出逻辑...
};
```

---

## 扩展端（chrome-extension-boilerplate-react-vite项目）

### 1. 修改Content Script

#### 文件：`pages/content/src/matches/all/index.ts`
```typescript
// 在现有代码基础上添加
console.log('Content script loaded for PixelCapture');

// 监听来自网页的消息
window.addEventListener('message', (event) => {
  // 安全检查
  if (event.source !== window) return;
  
  if (!event.data || event.data.source !== 'pixel-capture-website') return;
  
  console.log('Content script收到消息:', event.data.type);
  
  // 处理用户状态更新
  if (event.data.type === 'PIXEL_CAPTURE_USER_STATUS') {
    // 转发到background script
    chrome.runtime.sendMessage({
      type: 'USER_STATUS_UPDATE',
      status: event.data.status,
      timestamp: event.data.timestamp
    });
    
    // 发送确认消息给网页（可选）
    window.postMessage({
      type: 'PIXEL_CAPTURE_STATUS_RECEIVED',
      success: true,
      source: 'pixel-capture-extension'
    }, '*');
  }
  
  // 处理ping消息
  if (event.data.type === 'PIXEL_CAPTURE_PING') {
    window.postMessage({
      type: 'PIXEL_CAPTURE_PONG',
      source: 'pixel-capture-extension'
    }, '*');
  }
});

// 通知网页扩展已就绪
window.postMessage({
  type: 'PIXEL_CAPTURE_EXTENSION_READY',
  source: 'pixel-capture-extension'
}, '*');
```

### 2. 修改Background Script

#### 文件：`chrome-extension/src/background/index.ts`
```typescript
// 在现有代码基础上添加
interface UserStatus {
  isLoggedIn: boolean;
  isPro: boolean;
  isInTrial: boolean;
}

// 添加到现有的消息监听器中
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理用户状态更新
  if (request.type === 'USER_STATUS_UPDATE') {
    handleUserStatusUpdate(request.status);
    sendResponse({ success: true });
    return true;
  }
  
  // ... 其他现有的消息处理保持不变
});

// 用户状态更新处理
async function handleUserStatusUpdate(status: UserStatus) {
  try {
    // 存储用户状态
    await chrome.storage.local.set({
      userStatus: status,
      lastUpdate: Date.now()
    });
    
    // 显示状态更新通知
    const statusText = getStatusText(status);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '状态已同步',
      message: statusText
    });
    
    colorfulLog(`用户状态已更新: ${JSON.stringify(status)}`, 'success');
  } catch (error) {
    console.error('保存用户状态失败:', error);
  }
}

// 获取状态文本描述
function getStatusText(status: UserStatus): string {
  if (!status.isLoggedIn) return '未登录';
  if (status.isPro) return 'Pro用户已登录';
  if (status.isInTrial) return '试用用户已登录';
  return '免费用户已登录';
}

// 获取用户状态的工具函数
async function getUserStatus(): Promise<UserStatus> {
  try {
    const result = await chrome.storage.local.get(['userStatus']);
    return result.userStatus || {
      isLoggedIn: false,
      isPro: false,
      isInTrial: false
    };
  } catch (error) {
    console.error('获取用户状态失败:', error);
    return {
      isLoggedIn: false,
      isPro: false,
      isInTrial: false
    };
  }
}

// 修改现有的截图权限检查
const originalInjectSimpleScreenshotTool = injectSimpleScreenshotTool;
injectSimpleScreenshotTool = async (tabId: number) => {
  const userStatus = await getUserStatus();
  
  // 检查登录状态
  if (!userStatus.isLoggedIn) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '需要登录',
      message: '请先在网站上登录后使用截图功能'
    });
    return;
  }
  
  // 检查权限（Pro用户或试用用户可以使用高级功能）
  if (!userStatus.isPro && !userStatus.isInTrial) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '权限限制',
      message: '某些功能需要Pro订阅或试用'
    });
    // 仍然允许基本截图功能
  }
  
  // 执行截图
  await originalInjectSimpleScreenshotTool(tabId);
};
```

### 3. 修改Popup组件

#### 文件：`pages/popup/src/Popup.tsx`
需要修改的关键部分：

```typescript
// 移除hardcode的isPro状态
// const [isPro] = useState<boolean>(false); // 删除这行

// 添加用户状态管理
const [userStatus, setUserStatus] = useState<UserStatus>({
  isLoggedIn: false,
  isPro: false,
  isInTrial: false
});
const [statusLoading, setStatusLoading] = useState(true);

// 加载用户状态
useEffect(() => {
  chrome.storage.local.get(['userStatus']).then(result => {
    if (result.userStatus) {
      setUserStatus(result.userStatus);
    }
    setStatusLoading(false);
  });
}, []);

// 计算权限
const isPro = userStatus.isPro || userStatus.isInTrial; // Pro或试用都有Pro权限
const isLoggedIn = userStatus.isLoggedIn;

// 修改头像显示逻辑
const getAvatarClassName = () => {
  if (statusLoading) return 'avatar-icon loading';
  if (isLoggedIn) return 'avatar-icon logged-in';
  return 'avatar-icon';
};

const getAvatarText = () => {
  if (statusLoading) return 'Loading...';
  if (isLoggedIn) return 'Signed in';
  return 'Please sign in';
};

// 修改Pro标识样式
const getProBadgeClassName = () => {
  if (isPro) return 'pro-badge pro-active';
  return 'pro-badge';
};
```

### 4. 修改Popup样式

#### 文件：`pages/popup/src/Popup.css`
```css
/* 在现有样式基础上添加 */

/* 已登录头像样式 */
.avatar-icon.logged-in {
  background-color: #3b82f6; /* 蓝色背景 */
  color: white;
}

/* 加载状态 */
.avatar-icon.loading {
  background-color: #d1d5db; /* 更浅的灰色 */
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Pro标识激活状态 */
.pro-badge.pro-active {
  background-color: #10b981; /* 绿色背景 */
  color: white;
}

/* 已登录状态的头像文字 */
.user-avatar .avatar-status {
  color: #374151; /* 深灰色，更明显 */
}

/* 未登录按钮样式 */
.screenshot-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
```

---

## 数据结构说明

### 网页端用户状态数据来源

**数据流程**：
```
数据库 → SubscriptionService → API接口(/api/user/status) → useUserData Hook → Dashboard组件
```

**核心数据结构**：
```typescript
// 来自 /types/Subscription.ts
export type UserSubscriptionStatus = {
  isLoggedIn: boolean;
  accountStatus: 'trial' | 'pro' | 'expired' | 'inactive'; // 关键字段
  isPro: boolean; // 注意：试用用户这里也是true
  isTrialActive: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  email: string;
  licenseKey?: string;
};
```

**正确的状态判断逻辑**：
```typescript
// 正确的判断方式
const isPro = userStatus.accountStatus === 'pro'; // 真正的付费用户
const isInTrial = userStatus.accountStatus === 'trial'; // 试用用户
const hasProFeatures = isPro || isInTrial; // 拥有Pro功能权限

// 错误的判断方式（避免使用）
// const isPro = userStatus.isPro; // 这个字段试用用户也是true
```

**数据库来源**：
- `users.trial_started_at` - 试用开始时间
- `users.subscription_end_at` - 订阅结束时间
- `users.subscription_status` - 订阅状态
- `licenses.expires_at` - License过期时间

## 功能总结

### 网页端功能
1. **ExtensionBridge** - 统一的扩展通信接口
2. **useUserData Hook** - 自动同步用户状态到扩展
3. **Dashboard组件** - 登录时主动同步状态
4. **登出处理** - 清理扩展状态

### 扩展端功能
1. **Content Script** - 接收网页广播并转发
2. **Background Script** - 状态存储和权限控制
3. **Popup组件** - 动态显示用户状态
4. **样式更新** - 视觉反馈用户状态

### 实现的效果
- **未登录**：灰色头像 + "Please sign in" + 灰色PDF Pro标识
- **已登录（付费用户）**：蓝色头像 + "Signed in" + 绿色PDF Pro标识
- **已登录（试用用户）**：蓝色头像 + "Signed in" + 绿色PDF Pro标识
- **已登录（免费/过期用户）**：蓝色头像 + "Signed in" + 灰色PDF Pro标识
- **权限控制**：只有登录用户可以截图，只有Pro/试用用户可以使用PDF功能
- **实时同步**：网页登录/登出状态实时反映到扩展

## 实施步骤

### Phase 1: 网页端实现
1. 创建 `ExtensionBridge.ts` 工具类
2. 修改 `useUserData.ts` 添加扩展同步
3. 修改 `DashboardContent.tsx` 添加状态同步
4. 添加登出处理逻辑

### Phase 2: 扩展端实现
1. 修改 Content Script 添加消息监听
2. 修改 Background Script 添加状态管理
3. 修改 Popup 组件实现动态UI
4. 更新 CSS 样式

### Phase 3: 测试验证
1. 测试登录/登出状态同步
2. 测试权限控制功能
3. 测试UI状态变化
4. 测试跨环境兼容性

## 注意事项

1. **安全性**：消息来源验证和数据格式校验
2. **兼容性**：不同浏览器的postMessage支持
3. **性能**：避免频繁的状态同步调用
4. **错误处理**：网络异常和数据不一致的处理
5. **用户体验**：加载状态和状态变化的视觉反馈